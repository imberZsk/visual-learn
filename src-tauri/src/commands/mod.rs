/**
 * commands 模块
 * 包含所有 Tauri 命令处理器
 */
// 导出文件扫描器模块（扫描小册学习单元）
pub mod file_scanner;

// 导出笔记操作模块（VSCode 打开、读取 md 内容）
pub mod notes;

// 导出学习进度管理模块（勾选已学/未学）
pub mod progress;

// 导出配置管理模块（学习目录路径的读写）
pub mod config;

// 导出统一持久化目录模块
pub mod storage;

// 导出用户偏好管理模块（主题、上次打开文章等）
pub mod preferences;
