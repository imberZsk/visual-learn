// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// 引入 commands 模块（包含所有 Tauri 命令处理器）
mod commands;

// 导入所有 Tauri 命令
use commands::config::{get_study_path, set_study_path};
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
            get_preference,
            set_preference
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
