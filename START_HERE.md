# 🚀 立即开始使用

## 当前状态

✅ **前端已就绪** - npm 依赖已安装  
❌ **后端需要 Rust** - Tauri 需要 Rust 环境

---

## 两种选择

### 🎯 方案一: 自动安装 (推荐)

运行自动安装脚本，一键完成所有配置：

```bash
cd /Users/imber/Desktop/ai/visual-learn
./install-rust.sh
```

脚本会自动:
1. ✅ 检查 Rust 是否已安装
2. ✅ 如果未安装，自动安装 Rust
3. ✅ 检查 Xcode Command Line Tools
4. ✅ 清理端口占用
5. ✅ 询问是否立即启动应用

**总耗时: 8-15 分钟** (首次)

---

### 🔧 方案二: 手动安装

#### 1. 安装 Rust

```bash
# 安装 Rust (5-10 分钟)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 选择 1 (默认安装)

# 刷新环境
source $HOME/.cargo/env

# 验证
cargo --version
```

#### 2. 启动应用

```bash
cd /Users/imber/Desktop/ai/visual-learn

# 首次运行 (需要编译，5-10 分钟)
npm run tauri:dev
```

---

## 🎨 临时预览 (无需 Rust)

如果你只想先看看界面:

```bash
cd /Users/imber/Desktop/ai/visual-learn
npm run dev

# 浏览器访问: http://localhost:1420
```

**注意**: 这只是前端预览，不包含后端功能。

---

## ⏱️ 时间估算

| 任务 | 首次 | 后续 |
|------|------|------|
| 安装 Rust | 5-10分钟 | - |
| 编译 Tauri | 5-10分钟 | 2-5秒 |
| 启动应用 | - | 2-5秒 |

**首次启动**: 10-20 分钟  
**后续启动**: 2-5 秒 ⚡

---

## ✅ 启动成功标志

应用启动后，你会看到:

### 应用窗口
- 📱 窗口大小: 1200x800
- 📂 左侧: 侧边栏导航
- 📊 右侧: 仪表盘

### 仪表盘内容
- 📈 4个统计卡片
- 🔥 学习热力图
- 📊 3个进度条

### 控制台输出
```
   Finished dev [unoptimized + debuginfo] target(s) in 2.3s
   Running `target/debug/visual-learn`
```

---

## 🐛 遇到问题?

### cargo: command not found
```bash
# 刷新环境变量
source $HOME/.cargo/env

# 或者重启终端
```

### Port 1420 is already in use
```bash
# 清理端口
lsof -ti:1420 | xargs kill -9

# 重新运行
npm run tauri:dev
```

### 编译错误
```bash
# 清理并重新编译
cd src-tauri
cargo clean
cd ..
npm run tauri:dev
```

---

## 📖 详细文档

| 文档 | 说明 |
|------|------|
| `INSTALL_RUST.md` | Rust 安装详细指南 |
| `QUICKSTART.md` | 快速启动指南 |
| `PROJECT_REPORT.md` | 项目完整报告 |
| `README.md` | 使用说明 |

---

## 💡 建议

1. **首次使用**: 运行自动安装脚本 `./install-rust.sh`
2. **遇到问题**: 查看 `INSTALL_RUST.md`
3. **了解项目**: 阅读 `README.md`

---

## 🎯 下一步

```bash
# 1. 运行自动安装脚本
./install-rust.sh

# 2. 等待编译完成

# 3. 开始使用你的学习进度追踪应用！
```

**现在就开始吧！** 🚀
