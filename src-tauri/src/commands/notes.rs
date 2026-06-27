use std::process::Command;

/// Tauri 命令：读取 md 文件内容，供前端在应用内渲染
/// 仅允许读取学习目录范围内的文件
///
/// # 参数
/// * `file_path` - md 文件的绝对路径
/// * `study_root` - 学习目录根路径（用于安全校验，防止越权读取）
///
/// # 返回
/// * `Result<String, String>` - 文件文本内容，失败返回错误信息
#[tauri::command]
pub fn read_md_content(file_path: String, study_root: String) -> Result<String, String> {
    // 安全校验：只允许读取学习目录内的文件
    if !file_path.starts_with(&study_root) {
        return Err("无权读取学习目录之外的文件".to_string());
    }

    std::fs::read_to_string(&file_path).map_err(|e| format!("读取文件失败: {}", e))
}

/// Tauri 命令：用系统默认编辑器打开笔记文件
/// 在 macOS 上使用 `open` 命令，在 Windows 上使用 `start`，在 Linux 上使用 `xdg-open`
///
/// # 参数
/// * `file_path` - 要打开的笔记文件的绝对路径
///
/// # 返回
/// * `Result<(), String>` - 成功返回 ()，失败返回错误信息
#[tauri::command]
pub fn open_note_in_editor(file_path: String) -> Result<(), String> {
    // macOS 系统使用 open 命令
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&file_path)
            .spawn()
            .map_err(|e| format!("打开文件失败: {}", e))?;
    }

    // Windows 系统使用 cmd /c start 命令
    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(&["/c", "start", "", &file_path])
            .spawn()
            .map_err(|e| format!("打开文件失败: {}", e))?;
    }

    // Linux 系统使用 xdg-open 命令
    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&file_path)
            .spawn()
            .map_err(|e| format!("打开文件失败: {}", e))?;
    }

    Ok(())
}

/// 在候选的 VSCode CLI 路径中查找一个可用的可执行文件
/// GUI 应用启动时的 PATH 往往不包含 /usr/local/bin 等目录，
/// 因此这里用绝对路径兜底，逐个探测常见的安装位置
///
/// # 返回
/// * `Option<String>` - 找到则返回可执行文件路径，否则返回 None
#[cfg(any(target_os = "linux", target_os = "macos"))]
fn find_vscode_binary() -> Option<String> {
    // 常见的 VSCode CLI 安装路径（按优先级排列）
    let candidates = [
        "/usr/local/bin/code",
        "/opt/homebrew/bin/code",
        "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code",
        "/usr/bin/code",
    ];

    // 逐个检查路径是否存在
    for candidate in candidates.iter() {
        if std::path::Path::new(candidate).exists() {
            return Some(candidate.to_string());
        }
    }

    None
}

/// Tauri 命令：用 VSCode 打开文件或目录（强制新开独立窗口）
/// - macOS：用绝对路径兜底查找 `code`，配合 --new-window 强制新开独立窗口，
///   避免 `open -a` 复用已有窗口的问题；找不到时 fallback 到 PATH 中的 "code"
/// - Linux：用绝对路径兜底查找 `code`，配合 --new-window 新开窗口
/// - Windows：通过 cmd 调用 code，配合 --new-window 新开窗口
///
/// # 参数
/// * `target_path` - 要用 VSCode 打开的文件或目录的绝对路径
///
/// # 返回
/// * `Result<(), String>` - 成功返回 ()，失败返回错误信息
#[tauri::command]
pub fn open_in_vscode(target_path: String) -> Result<(), String> {
    // macOS：用绝对路径探测 code CLI，强制 --new-window 新开独立窗口；
    // 不用 open -a，因为 open -a 会复用已有的 VSCode 窗口
    #[cfg(target_os = "macos")]
    {
        // 优先使用探测到的绝对路径，否则退回到 PATH 中的 "code"
        let binary = find_vscode_binary().unwrap_or_else(|| "code".to_string());

        // --new-window：强制新开独立窗口，避免在已有窗口里叠加打开
        Command::new(&binary)
            .arg("--new-window")
            .arg(&target_path)
            .spawn()
            .map_err(|e| {
                format!(
                    "用 VSCode 打开失败: {}。请确认已安装 VSCode 并配置了 'code' 命令",
                    e
                )
            })?;
    }

    // Linux：用绝对路径兜底查找 code 命令，新开独立窗口
    #[cfg(target_os = "linux")]
    {
        // 优先使用探测到的绝对路径，否则退回到 PATH 中的 "code"
        let binary = find_vscode_binary().unwrap_or_else(|| "code".to_string());

        // --new-window：强制新开独立窗口，避免在已有窗口里叠加打开
        Command::new(&binary)
            .arg("--new-window")
            .arg(&target_path)
            .spawn()
            .map_err(|e| {
                format!(
                    "用 VSCode 打开失败: {}。请确认已安装 VSCode 并配置了 'code' 命令",
                    e
                )
            })?;
    }

    // Windows：通过 cmd 调用 code.cmd，同样新开窗口
    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(&["/c", "code", "--new-window", &target_path])
            .spawn()
            .map_err(|e| {
                format!(
                    "用 VSCode 打开失败: {}。请确认已安装 VSCode 并配置了 'code' 命令",
                    e
                )
            })?;
    }

    Ok(())
}
