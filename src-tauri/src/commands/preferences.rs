use super::storage::{read_first_valid_json, storage_file_path, write_json};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

/// 用户界面偏好数据结构，对应 /Users/imber/.visualLearn/preferences.json。
#[derive(Debug, Default, Serialize, Deserialize)]
struct Preferences {
    /// 偏好键值映射，用于存储主题、上次打开文章等轻量设置
    values: HashMap<String, String>,
}

/// 返回用户偏好文件的绝对路径。
///
/// # 返回
/// * `PathBuf` - 用户偏好文件路径
fn preferences_file_path() -> PathBuf {
    // 用户偏好文件路径，统一放在应用持久化目录下
    storage_file_path("preferences.json")
}

/// 读取用户偏好数据。
///
/// # 返回
/// * `Preferences` - 当前已保存的用户偏好数据
fn load_preferences() -> Preferences {
    // 候选路径列表，目前只有新路径；保持数组形式便于未来兼容旧路径
    let paths = vec![preferences_file_path()];

    read_first_valid_json(&paths).unwrap_or_default()
}

/// 保存用户偏好数据。
///
/// # 参数
/// * `preferences` - 要保存的用户偏好数据
///
/// # 返回
/// * `Result<(), String>` - 成功返回 ()，失败返回错误信息
fn save_preferences(preferences: &Preferences) -> Result<(), String> {
    // 用户偏好文件路径
    let path = preferences_file_path();

    write_json(&path, preferences)
}

/// Tauri 命令：读取指定偏好值。
///
/// # 参数
/// * `key` - 偏好项名称，如 themeMode 或 lastItemPath
///
/// # 返回
/// * `Result<Option<String>, String>` - 命中返回 Some(value)，不存在返回 None
#[tauri::command]
pub fn get_preference(key: String) -> Result<Option<String>, String> {
    // 当前已保存的用户偏好
    let preferences = load_preferences();

    Ok(preferences.values.get(&key).cloned())
}

/// Tauri 命令：写入指定偏好值。
///
/// # 参数
/// * `key` - 偏好项名称，如 themeMode 或 lastItemPath
/// * `value` - 要保存的偏好值
///
/// # 返回
/// * `Result<(), String>` - 成功返回 ()，失败返回错误信息
#[tauri::command]
pub fn set_preference(key: String, value: String) -> Result<(), String> {
    // 当前已保存的用户偏好
    let mut preferences = load_preferences();

    preferences.values.insert(key, value);

    save_preferences(&preferences)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 验证用户偏好文件写入统一的应用持久化目录。
    #[test]
    fn preferences_file_path_uses_visual_learn_dir() {
        // 期望的偏好文件路径，用于锁定用户指定的持久化位置
        let expected_path = PathBuf::from("/Users/imber/.visualLearn/preferences.json");

        assert_eq!(preferences_file_path(), expected_path);
    }
}
