// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
// objc 0.2.x 的宏内部使用了 cfg(cargo-clippy)，Rust 新版本会报 unexpected_cfgs，此处统一压掉
#![allow(unexpected_cfgs)]

// 引入 commands 模块（包含所有 Tauri 命令处理器）
mod commands;

// macOS 专用：导入 objc 宏和 runtime，msg_send! 内部会展开 sel!，必须将这些宏引入作用域
#[cfg(target_os = "macos")]
use objc::{class, msg_send, runtime, sel, sel_impl};

// 导入所有 Tauri 命令
use commands::config::{get_study_path, get_vscode_path, set_study_path, set_vscode_path};
use commands::file_scanner::scan_study_notes;
use commands::notes::{open_in_vscode, open_note_in_editor, read_md_content};
use commands::preferences::{get_preference, set_preference};
use commands::progress::{get_progress, set_progress};

/**
 * 后端问候命令
 * 接收用户名并返回问候消息
 * @param name 用户输入的名字
 * @return 格式化的问候消息字符串
 */
#[tauri::command]
fn greet(name: &str) -> String {
    format!("你好, {}! 欢迎使用 Tauri!", name)
}

/**
 * 应用入口函数
 * 初始化 Tauri 应用并注册命令处理器
 */
fn main() {
    tauri::Builder::default()
        .setup(|_app| {
            // 从 VSCode 全屏终端启动时，子进程窗口会叠在同一 Space 里而非独立弹出。
            // activateIgnoringOtherApps 强制让本 App 成为活跃应用，把窗口拉到前台/正确 Space。
            // 从 VSCode 全屏终端启动时，子进程默认继承父进程的 Space 上下文，窗口会叠在 VSCode 里。
            // 解决方案：先把激活策略设为 Regular（0），让 macOS 将本进程视为独立桌面应用并在 Dock 显示，
            // 再调 activateIgnoringOtherApps 切换焦点，窗口就会出现在桌面而非 VSCode 的全屏 Space。
            #[cfg(target_os = "macos")]
            unsafe {
                // ns_app 存储 NSApplication 单例指针
                let ns_app: *mut runtime::Object =
                    msg_send![class!(NSApplication), sharedApplication];
                // 0 = NSApplicationActivationPolicyRegular：以常规应用身份出现在 Dock，
                // 使 macOS 为本应用独立分配 Space，而非复用父进程（VSCode）的全屏 Space
                let _: () = msg_send![ns_app, setActivationPolicy: 0i64];
                // 强制抢占焦点，把窗口拉到前台
                let _: () = msg_send![ns_app, activateIgnoringOtherApps: runtime::YES];
            }
            Ok(())
        })
        // 注册前端可调用的命令
        .invoke_handler(tauri::generate_handler![
            greet,
            scan_study_notes,
            open_note_in_editor,
            open_in_vscode,
            read_md_content,
            get_progress,
            set_progress,
            get_study_path,
            set_study_path,
            get_vscode_path,
            set_vscode_path,
            get_preference,
            set_preference
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
