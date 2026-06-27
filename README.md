# 学习进度追踪器

一个基于 Tauri + React + TypeScript 构建的轻量级桌面学习进度追踪应用。

---

## 🚀 快速开始

### ⚡ 三步启动

```bash
# 1. 进入项目目录
cd /Users/imber/Desktop/ai/visual-learn

# 2. 运行自动安装脚本 (首次需要安装 Rust)
./install-rust.sh

# 3. 等待编译完成，应用自动启动！
```

**首次启动需要 10-20 分钟，之后只需 2-5 秒！**

📖 **详细说明**: 查看 [START_HERE.md](START_HERE.md) 或 [INSTALL_RUST.md](INSTALL_RUST.md)

---

## 📋 项目介绍

这是一个用于追踪个人学习进度的桌面应用,主要功能包括:

- **每日学习记录管理**: 记录每天的学习内容、时长、笔记链接
- **学习数据可视化**: 学习日历热力图、进度仪表盘、趋势图表
- **学习路线管理**: 定义和跟踪多个学习路径的完成进度
- **本地数据存储**: 所有数据以 Markdown 和 JSON 格式存储在本地
- **实时文件监听**: 自动检测笔记目录变化并更新统计数据
- **系统集成**: 支持系统托盘、桌面通知、全局快捷键等原生功能

### 技术栈

- **前端框架**: React 18 + TypeScript
- **桌面框架**: Tauri 1.5 (基于 Rust)
- **构建工具**: Vite
- **状态管理**: Zustand
- **路由**: React Router
- **UI样式**: CSS Modules

### 为什么选择 Tauri?

- ✅ 轻量级:打包体积约 10MB (相比 Electron 的 120MB+)
- ✅ 性能优秀:使用系统 WebView,内存占用低
- ✅ 安全性高:Rust 后端提供更好的安全保障
- ✅ 原生体验:支持系统托盘、通知、文件系统等原生功能

## 🚀 安装依赖步骤

### 前置要求

在开始之前,请确保已安装以下环境:

1. **Node.js** (版本 16+ 推荐)
   ```bash
   # 使用 nvm 安装 (推荐)
   nvm install 18
   nvm use 18
   
   # 或者从官网下载: https://nodejs.org/
   ```

2. **Rust** (Tauri 依赖)
   ```bash
   # macOS/Linux
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   
   # Windows
   # 从 https://rustup.rs/ 下载安装
   ```

3. **系统依赖** (macOS)
   ```bash
   xcode-select --install
   ```

### 安装项目依赖

```bash
# 克隆或进入项目目录
cd /Users/imber/Desktop/ai/visual-learn

# 安装前端依赖
npm install

# Tauri 会自动处理 Rust 依赖
```

### 依赖说明

项目主要依赖包括:

- `@tauri-apps/api`: Tauri 前端 API
- `react`, `react-dom`: React 框架
- `react-router-dom`: 路由管理
- `zustand`: 轻量级状态管理

## 💻 开发运行

### 启动开发服务器

```bash
npm install && npm run tauri dev
```

这个命令会:
1. 安装所有 npm 依赖包
2. 启动 Vite 开发服务器 (默认端口 1420)
3. 编译 Rust 后端代码
4. 启动 Tauri 应用窗口

### 开发模式特性

- **热重载**: 修改前端代码(`.tsx`, `.css`)会自动刷新
- **实时日志**: 控制台会显示前端和 Rust 后端的日志
- **DevTools**: 按 `F12` 打开浏览器开发者工具

### 常用开发命令

```bash
# 仅启动前端开发服务器 (不启动 Tauri)
npm run dev

# 类型检查
npm run build  # TypeScript 会在构建时检查类型
```

## 📦 构建打包

### 构建生产版本

```bash
npm run tauri build
```

这个命令会:
1. 构建优化后的前端资源
2. 编译 Release 版本的 Rust 代码
3. 生成平台特定的安装包

### 构建产物位置

构建完成后,安装包位于:

```
src-tauri/target/release/bundle/
├── dmg/              # macOS 磁盘镜像 (.dmg)
├── macos/            # macOS 应用包 (.app)
├── msi/              # Windows 安装包 (.msi)
└── appimage/         # Linux 应用镜像
```

### 平台说明

- **macOS**: 生成 `.dmg` 和 `.app` 文件
- **Windows**: 生成 `.msi` 安装包
- **Linux**: 生成 `.AppImage` 或 `.deb` 包

### 构建选项

```bash
# 仅构建前端 (用于测试)
npm run build

# 构建特定平台
npm run tauri build -- --target x86_64-apple-darwin   # macOS Intel
npm run tauri build -- --target aarch64-apple-darwin  # macOS Apple Silicon
```

