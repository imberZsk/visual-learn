use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

/// 一个学习单元（小册中的一篇 .md 文档）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StudyItem {
    /// 小册 md 文件的绝对路径（用作进度记录的唯一 key）
    pub path: String,
    /// 显示名称（去掉 .md 后缀的文件名）
    pub name: String,
    /// 所属学科分类（如 python、java、playwright），取自 "xxx小册" 的 xxx 部分
    pub category: String,
    /// 对应的 demo 路径：优先指向 demo 目录下的同名子目录；
    /// 若同名子目录不存在则指向 demo 根目录；若无 demo 则为 None
    pub demo_path: Option<String>,
    /// 文件大小（字节）
    pub size: u64,
    /// 最后修改时间（Unix 时间戳，毫秒）
    pub modified: i64,
}

/// 一个学科分类，及其下的所有学习单元
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StudyCategory {
    /// 分类名（学科名，如 python、java）
    pub name: String,
    /// 该分类所在的顶层归类（如 后端、AI编程、测试），用于分组展示
    pub group: String,
    /// 该分类下的所有学习单元，按文件名排序
    pub items: Vec<StudyItem>,
}

/// 判断目录名是否是「小册」目录
fn is_booklet_dir(name: &str) -> bool {
    name.ends_with("小册")
}

/// 从「xxx小册」目录名中提取学科名 xxx
fn category_from_booklet(booklet_name: &str) -> String {
    booklet_name
        .strip_suffix("小册")
        .unwrap_or(booklet_name)
        .to_string()
}

/// 判断目录是否应该从主文章扫描中跳过。
///
/// # 参数
/// * `name` - 当前目录名
///
/// # 返回
/// * `bool` - true 表示跳过该目录，false 表示继续扫描
fn should_skip_dir(name: &str) -> bool {
    // lower_name 存储目录名的小写形式，用于做大小写不敏感匹配
    let lower_name = name.to_lowercase();

    name.starts_with('.')
        || lower_name == "lab"
        || lower_name == "labs"
        || lower_name == "demo"
        || lower_name == "demos"
        || lower_name == "assets"
        || lower_name == "asset"
        || lower_name == "raw"
        || lower_name == "node_modules"
        || lower_name == "target"
        || lower_name == "dist"
        || lower_name == "build"
        || lower_name.contains("demo")
}

/// 判断 Markdown 文件是否应作为文章展示。
///
/// # 参数
/// * `path` - Markdown 文件路径
///
/// # 返回
/// * `bool` - true 表示展示该文件，false 表示跳过
fn is_displayable_markdown(path: &Path) -> bool {
    // is_md 存储文件扩展名是否为 md
    let is_md = path.extension().map(|ext| ext == "md").unwrap_or(false);
    if !is_md {
        return false;
    }

    // file_name 存储当前文件名，用于排除说明性或配置性 Markdown
    let file_name = path
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();
    // upper_file_name 存储大写文件名，用于识别 AGENTS/CLAUDE 这类工具文档
    let upper_file_name = file_name.to_uppercase();

    upper_file_name != "README.MD"
        && upper_file_name != "AGENTS.MD"
        && upper_file_name != "CLAUDE.MD"
        && upper_file_name != "GEMINI.MD"
        && upper_file_name != "SKILL.MD"
}

/// 从 Markdown 路径读取文件元数据并构造学习单元。
///
/// # 参数
/// * `path` - Markdown 文件路径
/// * `name` - 前端展示的文件名
/// * `category` - 所属分类名称
/// * `demo_path` - VSCode 打开目录路径
///
/// # 返回
/// * `Option<StudyItem>` - 元数据读取成功时返回学习单元，否则返回 None
fn build_study_item(
    path: &Path,
    name: String,
    category: &str,
    demo_path: Option<String>,
) -> Option<StudyItem> {
    // metadata 存储文件系统元数据，用于展示文件大小和更新时间
    let metadata = fs::metadata(path).ok()?;
    // modified 存储最后修改时间的毫秒级 Unix 时间戳
    let modified = metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(SystemTime::UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0);

    Some(StudyItem {
        path: path.to_string_lossy().to_string(),
        name,
        category: category.to_string(),
        demo_path,
        size: metadata.len(),
        modified,
    })
}

