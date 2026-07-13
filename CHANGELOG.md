# Changelog

本项目所有重要变更记录于此，遵循语义化版本规则。

## 0.0.2 - 2026-07-14

### 修复

- 提交公开的 npmmirror registry 配置，并为 Electron 打包命令配置 Electron 与 electron-builder 二进制镜像，减少依赖安装和打包下载耗时；私有凭据继续仅允许放在用户级 `.npmrc`。
