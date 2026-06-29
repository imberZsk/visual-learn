use super::storage::{read_first_valid_json_with_source, storage_file_path, write_json};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// 配置文件的数据结构，对应 /Users/imber/.visualLearn/config.json
#[derive(Debug, Serialize, Deserialize)]
struct Config {
    /// 用户配置的文章根目录路径
    study_path: String,
    /// 用户配置的 VSCode 打开根目录路径
    #[serde(default)]
    vscode_path: String,
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

    /// 验证 Config 兼容只包含 study_path 的旧配置文件。
    #[test]
    fn config_supports_legacy_study_path_only_json() {
        // config 存储旧版本 JSON 反序列化后的配置数据
        let config: Config =
            serde_json::from_str(r#"{"study_path":"/Users/imber/Desktop/knowledge"}"#)
                .expect("旧配置 JSON 应该能解析");

        assert_eq!(config.study_path, "/Users/imber/Desktop/knowledge");
        assert_eq!(config.vscode_path, "");
    }
}

/// 返回当前机器上可用的默认文章目录。
///
/// # 返回
/// * `String` - 优先指向新版 knowledge 目录，缺失时兼容旧 imber 目录
fn default_study_path() -> String {
    // primary_path 存储新版文章目录，当前学习资料已经迁移到该目录结构
    let primary_path = "/Users/imber/Desktop/knowledge";
    // legacy_path 存储旧版文章目录，用于兼容尚未迁移的机器
    let legacy_path = "/Users/imber/Desktop/imber";

    if std::path::Path::new(primary_path).is_dir() {
        primary_path.to_string()
    } else {
        legacy_path.to_string()
    }
}

/// 读取完整应用配置，并自动补齐旧配置缺失字段。
///
/// # 返回
/// * `Config` - 当前应用配置，包含文章根目录和 VSCode 打开根目录
fn load_config() -> Config {
    // current_path 存储新版配置文件路径
    let current_path = config_file_path();
    // paths 存储按优先级排列的配置读取候选路径
    let paths = vec![current_path.clone(), legacy_config_file_path()];
    // default_path 存储当前机器可用的默认文章目录
    let default_path = default_study_path();

    // loaded_config 存储候选配置文件中读取到的第一个有效配置
    let loaded_config = read_first_valid_json_with_source::<Config>(&paths);
    if let Some((mut config, source_path)) = loaded_config {
        // should_save 存储是否需要把迁移或补齐后的配置重新写回新路径
        let mut should_save = source_path != current_path;
        if config.study_path.trim().is_empty() {
            config.study_path = default_path.clone();
            should_save = true;
        }
        if config.vscode_path.trim().is_empty() {
            config.vscode_path = config.study_path.clone();
            should_save = true;
        }
        // 从旧路径读到数据或补齐了旧字段时，立即写入新路径实现迁移
        if should_save {
            let _ = write_json(&current_path, &config);
        }
        return config;
    }

    Config {
        study_path: default_path.clone(),
        vscode_path: default_path,
    }
}

/// 校验用户输入的目录路径存在且为目录。
///
/// # 参数
/// * `path` - 用户输入的绝对路径
/// * `label` - 错误提示中使用的路径类型名称
///
/// # 返回
/// * `Result<(), String>` - 校验通过返回 ()，失败返回错误信息
fn validate_dir(path: &str, label: &str) -> Result<(), String> {
    // p 存储待校验路径的 Path 表示
    let p = std::path::Path::new(path);
    if !p.exists() {
        return Err(format!("{}不存在: {}", label, path));
    }
    if !p.is_dir() {
        return Err(format!("{}不是目录: {}", label, path));
    }

    Ok(())
}

/// Tauri 命令：读取用户配置的学习目录路径
/// 若配置文件不存在或解析失败，返回默认路径
///
/// # 返回
/// * `Result<String, String>` - 学习目录路径，失败返回错误信息
#[tauri::command]
pub fn get_study_path() -> Result<String, String> {
    Ok(load_config().study_path)
}

/// Tauri 命令：读取用户配置的 VSCode 打开根目录路径。
///
/// # 返回
/// * `Result<String, String>` - VSCode 打开根目录路径，失败返回错误信息
#[tauri::command]
pub fn get_vscode_path() -> Result<String, String> {
    Ok(load_config().vscode_path)
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
    validate_dir(&path, "文章目录")?;

    // config 存储当前完整配置，避免更新文章目录时丢失 VSCode 目录
    let mut config = load_config();
    if config.vscode_path == config.study_path {
        config.vscode_path = path.clone();
    }
    config.study_path = path;

    write_json(&config_file_path(), &config)
}

/// Tauri 命令：写入用户配置的 VSCode 打开根目录路径。
/// 写入前校验路径存在且是目录。
///
/// # 参数
/// * `path` - 用户设置的 VSCode 打开根目录绝对路径
///
/// # 返回
/// * `Result<(), String>` - 成功返回 ()，失败返回错误信息
#[tauri::command]
pub fn set_vscode_path(path: String) -> Result<(), String> {
    validate_dir(&path, "VSCode 目录")?;

    // config 存储当前完整配置，避免更新 VSCode 目录时丢失文章目录
    let mut config = load_config();
    config.vscode_path = path;

    write_json(&config_file_path(), &config)
}
