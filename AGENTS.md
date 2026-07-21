# AGENTS.md

本文件为 AI 编码助手在本仓库工作时提供指导。

> 交流、注释、文档统一使用中文。

## 项目概述

Visual Learn 是一个 Electron + React + TypeScript 桌面应用，用于扫描本地学习笔记目录、阅读 Markdown 小册、记录文章完成进度、维护文章标注与总结，并可用 VSCode 打开对应目录。

技术栈：Electron（主进程 + preload 安全桥 + Vite 渲染进程）+ React 18 + TypeScript + Ant Design 5 + Vitest。

## 常用命令

```bash
pnpm install          # 安装依赖
pnpm dev              # 开发模式：动态选择 5273 起始端口 + Electron 热联调
pnpm run build:ui     # 类型检查 + Vite 构建渲染进程
pnpm start            # 构建后以生产模式启动 Electron
pnpm test             # 运行全部测试
pnpm run test:watch   # watch 模式
pnpm run verify:boot  # Electron 启动冒烟验证
pnpm run dist         # 打包 macOS arm64 DMG，产物在 release/
pnpm run dist:win     # 打包 Windows x64 安装包 + 便携版，需在 Windows 上运行
```

运行单个测试文件或用例：

```bash
npx vitest run test/core/studyScanner.test.js
npx vitest run -t "用例名"
```

## 架构

```text
electron/          Electron 主进程层：窗口、CSP、IPC 注册和 preload
src/core/          纯 Node 业务逻辑：扫描、进度、配置、标注、总结、VSCode 打开
src/pages/         React 页面：Dashboard、NotesLibrary 等
src/components/    可复用组件
test/              Vitest 测试
scripts/           dev 端口选择、启动冒烟验证等辅助脚本
```

渲染进程调用链：

```text
页面/组件 -> src/api.ts -> window.visualLearn(preload) -> ipcHandlers -> src/core
```

新增跨进程能力时，通常需要同步修改 `electron/ipcChannels.js`、`electron/preload.cjs`、`electron/ipcHandlers.js`、`src/api.ts`，并把可测试逻辑放在 `src/core`。

## 数据与路径

- 学习目录路径、VSCode 打开目录、轻量偏好等配置由 `src/core/config.js` / `preferences.js` 管理。
- 学习进度、文章标注、文章总结等本地数据写入应用自己的存储目录。
- 应用配置和学习进度保存在当前用户主目录下的 `.visualLearn` 中，仓库不得提交真实用户数据或个人绝对路径。

## 开发约定

- 项目为 ESM（`"type": "module"`），Electron preload 使用 CommonJS（`preload.cjs`）。
- 代码注释规则见全局 AGENTS.md：函数/方法、变量必须添加用途说明；非显而易见分支说明业务场景；复杂逻辑/workaround 注释 WHY。
- 容易阻塞的任务需要异步处理并提供 loading 状态。
- 开发 UI 时优先考虑 Ant Design 是否已有合适组件。
- 不要提交构建产物、覆盖率报告、`.superpowers/`、`docs/superpowers/` 或 npm/yarn 锁文件。项目级 `.npmrc` 必须提交，且只允许公开、无凭据的 registry 配置；私有 registry、认证 token 和内网地址必须放用户级 `~/.npmrc`。
