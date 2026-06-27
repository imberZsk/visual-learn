use super::storage::{read_first_valid_json_with_source, storage_file_path, write_json};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// 配置文件的数据结构，对应 /Users/imber/.visualLearn/config.json
#[derive(Debug, Serialize, Deserialize)]
struct Config {
    /// 用户配置的学习目录路径
    study_path: String,
}

/// 返回配置文件的绝对路径：/Users/imber/.visualLearn/config.json
fn config_file_path() -> PathBuf {
    // 学习目录配置文件路径，统一放在应用持久化目录下
    storage_file_path("config.json")
}

/// 返回旧版本配置文件的绝对路径：~/.visual-learn-config.json
fn legacy_config_file_path() -> PathBuf {
    // 用户家目录，旧版本曾将配置散落在这里，当前仅用于兼容读取
    let home = std::env::var("HOME").unwrap_or_default();
    PathBuf::from(format!("{}/.visual-learn-config.json", home))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 验证学习目录配置写入统一的应用持久化目录。
    #[test]
    fn config_file_path_uses_visual_learn_dir() {
        // 期望的配置文件路径，用于锁定用户指定的持久化位置
        let expected_path = PathBuf::from("/Users/imber/.visualLearn/config.json");

        assert_eq!(config_file_path(), expected_path);
    }
}

/// Tauri 命令：读取用户配置的学习目录路径
/// 若配置文件不存在或解析失败，返回默认路径
///
/// # 返回
/// * `Result<String, String>` - 学习目录路径，失败返回错误信息
#[tauri::command]
pub fn get_study_path() -> Result<String, String> {
    // 默认学习目录路径
    let default_path = "/Users/imber/Desktop/imber".to_string();
    // 新版配置文件路径
    let current_path = config_file_path();

    // 候选路径列表，优先读取新路径，其次读取旧家目录配置以兼容已有设置
    let paths = vec![current_path.clone(), legacy_config_file_path()];

    // result 存储读取到的配置数据以及它来自哪个文件
    let result = read_first_valid_json_with_source::<Config>(&paths);
    if let Some((config, source_path)) = result {
        // 从旧路径读到数据时，立即写入新路径，实现一次性迁移
        if source_path != current_path {
            let _ = write_json(&current_path, &config);
        }
        return Ok(config.study_path);
    }

    Ok(default_path)
}

/// Tauri 命令：写入用户配置的学习目录路径
/// 写入前校验路径存在且是目录
///
/// # 参数
/// * `path` - 用户设置的学习目录绝对路径
///
/// # 返回
/// * `Result<(), String>` - 成功返回 ()，失败返回错误信息
#[tauri::command]
pub fn set_study_path(path: String) -> Result<(), String> {
    // 校验路径存在
    let p = std::path::Path::new(&path);
    if !p.exists() {
        return Err(format!("路径不存在: {}", path));
    }
    // 校验路径是目录
    if !p.is_dir() {
        return Err(format!("路径不是目录: {}", path));
    }

    // 构造配置对象并写入统一持久化目录
    let config = Config { study_path: path };

    write_json(&config_file_path(), &config)
}