## ✨ 功能说明

### 1. 每日学习记录

- **记录内容**: 记录每天学习的主题、时长、笔记链接
- **学习统计**: 自动计算总学习时长、完成任务数
- **状态追踪**: 标记学习状态(良好/一般/需改进)
- **问题记录**: 记录遇到的问题和解决方案

### 2. 学习数据可视化

#### 学习日历热力图
- GitHub 风格的热力图,直观展示每日学习频率
- 颜色深度代表学习时长(0h / 1h以下 / 1-2h / 2-4h / 4h以上)
- 点击日期查看当天详细记录

#### 学习进度仪表盘
- 总学习时长统计
- 连续学习天数追踪
- 知识点完成数量
- 本周学习时长

#### 学习趋势图
- 最近 7 天/30 天学习时长趋势
- 各领域投入时间占比
- 学习效率分析

### 3. 学习路线管理

- **多路线支持**: 同时管理多个学习路径(如 Python后端、AI编程、Agent开发)
- **阶段划分**: 每个路线分为多个学习阶段
- **进度追踪**: 实时显示各阶段完成百分比
- **任务清单**: 清晰列出已完成、进行中、待学习的任务

### 4. 笔记库管理

- **自动扫描**: 自动扫描指定目录的 Markdown 笔记文件
- **分类管理**: 按目录结构自动分类(后端/AI/Agent等)
- **快速检索**: 支持按文件名、分类搜索
- **一键打开**: 点击笔记链接直接用系统编辑器打开

### 5. 知识树可视化

- **层级展示**: 树状图展示知识体系结构
- **掌握程度**: 用星级标记各知识点掌握情况(1-5星)
- **状态标识**: 区分已完成/学习中/待学习状态
- **关联笔记**: 每个知识点关联对应的学习笔记

### 6. 系统集成功能 (计划中)

- **系统托盘**: 常驻系统托盘,显示今日学习时长
- **桌面通知**: 学习提醒、目标达成通知
- **全局快捷键**: `Cmd+Shift+L` 快速打开记录窗口
- **文件监听**: 实时监听笔记目录变化,自动更新数据

## 📁 项目结构

```
visual-learn/
├── src/                          # 前端源码 (React + TypeScript)
│   ├── components/               # 可复用组件
│   │   ├── charts/              # 图表组件(热力图、进度条、趋势图)
│   │   └── layout/              # 布局组件(侧边栏、头部)
│   ├── pages/                    # 页面组件
│   │   ├── Dashboard.tsx        # 主仪表盘
│   │   ├── DailyLog.tsx         # 每日记录页
│   │   └── Settings.tsx         # 设置页
│   ├── stores/                   # Zustand 状态管理
│   │   ├── dailyStore.ts        # 每日记录状态
│   │   ├── statisticsStore.ts   # 统计数据状态
│   │   └── settingsStore.ts     # 设置状态
│   ├── hooks/                    # 自定义 React Hooks
│   │   └── useTauriCommand.ts   # Tauri 命令封装
│   ├── types/                    # TypeScript 类型定义
│   │   ├── daily-log.ts         # 每日记录类型
│   │   ├── roadmap.ts           # 学习路线类型
│   │   └── statistics.ts        # 统计数据类型
│   ├── App.tsx                   # 应用根组件
│   └── main.tsx                  # 前端入口
│
├── src-tauri/                    # Tauri 后端 (Rust)
│   ├── src/
│   │   ├── main.rs              # Rust 主程序入口
│   │   └── commands/            # Tauri Commands (前端调用的 API)
│   ├── Cargo.toml               # Rust 依赖配置
│   ├── tauri.conf.json          # Tauri 应用配置
│   └── icons/                   # 应用图标
│
├── data/                         # 数据存储目录
│   ├── daily/                   # 每日学习记录 (Markdown)
│   │   └── 2026/
│   │       └── 06/
│   │           └── 2026-06-12.md
│   ├── roadmaps/                # 学习路线图 (Markdown)
│   │   ├── backend-python.md
│   │   └── ai-programming.md
│   └── knowledge-base/          # 知识库索引 (JSON)
│       └── backend.json
│
├── public/                       # 静态资源
├── package.json                  # 前端依赖配置
├── tsconfig.json                 # TypeScript 配置
├── vite.config.ts                # Vite 构建配置
└── README.md                     # 本文件
```

## 🔧 配置说明

### Tauri 配置 (`src-tauri/tauri.conf.json`)

关键配置项:

