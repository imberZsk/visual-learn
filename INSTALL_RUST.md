# 🔧 问题诊断和解决方案

## 🐛 当前问题

```bash
npm run tauri:dev
# Error: failed to get cargo metadata: No such file or directory (os error 2)
```

**原因**: Tauri 需要 Rust 环境，但系统中未安装 `cargo` (Rust 的包管理器)。

---

## ✅ 解决方案

### 方法一: 安装 Rust 运行完整 Tauri 应用 (推荐)

这是完整的桌面应用，包括 Rust 后端功能。

#### 步骤 1: 安装 Rust

```bash
# 安装 Rust (需要 5-10 分钟)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 选择 1 (默认安装)

# 安装完成后，刷新环境变量
source $HOME/.cargo/env

# 验证安装
cargo --version
rustc --version
```

#### 步骤 2: 运行 Tauri 应用

```bash
cd /Users/imber/Desktop/ai/visual-learn

# 首次运行 (需要编译 Rust，5-10 分钟)
npm run tauri:dev

# 之后再启动只需几秒钟
```

---

### 方法二: 只运行前端预览 (临时方案)

如果你暂时不想安装 Rust，可以先预览前端界面：

```bash
cd /Users/imber/Desktop/ai/visual-learn

# 只启动前端 (不包含 Rust 后端功能)
npm run dev

# 浏览器访问: http://localhost:1420
```

**注意**: 这种方式**不能访问后端功能**:
- ❌ 无法读取本地文件
- ❌ 无法解析 Markdown
- ❌ 无法调用 Tauri Commands
- ✅ 可以看到界面布局
- ✅ 可以测试前端交互

---

## 🎯 推荐方案

**强烈建议安装 Rust**，因为:

1. ✅ 这是一个完整的桌面应用，核心功能在 Rust 后端
2. ✅ 安装一次即可，之后编译很快
3. ✅ Rust 是 Tauri 的必需依赖
4. ✅ 只需 5-10 分钟安装时间

---

## 📋 详细安装步骤

### 1. 检查是否已安装 Rust

```bash
cargo --version
```

如果显示版本号，说明已安装，跳到步骤 3。

### 2. 安装 Rust

```bash
# macOS 或 Linux
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 安装过程中选择:
# 1) Proceed with installation (default)

# 等待安装完成 (约 5-10 分钟)
```

### 3. 刷新环境

```bash
# 方式 1: 刷新当前终端
source $HOME/.cargo/env

# 方式 2: 重启终端 (更推荐)
# 关闭当前终端，重新打开一个新终端
```

### 4. 验证安装

```bash
cargo --version
# 应该显示: cargo 1.xx.x

rustc --version
# 应该显示: rustc 1.xx.x
```

### 5. 运行 Tauri 应用

```bash
cd /Users/imber/Desktop/ai/visual-learn

# 首次运行 (需要编译 Rust，约 5-10 分钟)
npm run tauri:dev
```

首次编译输出示例:
```
   Compiling proc-macro2 v1.0.76
   Compiling quote v1.0.35
   Compiling serde v1.0.195
   ...
   Compiling visual-learn v0.0.1
    Finished dev [unoptimized + debuginfo] target(s) in 5m 23s
```

编译完成后，应用窗口会自动打开！

---

## 🚀 启动后验证

应用启动成功后，你应该看到:

### ✅ 应用窗口
- 窗口大小: 1200x800
- 左侧: 侧边栏导航 (仪表盘、每日记录、设置)
- 右侧: 主内容区

### ✅ 仪表盘页面
- 4 个统计卡片
- 学习热力图 (GitHub 风格)
- 学习进度条

### ✅ 开发模式特性
- 修改前端代码会自动刷新
- 按 `F12` 打开开发者工具
- 控制台显示日志

---

## 🐛 常见问题

### Q1: 安装 Rust 时提示权限错误

```bash
# 使用 sudo
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sudo sh
```

### Q2: cargo 命令找不到

```bash
# 刷新环境变量
source $HOME/.cargo/env

# 或者重启终端
```

### Q3: 编译时间太长

首次编译 Rust 需要 5-10 分钟，这是正常的。后续启动只需几秒钟。

### Q4: 端口 1420 被占用

```bash
# 杀死占用端口的进程
lsof -ti:1420 | xargs kill -9

# 然后重新运行
npm run tauri:dev
```

### Q5: 没有 Xcode Command Line Tools

```bash
# macOS 需要先安装
xcode-select --install

# 然后重新安装 Rust
```

---

## 📊 安装时间估算

| 步骤 | 时间 |
|------|------|
| 下载 Rust 安装器 | 10秒 |
| 安装 Rust 工具链 | 3-5分钟 |
| 首次编译 Tauri 应用 | 5-10分钟 |
| **总计** | **8-15分钟** |

---

## 🎉 安装完成后

第一次运行需要编译，之后:

```bash
# 后续启动只需几秒
cd /Users/imber/Desktop/ai/visual-learn
npm run tauri:dev

# 输出:
#    Finished dev [unoptimized + debuginfo] target(s) in 2.3s
#    Running `target/debug/visual-learn`
```

应用窗口直接打开，无需等待！

---

## 📖 相关文档

- **QUICKSTART.md** - 快速启动指南
- **PROJECT_REPORT.md** - 完整项目报告
- **README.md** - 详细使用说明

---

## 💡 提示

如果你想先看看界面，可以临时运行:

```bash
npm run dev
# 访问 http://localhost:1420
```

但要体验完整功能，**必须安装 Rust 并运行 Tauri 应用**。

---

**现在就安装 Rust，开始使用你的学习进度追踪应用！** 🚀
