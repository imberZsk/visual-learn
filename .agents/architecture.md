# 架构约束

- `electron/` 负责窗口、CSP、IPC 与 preload；只保留系统副作用和转发。
- `src/core/` 放纯 Node 业务逻辑，不依赖 React 或 Electron 渲染层。
- `src/pages/` 放页面，`src/components/` 放真实复用组件，`src/api.ts` 是渲染层唯一跨进程适配入口。
- 调用链保持 `页面/组件 -> src/api.ts -> window.visualLearn -> preload -> ipcHandlers -> src/core`。
- 可测试的扫描、规范化、路径和状态计算放纯函数；不要把页面专用逻辑塞进共享组件。
- 修改共享模块前搜索全部调用方，确认所有使用场景安全。
- 项目为 ESM，只有 `electron/preload.cjs` 保持 CommonJS。
