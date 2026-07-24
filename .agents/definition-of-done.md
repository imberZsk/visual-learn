# 完成标准

- 需求已实现，空值、失败、重复提交、资源清理和跨平台分支已检查。
- 新增或修改行为有对应测试，未补无关历史覆盖率。
- 至少运行相关 Vitest、`pnpm run lint` 与 `pnpm run typecheck`。
- UI、类型或构建改动运行 `pnpm run build:ui`；主进程/preload/IPC 改动再运行 `pnpm run verify:boot`。
- 最终说明实际验证结果、未验证项和残余风险，不声称未执行的检查通过。
- 除非用户明确要求，不提交、推送、创建 PR、打 tag 或发布。
