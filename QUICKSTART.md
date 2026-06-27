# 快速启动指南 ⚡

## 1️⃣ 安装 Rust (必需)

在终端执行:

```bash
# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 按提示选择默认安装 (选项 1)

# 安装完成后，重启终端或执行:
source $HOME/.cargo/env

# 验证安装
rustc --version
cargo --version
```

预计需要 **5-10 分钟**

---

## 2️⃣ 运行应用

```bash
# 进入项目目录
cd /Users/imber/Desktop/ai/visual-learn

# 启动应用 (首次启动会编译 Rust，需要 5-10 分钟)
npm run tauri:dev
```

---

## 3️⃣ 验证功能

启动成功后，你会看到:

### ✅ 应用窗口
- 窗口大小: 1200x800
- 左侧边栏: 导航菜单
- 右侧: 主内容区

### ✅ 仪表盘页面
- **统计卡片**: 总学习天数、连续打卡、本周学习、完成目标
- **学习热力图**: GitHub 风格的日历热力图
- **学习进度**: Python后端、AI编程、Agent 进度条

### ✅ 每日记录页面
- 日期选择器
- 学习记录列表 (2026-06-06 ~ 2026-06-12)
- Markdown 内容预览

---

## 🐛 遇到问题?

### Rust 安装失败
```bash
# macOS 需要 Xcode Command Line Tools
xcode-select --install

# 然后重新安装 Rust
```

### 编译错误
```bash
cd /Users/imber/Desktop/ai/visual-learn/src-tauri
cargo clean
cargo build
```

### 端口占用
```bash
# 杀死占用 1420 端口的进程
lsof -ti:1420 | xargs kill

# 然后重新运行
npm run tauri:dev
```

---

## 📦 打包应用

开发完成后:

```bash
npm run tauri:build

# 应用位置:
# src-tauri/target/release/bundle/macos/visual-learn.app
```

双击即可安装到 Applications 文件夹!

---

## 🎯 下一步

1. ✅ 安装 Rust
2. ✅ 启动应用
3. ✅ 验证功能
4. 🎨 优化界面
5. 📝 添加真实数据

**遇到任何问题，查看 PROJECT_REPORT.md 详细文档!**
