# 🎯 使用 npm 命令启动应用

## 问题说明

你遇到的错误：
```bash
npm run tauri:dev
# Error: failed to get cargo metadata
```

**原因**: Tauri 需要 Rust，但系统未安装。

---

## ✅ 解决方案

### 方式 1: 一次性安装 Rust（推荐）

安装完 Rust 后，`npm run tauri:dev` 就能直接工作了！

#### 快速安装（自动）
```bash
# 在项目目录运行
cd /Users/imber/Desktop/ai/visual-learn

# 方式 A: 使用我们的脚本
./install-rust.sh

# 方式 B: 官方安装命令
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 刷新环境变量
source $HOME/.cargo/env

# 验证安装
cargo --version
```

#### 然后就可以直接用 npm 命令了！
```bash
# 开发模式
npm run tauri:dev

# 构建应用
npm run tauri:build

# 只看前端
npm run dev
```

---

### 方式 2: 添加便捷脚本（临时方案）

如果暂时不想安装 Rust，可以先预览前端：

我已经在 `package.json` 中添加了这些命令：

```json
{
  "scripts": {
    "dev": "vite",                    // 只启动前端
    "tauri:dev": "tauri dev",         // 完整应用（需要 Rust）
    "tauri:build": "tauri build",     // 打包应用
    "build": "tsc && vite build"      // 构建前端
  }
}
```

#### 使用方式
```bash
# 前端预览（无需 Rust）
npm run dev
# 访问 http://localhost:1420

# 完整应用（需要 Rust）
npm run tauri:dev
```

---

## 🚀 推荐流程

### 第一次使用（一次性操作）

```bash
# 1. 安装 Rust（5-10 分钟）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 2. 重启终端或刷新环境
source $HOME/.cargo/env

# 3. 验证安装
cargo --version
```

### 之后每次启动

```bash
cd /Users/imber/Desktop/ai/visual-learn

# 直接用 npm 命令，就这么简单！
npm run tauri:dev
```

---

## ⏱️ 时间说明

| 操作 | 首次 | 之后 |
|------|------|------|
| 安装 Rust | 5-10分钟 | - |
| 编译应用 | 5-10分钟 | 2-5秒 |
| 启动应用 | - | 2-5秒 |

**首次总计**: 10-20 分钟  
**之后每次**: 2-5 秒 ⚡

---

## 📋 安装 Rust 的步骤

### macOS（你的系统）

```bash
# 1. 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 2. 按提示选择 "1" (默认安装)

# 3. 等待安装完成

# 4. 刷新环境（重要！）
source $HOME/.cargo/env

# 5. 验证
cargo --version
# 应该显示: cargo 1.xx.x

rustc --version  
# 应该显示: rustc 1.xx.x
```

### 如果需要 Xcode 工具

```bash
xcode-select --install
```

---

## ✅ 安装完成后

直接使用 npm 命令：

```bash
# 进入项目
cd /Users/imber/Desktop/ai/visual-learn

# 启动应用（首次编译需要 5-10 分钟）
npm run tauri:dev

# 之后每次启动只需几秒
npm run tauri:dev
```

就这么简单！

---

## 🐛 如果遇到问题

### 问题 1: cargo 命令找不到

```bash
# 刷新环境变量
source $HOME/.cargo/env

# 或者重启终端
```

### 问题 2: 端口被占用

```bash
# 清理端口
lsof -ti:1420 | xargs kill -9

# 重新运行
npm run tauri:dev
```

### 问题 3: 权限错误

```bash
# 给脚本添加权限
chmod +x install-rust.sh

# 重新安装
./install-rust.sh
```

---

## 💡 为什么需要 Rust?

Tauri 是一个桌面应用框架：
- **前端**: React (你已经有了)
- **后端**: Rust (需要安装)

就像 Electron 需要 Node.js 一样，Tauri 需要 Rust。

**好消息**: 
- ✅ 只需要安装一次
- ✅ 安装后就能用 npm 命令了
- ✅ 比 Electron 轻量 10 倍

---

## 🎯 总结

### 现在的状态
- ✅ 前端代码完成
- ✅ Rust 代码完成
- ✅ npm 依赖已安装
- ⚠️ 需要安装 Rust（一次性操作）

### 你需要做的
```bash
# 1. 安装 Rust（一次性，5-10 分钟）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# 2. 以后直接用 npm 命令
npm run tauri:dev
```

就是这么简单！

---

**安装完 Rust，`npm run tauri:dev` 就能正常工作了！** 🚀