```json
{
  "package": {
    "productName": "visual-learn",  // 应用名称
    "version": "0.0.1"                // 版本号
  },
  "tauri": {
    "allowlist": {
      "shell": {
        "open": true                  // 允许打开外部链接/文件
      }
    },
    "windows": [{
      "title": "学习进度追踪器",      // 窗口标题
      "width": 800,                   // 窗口宽度
      "height": 600                   // 窗口高度
    }]
  }
}
```

### Vite 配置 (`vite.config.ts`)

Vite 构建工具配置,包含:
- React 插件配置
- 开发服务器端口 (默认 1420)
- 构建优化选项

## 📝 数据格式

### 每日学习记录格式

位置: `data/daily/2026/06/2026-06-12.md`

```markdown
---
date: 2026-06-12
dayOfWeek: 星期四
totalMinutes: 180
tags: [python, agent, database]
mood: 😊
---

# 2026年6月12日 学习记录

## ✅ 今日完成

### 🐍 Python后端 (90分钟)
- **学习内容**: NumPy数组操作与切片
- **笔记链接**: [NumPy基础](/path/to/note.md)
- **掌握程度**: ⭐⭐⭐⭐☆ (4/5)

## 📌 今日遇到的问题

1. **问题**: NumPy广播机制理解不清
   - **解决方案**: 查阅官方文档
   - **状态**: ✅ 已解决

## 🎯 明日计划

- [ ] 学习Pandas数据处理 (90分钟)
- [ ] 完成Agent工具调用实战 (60分钟)
```

### 学习路线图格式

位置: `data/roadmaps/backend-python.md`

```markdown
---
roadmap: Python后端开发
category: 后端
startDate: 2026-06-01
targetDate: 2026-09-01
progress: 35
status: in-progress
---

# Python后端开发学习路线

## 📊 整体进度: 35%

### 阶段一: Python基础 ✅ (100%)
- [x] Python环境配置
- [x] 数据类型与变量
- [x] 控制流程

### 阶段二: Python进阶 🔄 (60%)
- [x] 函数与模块
- [ ] 装饰器 (学习中)
- [ ] 并发编程
```

## 🛠️ 开发指南

### 添加新页面

1. 在 `src/pages/` 创建新组件:
```tsx
// src/pages/NewPage.tsx
export default function NewPage() {
  return <div>新页面内容</div>
}
```

2. 在 `src/App.tsx` 添加路由:
```tsx
<Route path="/new-page" element={<NewPage />} />
```

### 添加 Tauri 命令

1. 在 `src-tauri/src/main.rs` 定义 Rust 函数:
```rust
#[tauri::command]
fn my_command(param: String) -> String {
    format!("Hello, {}!", param)
}
```

2. 在前端调用:
```typescript
import { invoke } from '@tauri-apps/api/tauri'

const result = await invoke('my_command', { param: 'World' })
```

### 状态管理

使用 Zustand 管理全局状态:

```typescript
// src/stores/myStore.ts
import { create } from 'zustand'

interface MyStore {
  count: number
  increment: () => void
}

export const useMyStore = create<MyStore>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 }))
}))
```

## 🐛 常见问题

### 1. 启动失败: `error: no such subcommand: 'tauri'`

**原因**: Tauri CLI 未正确安装

**解决方案**:
```bash
npm install @tauri-apps/cli --save-dev
# 或全局安装
npm install -g @tauri-apps/cli
```

### 2. Rust 编译错误

**原因**: Rust 工具链未安装或版本过低

**解决方案**:
```bash
# 安装/更新 Rust
rustup update

# 验证版本
rustc --version  # 应该显示 1.70+
```

### 3. 开发模式窗口白屏

**原因**: Vite 开发服务器未启动

**解决方案**:
- 检查端口 1420 是否被占用
- 查看终端是否有错误日志
- 尝试单独启动前端: `npm run dev`

### 4. 构建失败: Missing dependencies

**原因**: 系统依赖未安装 (仅 macOS/Linux)

**解决方案**:
```bash
# macOS
xcode-select --install

# Ubuntu/Debian
sudo apt install libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```

## 📚 参考资源

- [Tauri 官方文档](https://tauri.app/)
- [React 官方文档](https://react.dev/)
- [Vite 官方文档](https://vitejs.dev/)
- [TypeScript 官方文档](https://www.typescriptlang.org/)
- [Zustand 状态管理](https://github.com/pmndrs/zustand)

## 📄 许可证

MIT License

## 👤 作者

Imber

---

**开始使用**: `npm install && npm run tauri dev`

如有问题或建议,欢迎提出 Issue!