/// 在小册的父目录下查找对应的 demo 目录
/// 命名可能是 "xxx-demo"、"xxxdemo"、"xxx demo" 等，统一用「包含 demo」来匹配
///
/// # 参数
/// * `parent_dir` - 小册目录的父目录（学科目录，如 .../python）
///
/// # 返回
/// * `Option<PathBuf>` - 找到的 demo 目录路径
fn find_demo_dir(parent_dir: &Path) -> Option<PathBuf> {
    let entries = fs::read_dir(parent_dir).ok()?;

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            if let Some(name) = path.file_name() {
                let name_str = name.to_string_lossy().to_lowercase();
                // demo 目录名包含 "demo" 且不是小册目录
                if name_str.contains("demo") {
                    return Some(path);
                }
            }
        }
    }

    None
}

/// 提取文件名/目录名开头的「章节编号」前缀（如 "01-xxx" → "01"）
/// 仅当名称以数字开头、且数字后紧跟分隔符（- 或 _ 或 空格）时才视为编号
/// 用于在 md 与 demo 命名不完全一致时，按章节序号兜底匹配
///
/// # 参数
/// * `name` - 文件名或目录名（不含路径）
///
/// # 返回
/// * `Option<String>` - 开头的纯数字编号字符串（保留原始零填充，如 "01"），无则 None
fn leading_chapter_number(name: &str) -> Option<String> {
    // 收集开头连续的数字字符
    let digits: String = name.chars().take_while(|c| c.is_ascii_digit()).collect();
    if digits.is_empty() {
        return None;
    }

    // 数字后必须紧跟分隔符或到达结尾，避免把 "2024年总结" 这类误判为编号 "2024"
    let rest = &name[digits.len()..];
    let next_is_sep = rest
        .chars()
        .next()
        .map(|c| c == '-' || c == '_' || c == ' ')
        .unwrap_or(true);
    if next_is_sep {
        Some(digits)
    } else {
        None
    }
}

/// 为某篇小册 md 解析其对应的 demo 路径
/// 各小册的 demo 子目录命名并不统一，因此按以下优先级三级匹配：
///   1. 精确同名：       "01-Python环境配置.md" → "01-Python环境配置/"（如 python/playwright 小册）
///   2. 名字 + "-demo"： "01-skills是什么.md"   → "01-skills是什么-demo/"（如 skills 小册）
///   3. 章节编号兜底：    "01-什么是harness.md"   → 任意以 "01-" 开头的子目录（如 harness/Agent/java/提示词 小册，
///                       md 标题与 demo 目录用英文命名、仅章节号一致）
/// 三级都未命中才返回 None（前端据此不显示「打开 demo」按钮）
///
/// # 参数
/// * `demo_dir` - 该学科的 demo 目录（可能为 None）
/// * `item_stem` - 学习项名称（md 去掉后缀，如 "01-Python环境配置"）
///
/// # 返回
/// * `Option<String>` - 命中的 demo 子目录绝对路径，未命中则 None
fn resolve_demo_path(demo_dir: &Option<PathBuf>, item_stem: &str) -> Option<String> {
    let dir = demo_dir.as_ref()?;

    // 先收集 demo 目录下所有子目录（名称 + 路径），后续按三级策略在内存中匹配
    let mut sub_dirs: Vec<(String, PathBuf)> = Vec::new();
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_dir() {
                continue;
            }
            if let Some(file_name) = path.file_name() {
                sub_dirs.push((file_name.to_string_lossy().to_string(), path));
            }
        }
    }

    // 策略1：精确同名（如 "01-Python环境配置"）
    if let Some((_, path)) = sub_dirs.iter().find(|(name, _)| name == item_stem) {
        return Some(path.to_string_lossy().to_string());
    }

    // 策略2：md 名字加 "-demo" 后缀（如 "01-skills是什么" → "01-skills是什么-demo"）
    let with_suffix = format!("{}-demo", item_stem);
    if let Some((_, path)) = sub_dirs.iter().find(|(name, _)| *name == with_suffix) {
        return Some(path.to_string_lossy().to_string());
    }

    // 策略3：章节编号兜底——md 与 demo 同号即视为对应（仅在编号唯一时启用，避免歧义）
    if let Some(item_num) = leading_chapter_number(item_stem) {
        // 找出所有编号与 md 相同的 demo 子目录
        let matched: Vec<&(String, PathBuf)> = sub_dirs
            .iter()
            .filter(|(name, _)| leading_chapter_number(name).as_deref() == Some(item_num.as_str()))
            .collect();
        // 仅当唯一命中时返回，多个同号目录存在歧义，宁可不匹配
        if matched.len() == 1 {
            return Some(matched[0].1.to_string_lossy().to_string());
        }
    }

    // 三级策略均未命中：返回 None，前端不显示打开按钮
    None
}

