# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> 交流、注释、文档统一使用中文。

## 项目概述

这是一个 Tauri 1.5 + React 18 + TypeScript 桌面应用（产品名 `visual-learn`，窗口标题「学习进度追踪器」）。
它扫描本地学习目录中的「小册」（`.md` 文档集合），在应用内渲染阅读、勾选学习进度、并能用 VSCode 打开对应的 demo 代码目录。

注意：仓库目录名是 `visual-learn`，但 `package.json` / Tauri 产品名是 `visual-learn`，二者不一致是正常的。

## 常用命令

```bash
npm install              # 安装前端依赖（Rust 依赖由 Tauri 首次编译时自动处理）
npm run tauri:dev        # 开发模式：启动 Vite(端口 1420) + 编译 Rust + 打开应用窗口
npm run tauri:build      # 生产构建，产物在 src-tauri/target/release/bundle/
npm run dev              # 仅启动前端（浏览器里大部分功能不可用，因为依赖 Tauri invoke）
npm run build            # tsc 类型检查 + vite 构建前端（无独立 lint，类型检查走这里）
```

仓库内**没有测试框架、没有 lint 配置**。`npm run build` 中的 `tsc` 是唯一的静态检查手段；改完代码用它验证类型。

## 关键架构：硬编码路径（最重要）

应用的核心行为依赖三处**硬编码绝对路径**，改动学习目录或迁移机器时必须同步修改：

- `src-tauri/src/commands/file_scanner.rs` — `STUDY_ROOT = "/Users/imber/Desktop/imber"`（扫描根目录）
- `src-tauri/src/commands/notes.rs` — 同样的 `STUDY_ROOT` 常量（用于 `read_md_content` 的越权校验）
- `src-tauri/src/commands/progress.rs` — `progress_file_path()` 返回 `/Users/imber/Desktop/ai/visual-learn/data/progress.json`（注意指向 `visual-learn` 而非当前仓库 `visual-learn`）

前端 `Dashboard.tsx` / `NotesLibrary.tsx` / `Settings.tsx` 里也写死了 `/Users/imber/Desktop/imber` 作为展示文案与「打开项目」目标。Tauri `allowlist.fs.scope` 同样限定在 `$HOME/Desktop/imber/**`。

## 数据模型与扫描规则

后端在 `STUDY_ROOT` 下递归扫描，按三层组织（理解 `file_scanner.rs` 的 `scan_for_booklets` 即可掌握全貌）：

- **group（顶层归类）**：`STUDY_ROOT` 的第一级子目录名，如 `后端`、`AI编程`，用于分组展示。
- **category（学科）**：任何以「小册」结尾的目录，学科名 = 去掉「小册」后缀（如 `python小册` → `python`）。
- **StudyItem（学习单元）**：小册目录下的每个 `.md` 文件，绝对路径作为唯一 key。
- **demo 匹配**：在小册的父目录下找名字含 `demo` 的目录；再用三级策略在其中匹配 md 对应的子目录（见 `resolve_demo_path`）：①精确同名 → ②`md名-demo` 后缀 → ③章节编号兜底（md 与 demo 子目录开头编号相同且唯一）。命中才返回 `demo_path`，前端据此决定是否显示「打开 demo」按钮。各小册命名不统一（如 python 精确同名、skills 带 `-demo` 后缀、harness/Agent/java 仅编号一致），故需多级匹配。

进度数据：`progress.json` 以 `{ entries: { 文件绝对路径: { completed, completed_at } } }` 存储；`get_progress` 返回简化的 `路径 -> bool`，取消完成会直接删除条目以保持精简。

## 前后端通信

前端通过 `@tauri-apps/api/tauri` 的 `invoke()` 调用 `src-tauri/src/main.rs` 中注册的 7 个命令：
`greet`、`scan_study_notes`、`open_note_in_editor`、`open_in_vscode`、`read_md_content`、`get_progress`、`set_progress`。

新增命令时：在 `commands/` 下对应模块加 `#[tauri::command]` 函数 → 在 `main.rs` 的 `use` 与 `generate_handler!` 同时登记 → 前端 `invoke('name', { ... })` 调用。

**参数命名约定**：JS 侧用 camelCase（如 `filePath`、`targetPath`），Tauri 自动转成 Rust 的 snake_case（`file_path`、`target_path`）。调用 `set_progress` 时 `timestamp` 由前端 `Date.now()` 传入（Rust 命令不自行取时间）。

## 前端结构要点

- **路由**：`App.tsx` 用 react-router 配置三个页面 —— `/dashboard`（学习概览，按 group 聚合进度）、`/notes`（核心阅读页）、`/settings`。Dashboard 点击学科会带 `location.state` 跳到 `/notes` 并自动展开对应层级。
- **NotesLibrary.tsx** 是最复杂的页面：三级折叠导航树（group → category → item）+ Markdown 阅读区 + 自动生成的 TOC 目录（渲染后扫描 `h1-h4`、监听滚动高亮）。Markdown 用 `react-markdown` + `remark-gfm` + `rehype-highlight`，代码块由自定义 `CodeBlock.tsx` 包装（加语言标签与复制按钮）。
- **主题**：`contexts/ThemeContext.tsx` 管理明暗模式（默认 dark，持久化到 localStorage、写 `<html data-theme>`）；`main.tsx` 据此切换 antd 的 `darkAlgorithm`/`defaultAlgorithm`。深色样式覆盖在 `theme-dark.css`。
- **UI 库**：antd 5（中文 locale），图标 `@ant-design/icons`。

## 文档与遗留代码提醒

- **README.md 已严重过时**，描述的「每日记录、学习路线图、热力图、趋势图、Zustand stores、自定义 hooks、知识树」等功能在当前代码中**并不存在**或未接入。以实际代码为准。
- `data/daily/`、`data/roadmaps/`、`src/types/{daily-log,roadmap,statistics}.ts`、`src/components/charts/`（HeatmapCalendar、ProgressBar）等是**未接入主流程的早期脚手架**，`App.tsx` 并未引用它们。新增功能前先确认目标文件是否真正在用。
- 仓库根目录有大量 `*.md` 说明文件（START_HERE、TROUBLESHOOTING、PROJECT_REPORT 等），多为一次性生成的过程文档，参考价值有限。
