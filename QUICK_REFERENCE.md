# 🚀 快速参考卡

## 一、立即开始 (3步)

```bash
cd /Users/imber/Desktop/ai/visual-learn
./install-rust.sh
# 等待编译完成，应用自动启动！
```

---

## 二、文档导航

| 文档 | 用途 | 推荐度 |
|------|------|--------|
| **START_HERE.md** | 快速开始 | ⭐⭐⭐⭐⭐ |
| **INSTALL_RUST.md** | Rust安装详解 | ⭐⭐⭐⭐⭐ |
| **TROUBLESHOOTING.md** | 故障排除 | ⭐⭐⭐⭐ |
| **README.md** | 完整说明 | ⭐⭐⭐ |
| **PROJECT_STRUCTURE.md** | 项目结构 | ⭐⭐⭐ |
| **FINAL_REPORT.md** | 最终报告 | ⭐⭐ |

---

## 三、常用命令

### 启动应用
```bash
npm run tauri:dev      # 完整应用（需要 Rust）
npm run dev            # 仅前端预览（无需 Rust）
```

### 开发构建
```bash
npm run build          # 构建前端
npm run tauri:build    # 打包桌面应用
```

### 问题排查
```bash
cargo --version        # 检查 Rust
cargo clean            # 清理 Rust 缓存
lsof -ti:1420 | xargs kill -9  # 清理端口
```

---

## 四、快速故障排除

| 错误 | 原因 | 解决 |
|------|------|------|
| `cargo: command not found` | Rust未安装 | `./install-rust.sh` |
| `Port 1420 is already in use` | 端口占用 | `lsof -ti:1420 \| xargs kill -9` |
| 编译时间过长 | 正常现象 | 首次需要5-10分钟 |
| 窗口不显示 | 编译失败 | 查看终端错误信息 |

---

## 五、项目统计

- **总文件数**: 62 个
- **代码行数**: 4,100+ 行  
- **文档数量**: 10 份
- **首次启动**: 10-20 分钟
- **后续启动**: 2-5 秒

---

## 六、核心功能

✅ 仪表盘 - 统计卡片、热力图、进度条  
✅ 每日记录 - Markdown 格式学习日志  
✅ 学习路线 - 多路径进度追踪  
✅ 数据可视化 - ECharts 图表  
✅ 本地存储 - 无需云服务

---

## 七、技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Tauri 1.5 |
| 后端语言 | Rust |
| 前端框架 | React 18 + TypeScript |
| UI组件 | Ant Design |
| 状态管理 | Zustand |
| 构建工具 | Vite |

---

## 八、目录速查

```
visual-learn/
├── START_HERE.md       ⭐ 从这里开始
├── install-rust.sh     🚀 自动安装脚本
├── src-tauri/          🦀 Rust 后端（13个文件）
├── src/                ⚛️  React 前端（21个文件）
├── data/               📊 学习数据（9个示例）
└── 文档/                📖 10份完整文档
```

---

## 九、下一步行动

### 今天
1. ✅ 阅读 `START_HERE.md`
2. ✅ 运行 `./install-rust.sh`
3. ✅ 等待首次编译
4. ✅ 验证应用功能

### 本周
1. 📝 添加真实学习数据
2. 🎨 熟悉界面操作
3. 📊 查看统计数据
4. 🔧 自定义配置

### 本月
1. 💡 优化工作流程
2. 📈 分析学习趋势
3. 🎯 设置学习目标
4. 🚀 探索高级功能

---

## 十、技术支持

### 遇到问题？
1. 查看 `TROUBLESHOOTING.md`
2. 阅读 `INSTALL_RUST.md`
3. 参考 `README.md`

### 需要帮助？
- 查看项目文档
- 检查终端错误信息
- 运行环境诊断脚本

---

## 快速诊断脚本

```bash
echo "=== 环境检查 ==="
echo "Node: $(node --version)"
echo "npm: $(npm --version)"
echo "Rust: $(rustc --version 2>&1 || echo '未安装')"
echo "Cargo: $(cargo --version 2>&1 || echo '未安装')"
echo "端口1420: $(lsof -ti:1420 2>&1 || echo '未占用')"
```

---

**保存此文档，随时查阅！** 📌