/// 从一个小册目录中收集所有学习单元
///
/// # 参数
/// * `booklet_dir` - 小册目录路径
/// * `category` - 学科分类名
/// * `demo_dir` - 对应的 demo 目录（可能为 None）
/// * `items` - 收集结果的可变向量
fn collect_items_from_booklet(
    booklet_dir: &Path,
    category: &str,
    demo_dir: &Option<PathBuf>,
    items: &mut Vec<StudyItem>,
) {
    let entries = match fs::read_dir(booklet_dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();

        if !path.is_file() || !is_displayable_markdown(&path) {
            continue;
        }

        // 文件名（含后缀）与去后缀的名称
        let file_name = path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        let stem = path
            .file_stem()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();

        // 解析对应的 demo 路径
        let demo_path = resolve_demo_path(demo_dir, &stem);

        if let Some(item) = build_study_item(&path, file_name, category, demo_path) {
            items.push(item);
        }
    }
}

/// 获取路径相对学习根目录的层级名称。
///
/// # 参数
/// * `study_root` - 学习根目录
/// * `path` - 需要计算层级的路径
///
/// # 返回
/// * `Vec<String>` - 从根目录下一级开始的目录名列表
fn relative_components(study_root: &Path, path: &Path) -> Vec<String> {
    // relative_path 存储 path 相对于学习根目录的路径
    let relative_path = path.strip_prefix(study_root).unwrap_or(path);

    relative_path
        .components()
        .filter_map(|component| match component {
            std::path::Component::Normal(value) => Some(value.to_string_lossy().to_string()),
            _ => None,
        })
        .collect()
}

/// 从章节目录名生成前端展示的 Markdown 文件名。
///
/// # 参数
/// * `chapter_dir` - 包含 chapter.md 的章节目录路径
///
/// # 返回
/// * `String` - 展示文件名，如 01-Codex是什么.md
fn display_name_from_chapter_dir(chapter_dir: &Path) -> String {
    // dir_name 存储章节目录名，作为新结构文章标题来源
    let dir_name = chapter_dir
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    format!("{}.md", dir_name)
}

/// 获取新版章节目录对应的 VSCode 打开目录。
///
/// # 参数
/// * `chapter_dir` - 包含 chapter.md 的章节目录路径
///
/// # 返回
/// * `Option<String>` - 同级 lab 目录存在时返回它，否则返回章节目录
fn resolve_chapter_open_path(chapter_dir: &Path) -> Option<String> {
    // lab_dir 存储新结构中每章配套代码目录的默认位置
    let lab_dir = chapter_dir.join("lab");
    if lab_dir.is_dir() {
        Some(lab_dir.to_string_lossy().to_string())
    } else {
        Some(chapter_dir.to_string_lossy().to_string())
    }
}

