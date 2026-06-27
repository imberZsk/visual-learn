use serde::{de::DeserializeOwned, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

/// 应用所有本地持久化数据的统一根目录。
pub const STORAGE_DIR: &str = "/Users/imber/.visualLearn";

/// 获取应用持久化根目录。
///
/// # 返回
/// * `PathBuf` - 应用持久化目录路径
pub fn storage_dir() -> PathBuf {
    // 用户明确要求所有持久化数据统一放到该目录，避免散落在项目仓库或默认 app data 中
    PathBuf::from(STORAGE_DIR)
}

/// 获取应用持久化目录下的指定文件路径。
///
/// # 参数
/// * `file_name` - 要拼接到持久化目录下的文件名
///
/// # 返回
/// * `PathBuf` - 指定持久化文件的绝对路径
pub fn storage_file_path(file_name: &str) -> PathBuf {
    // 目标文件路径，存放在统一持久化目录下
    storage_dir().join(file_name)
}

/// 确保持久化目录存在。
///
/// # 返回
/// * `Result<(), String>` - 成功返回 ()，失败返回错误信息
fn ensure_storage_dir() -> Result<(), String> {
    // 应用持久化根目录，所有写文件前都要确保它存在
    let dir = storage_dir();

    fs::create_dir_all(&dir).map_err(|e| format!("创建持久化目录失败: {}", e))
}

/// 从多个候选 JSON 文件中读取第一个有效数据，用于兼容旧持久化位置。
///
/// # 参数
/// * `paths` - 按优先级排列的候选 JSON 文件路径
///
/// # 返回
/// * `Option<T>` - 读取并解析成功的数据；全部失败则返回 None
pub fn read_first_valid_json<T: DeserializeOwned>(paths: &[PathBuf]) -> Option<T> {
    read_first_valid_json_with_source(paths).map(|(data, _)| data)
}

/// 从多个候选 JSON 文件中读取第一个有效数据，并返回数据来源路径。
///
/// # 参数
/// * `paths` - 按优先级排列的候选 JSON 文件路径
///
/// # 返回
/// * `Option<(T, PathBuf)>` - 读取成功的数据及来源路径；全部失败则返回 None
pub fn read_first_valid_json_with_source<T: DeserializeOwned>(
    paths: &[PathBuf],
) -> Option<(T, PathBuf)> {
    for path in paths {
        if !path.exists() {
            continue;
        }

        // 旧文件可能损坏，解析失败时继续尝试下一个候选位置，避免阻塞启动
        let content = match fs::read_to_string(path) {
            Ok(content) => content,
            Err(_) => continue,
        };
        if let Ok(data) = serde_json::from_str(&content) {
            return Some((data, path.clone()));
        }
    }

    None
}

/// 将数据以格式化 JSON 写入统一持久化目录中的文件。
///
/// # 参数
/// * `path` - 要写入的目标文件路径
/// * `data` - 要序列化并保存的数据
///
/// # 返回
/// * `Result<(), String>` - 成功返回 ()，失败返回错误信息
pub fn write_json<T: Serialize>(path: &Path, data: &T) -> Result<(), String> {
    ensure_storage_dir()?;

    // 格式化 JSON，方便用户直接查看和手动修复
    let content =
        serde_json::to_string_pretty(data).map_err(|e| format!("序列化持久化数据失败: {}", e))?;

    fs::write(path, content).map_err(|e| format!("写入持久化文件失败: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    /// 验证统一持久化目录为用户指定路径。
    #[test]
    fn storage_dir_uses_visual_learn_dir() {
        // 期望的应用持久化根目录
        let expected_dir = PathBuf::from("/Users/imber/.visualLearn");

        assert_eq!(storage_dir(), expected_dir);
    }

    /// 验证读取 JSON 时会返回第一个有效来源路径。
    #[test]
    fn read_first_valid_json_with_source_returns_source_path() {
        // now 存储当前时间戳，用于生成不冲突的临时目录名
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("系统时间早于 UNIX_EPOCH")
            .as_nanos();
        // temp_dir 存储本次测试专用的临时目录
        let temp_dir = std::env::temp_dir().join(format!("visual-learn-storage-test-{}", now));
        // missing_path 存储不存在的候选文件路径
        let missing_path = temp_dir.join("missing.json");
        // valid_path 存储包含有效 JSON 的候选文件路径
        let valid_path = temp_dir.join("valid.json");

        fs::create_dir_all(&temp_dir).expect("创建临时目录失败");
        fs::write(&valid_path, r#"{"value":"ok"}"#).expect("写入临时 JSON 失败");

        // paths 存储按优先级排列的候选路径列表
        let paths = vec![missing_path, valid_path.clone()];
        // result 存储读取到的数据和实际来源路径
        let result: Option<(serde_json::Value, PathBuf)> =
            read_first_valid_json_with_source(&paths);

        assert_eq!(result.map(|(_, path)| path), Some(valid_path));

        fs::remove_dir_all(temp_dir).expect("清理临时目录失败");
    }
}
