# Visual Learn

Visual Learn 是一个 Electron 桌面应用，用于扫描本地学习笔记目录、阅读 Markdown 小册、追踪完成进度，并维护文章标注与总结。

官网文档框架：<https://visual-learn-docs.netlify.app>

## 功能

- 扫描本地学习资料目录，按分组和小册组织 Markdown 内容。
- 在桌面应用内阅读 Markdown，支持代码块、目录和文章切换。
- 记录每篇文章的完成状态，并保留历史进度兼容迁移。
- 管理文章标注与单篇文章总结。
- 配置学习目录和 VSCode 打开目录，一键跳转到本地代码或笔记位置。

## 技术栈

- Electron + Vite
- React 18 + TypeScript
- Ant Design 5
- Vitest + happy-dom
- electron-builder

## 开发

```bash
pnpm install
pnpm dev
```

常用命令：

```bash
pnpm test             # 运行全部测试
pnpm run build:ui     # 类型检查 + 构建渲染进程
pnpm start            # 构建后以生产模式启动 Electron
pnpm run verify:boot  # Electron 启动冒烟验证
pnpm run dist         # 打包 macOS arm64 DMG
pnpm run dist:win     # 打包 Windows x64 安装包 + 便携版
```

## 项目结构

```text
electron/          Electron 主进程、IPC、preload 和安全策略
src/core/          本地扫描、进度、配置、标注、总结等纯 Node 逻辑
src/pages/         桌面应用页面
src/components/    可复用 React 组件
test/              单元测试与 Electron IPC 测试
scripts/           开发端口选择和启动验证脚本
```

## 打包

```bash
pnpm run dist       # macOS：arm64 DMG
pnpm run dist:win   # Windows：x64 安装包 + 便携版
```

构建产物输出到 `release/`，不应提交到仓库。

## 隐私与本地数据

Visual Learn 读取用户配置的本地学习目录，学习进度、标注、文章总结和偏好配置都保存在本机。项目不会上传你的笔记内容或本地路径。