/// 根据章节目录相对根目录的层级推断 group 与 category。
///
/// # 参数
/// * `components` - 章节目录相对学习根目录的层级名称列表
///
/// # 返回
/// * `Option<(String, String)>` - 成功时返回 (group, category)
fn group_and_category_from_components(components: &[String]) -> Option<(String, String)> {
    if components.is_empty() {
        return None;
    }

    // group 存储前端第一层归类
    let group = components[0].clone();
    // category 存储前端第二层分类；两层课程结构下用顶层名聚合所有章节
    let category = if components.len() >= 3 {
        components[1].clone()
    } else {
        group.clone()
    };

    Some((group, category))
}

/// 根据普通 Markdown 所在目录层级推断 group 与 category。
///
/// # 参数
/// * `components` - 普通 Markdown 所在目录相对学习根目录的层级名称列表
///
/// # 返回
/// * `Option<(String, String)>` - 成功时返回 (group, category)
fn group_and_category_from_plain_components(components: &[String]) -> Option<(String, String)> {
    if components.is_empty() {
        return None;
    }

    // group 存储前端第一层归类
    let group = components[0].clone();
    // category 存储普通 Markdown 所在目录分类，至少两层时使用第二层目录名
    let category = components
        .get(1)
        .cloned()
        .unwrap_or_else(|| "其他".to_string());

    Some((group, category))
}

/// 把学习单元插入分类映射中，后续统一排序并输出。
///
/// # 参数
/// * `category_map` - 分类 key 到分类数据的可变映射
/// * `group` - 顶层分组名称
/// * `category` - 分类名称
/// * `item` - 要插入的学习单元
fn push_item_to_category(
    category_map: &mut HashMap<(String, String), StudyCategory>,
    group: String,
    category: String,
    item: StudyItem,
) {
    // key 存储分类唯一键，同一个 group 下的同名 category 聚合到一起
    let key = (group.clone(), category.clone());
    // entry 存储目标分类，缺失时即时创建
    let entry = category_map.entry(key).or_insert_with(|| StudyCategory {
        name: category,
        group,
        items: Vec::new(),
    });

    entry.items.push(item);
}

