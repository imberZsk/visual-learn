# 项目上下文

Visual Learn 是 Electron + React + TypeScript 桌面应用，用于扫描本地学习笔记、阅读 Markdown、记录进度并维护标注与总结。

- Node.js `>=22.12.0`，包管理器 `pnpm@11.13.0`。
- 技术栈：Electron、React 19、TypeScript、Ant Design 6、Vite、Vitest、Zustand。
- 用户配置和学习数据位于 `~/.visualLearn`，不得提交真实数据或个人绝对路径。
- 开发端口从 5273 起动态选择，使用 `pnpm dev` 启动。

```bash
pnpm run lint
pnpm run typecheck
pnpm test
pnpm run build:ui
pnpm run verify:boot
pnpm run dist
pnpm run dist:win
```
