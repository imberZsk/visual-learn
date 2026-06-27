use serde::{Deserialize, Serialize};
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

        // 只处理 .md 文件
        if !path.is_file() {
            continue;
        }
        let is_md = path.extension().map(|ext| ext == "md").unwrap_or(false);
        if !is_md {
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

        // 元数据
        let metadata = match fs::metadata(&path) {
            Ok(m) => m,
            Err(_) => continue,
        };
        let modified = metadata
            .modified()
            .ok()
            .and_then(|t| t.duration_since(SystemTime::UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as i64)
            .unwrap_or(0);

        // 解析对应的 demo 路径
        let demo_path = resolve_demo_path(demo_dir, &stem);

        items.push(StudyItem {
            path: path.to_string_lossy().to_string(),
            name: file_name,
            category: category.to_string(),
            demo_path,
            size: metadata.len(),
            modified,
        });
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

        // 跳过隐藏目录（.git 等）和 demo 目录
        if dir_name.starts_with('.') {
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
        } else if !dir_name.to_lowercase().contains("demo") {
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

    // 按分类名排序，保证稳定展示顺序
    categories.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(categories)
}