/// 递归扫描新版目录结构中的 chapter.md 与普通 Markdown 文件。
///
/// # 参数
/// * `dir` - 当前扫描目录
/// * `study_root` - 学习根目录
/// * `category_map` - 分类结果映射
fn scan_markdown_tree(
    dir: &Path,
    study_root: &Path,
    category_map: &mut HashMap<(String, String), StudyCategory>,
) {
    // entries 存储当前目录下的文件系统条目
    let entries = match fs::read_dir(dir) {
        Ok(entries) => entries,
        Err(_) => return,
    };
    // child_dirs 存储需要继续递归扫描的子目录
    let mut child_dirs: Vec<PathBuf> = Vec::new();
    // plain_markdowns 存储当前目录下可展示的普通 Markdown 文件
    let mut plain_markdowns: Vec<PathBuf> = Vec::new();
    // chapter_file 存储当前目录的 chapter.md 路径，命中时代表一篇新结构文章
    let mut chapter_file: Option<PathBuf> = None;

    for entry in entries.flatten() {
        // path 存储当前文件系统条目的绝对路径
        let path = entry.path();
        // name 存储当前条目的文件名或目录名
        let name = path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();

        if path.is_dir() {
            if !should_skip_dir(&name) {
                child_dirs.push(path);
            }
            continue;
        }

        if !path.is_file() || !is_displayable_markdown(&path) {
            continue;
        }

        if name == "chapter.md" {
            chapter_file = Some(path);
        } else {
            plain_markdowns.push(path);
        }
    }

    if let Some(chapter_path) = chapter_file {
        // components 存储章节目录相对根目录的层级，用于计算 group 与 category
        let components = relative_components(study_root, dir);
        if let Some((group, category)) = group_and_category_from_components(&components) {
            // display_name 存储前端展示的文章名，用章节目录名替代统一的 chapter.md
            let display_name = display_name_from_chapter_dir(dir);
            // demo_path 存储该文章配套代码目录，通常是同级 lab
            let demo_path = resolve_chapter_open_path(dir);

            if let Some(item) = build_study_item(&chapter_path, display_name, &category, demo_path)
            {
                push_item_to_category(category_map, group, category, item);
            }
        }
    } else {
        for markdown_path in plain_markdowns {
            // parent_dir 存储普通 Markdown 文件所在目录
            let parent_dir = markdown_path.parent().unwrap_or(study_root);
            // components 存储普通文档目录相对根目录的层级
            let components = relative_components(study_root, parent_dir);
            if components.is_empty() {
                continue;
            }

            // (group, category) 存储普通 Markdown 的前端分组与分类
            let (group, category) = match group_and_category_from_plain_components(&components) {
                Some(value) => value,
                None => continue,
            };
            // file_name 存储普通 Markdown 的原始文件名
            let file_name = markdown_path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            // demo_path 存储普通文档的 VSCode 打开目录，默认打开文件所在目录
            let demo_path = Some(parent_dir.to_string_lossy().to_string());

            if let Some(item) = build_study_item(&markdown_path, file_name, &category, demo_path) {
                push_item_to_category(category_map, group, category, item);
            }
        }
    }

    for child_dir in child_dirs {
        scan_markdown_tree(&child_dir, study_root, category_map);
    }
}

/// 递归查找所有「小册」目录，并收集其学习单元，按分类组织
///
/// # 参数
/// * `dir` - 当前扫描的目录
/// * `group` - 当前所在的顶层归类（第一级目录名）
/// * `categories` - 收集结果
/// * `study_root` - 学习目录根路径（用于判断是否处于顶层）
fn scan_for_booklets(
    dir: &Path,
    group: &str,
    categories: &mut Vec<StudyCategory>,
    study_root: &str,
) {
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let dir_name = path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();

        if should_skip_dir(&dir_name) {
            continue;
        }

        if is_booklet_dir(&dir_name) {
            // 找到一个小册目录
            let category = category_from_booklet(&dir_name);
            // demo 目录在小册的父目录下查找
            let parent = path.parent().unwrap_or(&path);
            let demo_dir = find_demo_dir(parent);

            let mut items = Vec::new();
            collect_items_from_booklet(&path, &category, &demo_dir, &mut items);

            // 按文件名排序（保证 01、02... 顺序）
            items.sort_by(|a, b| a.name.cmp(&b.name));

            // 即使为空也加入，便于前端展示完整分类
            categories.push(StudyCategory {
                name: category,
                group: group.to_string(),
                items,
            });
        } else {
            // 非小册、非 demo 目录，继续向下递归
            // 顶层目录作为 group 传递
            let next_group = if dir.to_string_lossy() == study_root {
                dir_name.clone()
            } else {
                group.to_string()
            };
            scan_for_booklets(&path, &next_group, categories, study_root);
        }
    }
}

