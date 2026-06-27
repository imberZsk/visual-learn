use super::storage::{read_first_valid_json_with_source, storage_file_path, write_json};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

/// 单个文件的学习进度记录
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgressEntry {
    /// 是否已完成学习
    pub completed: bool,
    /// 完成时间（Unix 时间戳，毫秒）；未完成时为 None
    pub completed_at: Option<i64>,
}

/// 进度数据的整体结构
/// 以文件绝对路径为 key，记录每个文件的学习状态
#[derive(Debug, Default, Serialize, Deserialize)]
pub struct ProgressData {
    /// 文件路径 -> 进度记录 的映射
    pub entries: HashMap<String, ProgressEntry>,
}

/// 获取进度数据文件的存储路径
/// 存放在统一应用持久化目录 /Users/imber/.visualLearn 下，
/// 用绝对路径避免受应用启动工作目录影响（dev 与 release 模式的 cwd 不同）
///
/// # 返回
/// * `PathBuf` - 进度文件的路径
fn progress_file_path() -> PathBuf {
    // 学习进度文件路径，用于记录每篇文章是否已完成
    storage_file_path("progress.json")
}

/// 获取旧版本进度数据文件路径，用于一次性兼容读取。
///
/// # 返回
/// * `PathBuf` - 旧进度文件路径
fn legacy_progress_file_path() -> PathBuf {
    // 旧版本曾将进度写入项目仓库内，该路径仅作为迁移读取来源
    PathBuf::from("/Users/imber/Desktop/ai/visual-learn/data/progress.json")
}

/// 从磁盘读取进度数据
/// 如果文件不存在或解析失败，返回空的进度数据（首次使用场景）
///
/// # 返回
/// * `ProgressData` - 读取到的进度数据
fn load_progress_data() -> ProgressData {
    // 新版进度文件路径
    let current_path = progress_file_path();
    // 候选路径列表，优先读取新路径，其次读取旧仓库内路径以兼容已有数据
    let paths = vec![current_path.clone(), legacy_progress_file_path()];

    // result 存储读取到的进度数据以及它来自哪个文件
    let result = read_first_valid_json_with_source(&paths);
    if let Some((data, source_path)) = result {
        // 从旧路径读到数据时，立即写入新路径，实现一次性迁移
        if source_path != current_path {
            let _ = save_progress_data(&data);
        }
        return data;
    }

    ProgressData::default()
}

/// 将进度数据写入磁盘
///
/// # 参数
/// * `data` - 要保存的进度数据
///
/// # 返回
/// * `Result<(), String>` - 成功返回 ()，失败返回错误信息
fn save_progress_data(data: &ProgressData) -> Result<(), String> {
    let path = progress_file_path();

    write_json(&path, data)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 验证学习进度文件写入统一的应用持久化目录。
    #[test]
    fn progress_file_path_uses_visual_learn_dir() {
        // 期望的进度文件路径，用于锁定用户指定的持久化位置
        let expected_path = PathBuf::from("/Users/imber/.visualLearn/progress.json");

        assert_eq!(progress_file_path(), expected_path);
    }
}

/// Tauri 命令：获取所有学习进度
/// 返回 文件路径 -> 是否完成 的映射，供前端渲染勾选状态
///
/// # 返回
/// * `Result<HashMap<String, bool>, String>` - 路径到完成状态的映射
#[tauri::command]
pub fn get_progress() -> Result<HashMap<String, bool>, String> {
    let data = load_progress_data();

    // 转换为简化的 路径 -> bool 映射
    let result: HashMap<String, bool> = data
        .entries
        .into_iter()
        .map(|(path, entry)| (path, entry.completed))
        .collect();

    Ok(result)
}

/// Tauri 命令：设置某个文件的学习完成状态
///
/// # 参数
/// * `file_path` - 文件的绝对路径
/// * `completed` - 是否标记为已完成
/// * `timestamp` - 当前时间戳（毫秒），由前端传入（脚本环境无法生成时间）
///
/// # 返回
/// * `Result<(), String>` - 成功返回 ()，失败返回错误信息
#[tauri::command]
pub fn set_progress(file_path: String, completed: bool, timestamp: i64) -> Result<(), String> {
    // 读取现有进度
    let mut data = load_progress_data();

    if completed {
        // 标记为完成，记录完成时间
        data.entries.insert(
            file_path,
            ProgressEntry {
                completed: true,
                completed_at: Some(timestamp),
            },
        );
    } else {
        // 取消完成：直接移除该条目，保持数据精简
        data.entries.remove(&file_path);
    }

    // 持久化
    save_progress_data(&data)?;

    Ok(())
}
