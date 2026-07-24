# 测试规范

- 测试只覆盖本次新增或修改行为；修复 Bug 时先增加可复现用例。
- 核心扫描与持久化测试使用临时目录和受控夹具，不访问用户真实目录。
- UI 使用 Vitest、happy-dom 与 Testing Library，按用户行为断言，不绑定无关内部实现。
- IPC 测试 mock `ipcMain` 和注入依赖；完整启动链路由 `verify:boot` 验证。
- 异步测试使用明确等待条件，不用任意 sleep；mock 与全局对象在用例后恢复。
- 平台逻辑注入 `darwin`/`win32` 覆盖两端分支。