/// 将新版 Markdown 树扫描结果合并进旧版小册扫描结果中。
///
/// # 参数
/// * `categories` - 旧版小册扫描结果
/// * `study_root` - 学习根目录
fn merge_markdown_tree_categories(categories: &mut Vec<StudyCategory>, study_root: &Path) {
    // category_map 存储新版扫描的临时分类结果
    let mut category_map: HashMap<(String, String), StudyCategory> = HashMap::new();
    scan_markdown_tree(study_root, study_root, &mut category_map);

    for (_, mut markdown_category) in category_map {
        // existing 存储旧版扫描中同 group、同 category 的分类位置
        let existing = categories.iter_mut().find(|category| {
            category.group == markdown_category.group && category.name == markdown_category.name
        });

        if let Some(category) = existing {
            // existing_paths 存储已存在文章路径，避免小册结构和新版结构重复收录
            let existing_paths: Vec<String> = category
                .items
                .iter()
                .map(|item| item.path.clone())
                .collect();
            markdown_category
                .items
                .retain(|item| !existing_paths.contains(&item.path));
            category.items.extend(markdown_category.items);
            category.items.sort_by(|a, b| a.name.cmp(&b.name));
        } else {
            markdown_category.items.sort_by(|a, b| a.name.cmp(&b.name));
            categories.push(markdown_category);
        }
    }
}

/// Tauri 命令：扫描学习目录，返回按学科分类组织的学习单元
///
/// # 参数
/// * `study_root` - 学习目录根路径（由前端传入，支持用户自定义）
///
/// # 返回
/// * `Result<Vec<StudyCategory>, String>` - 分类列表
#[tauri::command]
pub fn scan_study_notes(study_root: String) -> Result<Vec<StudyCategory>, String> {
    // 将传入的字符串路径转换为 Path 引用
    let base_path = Path::new(&study_root);

    if !base_path.exists() {
        return Err(format!("学习目录不存在: {}", study_root));
    }
    if !base_path.is_dir() {
        return Err(format!("路径不是目录: {}", study_root));
    }

    // 收集所有分类的可变向量
    let mut categories: Vec<StudyCategory> = Vec::new();
    scan_for_booklets(base_path, "", &mut categories, &study_root);
    merge_markdown_tree_categories(&mut categories, base_path);

    // 按分类名排序，保证稳定展示顺序
    categories.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(categories)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    /// 创建本次测试专用的临时学习目录，避免污染真实用户目录。
    ///
    /// # 参数
    /// * `name` - 临时目录名中的业务标识，便于失败时定位是哪类测试生成的目录
    ///
    /// # 返回
    /// * `PathBuf` - 已创建好的临时目录路径
    fn make_temp_study_root(name: &str) -> PathBuf {
        // now 存储当前纳秒时间戳，用于生成唯一目录名
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("系统时间早于 UNIX_EPOCH")
            .as_nanos();
        // root 存储本次测试使用的学习目录根路径
        let root = std::env::temp_dir().join(format!("visual-learn-{}-{}", name, now));

        fs::create_dir_all(&root).expect("创建临时学习目录失败");

        root
    }

    /// 验证新版 knowledge 结构下的 chapter.md 会被识别为学习文章，并把同级 lab 作为 VSCode 打开目录。
    #[test]
    fn scan_study_notes_supports_chapter_md_directories() {
        // root 存储模拟的新文章根目录
        let root = make_temp_study_root("chapter");
        // chapter_dir 存储一篇文章所在的章节目录
        let chapter_dir = root.join("AI编程").join("codex").join("01-Codex是什么");
        // lab_dir 存储该文章对应的实验代码目录
        let lab_dir = chapter_dir.join("lab");
        fs::create_dir_all(&lab_dir).expect("创建实验目录失败");
        fs::write(chapter_dir.join("chapter.md"), "# Codex 是什么\n").expect("写入文章失败");
        fs::write(lab_dir.join("README.md"), "# lab\n").expect("写入实验说明失败");

        // categories 存储扫描得到的分类结果
        let categories = scan_study_notes(root.to_string_lossy().to_string()).expect("扫描失败");
        // codex 存储新结构中应生成的 codex 分类
        let codex = categories
            .iter()
            .find(|category| category.group == "AI编程" && category.name == "codex")
            .expect("未找到 codex 分类");
        // item 存储 codex 分类下的第一篇文章
        let item = codex.items.first().expect("codex 分类下没有文章");

        assert_eq!(item.name, "01-Codex是什么.md");
        assert!(item.path.ends_with("01-Codex是什么/chapter.md"));
        assert_eq!(item.demo_path, Some(lab_dir.to_string_lossy().to_string()));

        fs::remove_dir_all(root).expect("清理临时学习目录失败");
    }

    /// 验证没有 chapter.md 约定时，扫描器仍会递归展示普通 Markdown 文件。
    #[test]
    fn scan_study_notes_falls_back_to_plain_markdown_files() {
        // root 存储模拟的普通 Markdown 文档根目录
        let root = make_temp_study_root("plain");
        // guide_dir 存储普通 Markdown 文件所在目录
        let guide_dir = root.join("指南").join("入门");
        fs::create_dir_all(&guide_dir).expect("创建普通文档目录失败");
        fs::write(guide_dir.join("快速开始.md"), "# 快速开始\n").expect("写入普通文档失败");

        // categories 存储扫描得到的分类结果
        let categories = scan_study_notes(root.to_string_lossy().to_string()).expect("扫描失败");
        // guide 存储普通 Markdown 兜底扫描生成的分类
        let guide = categories
            .iter()
            .find(|category| category.group == "指南" && category.name == "入门")
            .expect("未找到普通文档分类");

        assert_eq!(guide.items.len(), 1);
        assert_eq!(guide.items[0].name, "快速开始.md");

        fs::remove_dir_all(root).expect("清理临时学习目录失败");
    }

    /// 验证只有「课程/章节/chapter.md」两层时，章节会聚合到课程分类下。
    #[test]
    fn scan_study_notes_groups_two_level_chapters_by_course() {
        // root 存储模拟的两层课程目录
        let root = make_temp_study_root("two-level");
        // first_chapter_dir 存储第一章所在目录
        let first_chapter_dir = root.join("Agent").join("01-AI应用工程师是什么");
        // second_chapter_dir 存储第二章所在目录
        let second_chapter_dir = root.join("Agent").join("02-前端转AI应用工程师路线");
        fs::create_dir_all(&first_chapter_dir).expect("创建第一章目录失败");
        fs::create_dir_all(&second_chapter_dir).expect("创建第二章目录失败");
        fs::write(first_chapter_dir.join("chapter.md"), "# 第一章\n").expect("写入第一章失败");
        fs::write(second_chapter_dir.join("chapter.md"), "# 第二章\n").expect("写入第二章失败");

        // categories 存储扫描得到的分类结果
        let categories = scan_study_notes(root.to_string_lossy().to_string()).expect("扫描失败");
        // agent_categories 存储 group 为 Agent 的分类列表
        let agent_categories: Vec<&StudyCategory> = categories
            .iter()
            .filter(|category| category.group == "Agent")
            .collect();

        assert_eq!(agent_categories.len(), 1);
        assert_eq!(agent_categories[0].name, "Agent");
        assert_eq!(agent_categories[0].items.len(), 2);

        fs::remove_dir_all(root).expect("清理临时学习目录失败");
    }

    /// 验证当前机器的真实 knowledge 目录可以扫出可展示内容。
    #[test]
    fn scan_study_notes_loads_real_knowledge_directory_when_present() {
        // root 存储当前机器的默认新版文章目录
        let root = PathBuf::from("/Users/imber/Desktop/knowledge");
        if !root.is_dir() {
            return;
        }

        // categories 存储真实目录扫描结果
        let categories = scan_study_notes(root.to_string_lossy().to_string()).expect("扫描失败");
        // total_items 存储真实目录下可展示文章总数
        let total_items: usize = categories.iter().map(|category| category.items.len()).sum();
        // item_with_code 存储至少一个带代码目录的学习单元
        let item_with_code = categories
            .iter()
            .flat_map(|category| category.items.iter())
            .find(|item| item.demo_path.is_some());

        assert!(!categories.is_empty());
        assert!(total_items > 0);
        assert!(item_with_code.is_some());
    }
}
