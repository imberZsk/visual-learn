# 📁 项目结构说明

## 🌲 完整目录树

```
visual-learn/
│
├── 📄 文档文件 (9份)
│   ├── START_HERE.md           ⭐ 从这里开始
│   ├── README.md               📖 项目主文档
│   ├── INSTALL_RUST.md         🔧 Rust安装指南
│   ├── TROUBLESHOOTING.md      🐛 故障排除
│   ├── QUICKSTART.md           ⚡ 快速启动
│   ├── PROJECT_REPORT.md       📊 项目报告
│   ├── DELIVERY_CHECKLIST.md   ✅ 验收清单
│   ├── FINAL_REPORT.md         🎉 最终报告
│   └── 学习进度追踪方案.md      📐 设计方案
│
├── 🔨 工具脚本
│   └── install-rust.sh         🚀 自动安装脚本 (可执行)
│
├── 📦 配置文件 (8个)
│   ├── package.json            npm依赖和脚本
│   ├── package-lock.json       依赖锁定文件
│   ├── tsconfig.json           TypeScript配置
│   ├── tsconfig.node.json      Node TypeScript配置
│   ├── vite.config.ts          Vite构建配置
│   ├── .gitignore              Git忽略规则
│   └── index.html              HTML入口
│
├── 🦀 Rust 后端 (src-tauri/)
│   ├── src/
│   │   ├── main.rs             ⭐ Rust入口
│   │   │
│   │   ├── models/             数据模型 (4个文件)
│   │   │   ├── mod.rs          模块导出
│   │   │   ├── daily_log.rs   每日记录模型
│   │   │   ├── roadmap.rs      学习路线模型
│   │   │   └── statistics.rs  统计数据模型
│   │   │
│   │   ├── commands/           Tauri命令 (5个文件)
│   │   │   ├── mod.rs          命令导出
│   │   │   ├── daily_log.rs   每日记录命令
│   │   │   ├── file_scanner.rs 文件扫描命令
│   │   │   ├── statistics.rs   统计分析命令
│   │   │   └── notes.rs        笔记操作命令
│   │   │
│   │   └── utils/              工具函数 (2个文件)
│   │       ├── mod.rs          工具导出
│   │       └── markdown_parser.rs Markdown解析器
│   │
│   ├── Cargo.toml              Rust依赖配置
│   ├── build.rs                构建脚本
│   ├── tauri.conf.json         Tauri应用配置
│   └── icons/                  应用图标
│
├── ⚛️ React 前端 (src/)
│   ├── main.tsx                ⭐ 前端入口
│   ├── App.tsx                 ⭐ 根组件
│   ├── App.css                 应用样式
│   ├── index.css               全局样式
│   │
│   ├── types/                  类型定义 (4个文件)
│   │   ├── index.ts            类型导出
│   │   ├── daily-log.ts        每日记录类型
│   │   ├── roadmap.ts          学习路线类型
│   │   └── statistics.ts       统计数据类型
│   │
│   ├── hooks/                  自定义Hooks (3个文件)
│   │   ├── useTauriCommand.ts  Tauri命令封装
│   │   ├── useFileWatcher.ts   文件监听Hook
│   │   └── useStatistics.ts    统计数据Hook
│   │
│   ├── stores/                 状态管理 (3个文件)
│   │   ├── dailyStore.ts       每日记录状态
│   │   ├── statisticsStore.ts  统计数据状态
│   │   └── settingsStore.ts    设置状态
│   │
│   ├── pages/                  页面组件 (3个文件)
│   │   ├── Dashboard.tsx       ⭐ 仪表盘页面
│   │   ├── DailyLog.tsx        每日记录页面
│   │   └── Settings.tsx        设置页面
│   │
│   ├── components/             可复用组件
│   │   ├── layout/             布局组件 (2个)
│   │   │   ├── Sidebar.tsx     侧边栏
│   │   │   └── Header.tsx      头部
│   │   │
│   │   └── charts/             图表组件 (2个)
│   │       ├── HeatmapCalendar.tsx 热力图
│   │       └── ProgressBar.tsx     进度条
│   │
│   └── assets/                 静态资源
│
├── 📊 数据目录 (data/)
│   ├── daily/                  每日学习记录
│   │   └── 2026/
│   │       └── 06/
│   │           ├── 2026-06-06.md  示例记录1
│   │           ├── 2026-06-07.md  示例记录2
│   │           ├── 2026-06-08.md  示例记录3
│   │           ├── 2026-06-09.md  示例记录4
│   │           ├── 2026-06-10.md  示例记录5
│   │           ├── 2026-06-11.md  示例记录6
│   │           └── 2026-06-12.md  示例记录7
│   │
│   └── roadmaps/               学习路线图
│       ├── backend-python.md   Python后端路线
│       └── ai-programming.md   AI编程路线
│
├── 📦 依赖目录 (自动生成)
│   └── node_modules/           npm依赖包 (252个)
│
└── 🏗️ 构建目录 (自动生成)
    └── src-tauri/target/       Rust编译产物
```

---

## 📊 文件统计

| 类别 | 数量 | 说明 |
|------|------|------|
| 文档 | 9 | Markdown格式 |
| Rust源码 | 13 | .rs文件 |
| TypeScript/TSX | 21 | 前端代码 |
| 配置文件 | 8 | JSON/TS配置 |
| 数据文件 | 9 | Markdown格式 |
| 脚本文件 | 1 | Shell脚本 |
| **总计** | **61** | 不含依赖 |

---

## 🎯 核心文件说明

### 📄 必读文档

| 文件 | 用途 | 何时查看 |
|------|------|----------|
| `START_HERE.md` | 快速开始 | ⭐ 第一次使用 |
| `INSTALL_RUST.md` | Rust安装 | 启动失败时 |
| `TROUBLESHOOTING.md` | 故障排除 | 遇到问题时 |
| `README.md` | 完整说明 | 深入了解时 |

### 🔑 关键源文件

#### Rust 后端
- `src-tauri/src/main.rs` - Rust 入口，注册所有命令
- `src-tauri/src/commands/` - 5个 Tauri 命令实现
- `src-tauri/src/models/` - 3个数据模型定义

#### React 前端
- `src/main.tsx` - 前端入口，配置 Ant Design
- `src/App.tsx` - 根组件，配置路由
- `src/pages/Dashboard.tsx` - 主仪表盘页面

### ⚙️ 配置文件

| 文件 | 用途 |
|------|------|
| `package.json` | npm 依赖和脚本 |
| `Cargo.toml` | Rust 依赖 |
| `tauri.conf.json` | Tauri 应用配置 |
| `tsconfig.json` | TypeScript 配置 |
| `vite.config.ts` | Vite 构建配置 |

---

## 🔍 目录功能说明

### src-tauri/ (Rust 后端)
```
功能: Tauri 应用的 Rust 后端
职责:
  - 文件系统访问
  - Markdown 解析
  - 数据统计计算
  - 系统集成功能
```

### src/ (React 前端)
```
功能: Tauri 应用的 React 前端
职责:
  - UI 界面渲染
  - 用户交互处理
  - 状态管理
  - 路由导航
```

### data/ (数据目录)
```
功能: 存储学习数据
格式: Markdown + YAML frontmatter
位置: 项目根目录
```

### node_modules/ (npm 依赖)
```
功能: 前端依赖包
数量: 252 个包
大小: ~200MB
自动生成: npm install
```

### src-tauri/target/ (Rust 构建)
```
功能: Rust 编译产物
大小: ~500MB (debug 模式)
自动生成: cargo build
首次编译: 5-10 分钟
```

---

## 🚀 关键路径

### 启动流程
```
1. npm run tauri:dev
   ↓
2. 启动 Vite 开发服务器 (端口 1420)
   ↓
3. 编译 Rust 后端 (首次需要 5-10 分钟)
   ↓
4. 启动 Tauri 应用窗口
   ↓
5. 加载 React 前端 (http://localhost:1420)
```

### 数据流
```
用户操作
   ↓
React 前端 (调用 Tauri Command)
   ↓
Rust 后端 (处理文件系统操作)
   ↓
data/ 目录 (读取/写入 Markdown)
   ↓
返回数据给前端
   ↓
更新 UI 显示
```

---

## 📦 依赖关系

### 前端依赖 (主要)
```
React 18
  ├─ react-dom
  ├─ react-router-dom
  ├─ zustand
  ├─ antd
  └─ @ant-design/icons

构建工具
  ├─ vite
  ├─ typescript
  └─ @vitejs/plugin-react

Tauri API
  └─ @tauri-apps/api
```

### 后端依赖 (主要)
```
tauri = "1.5"
  ├─ features: ["shell-open", "fs-all", "path-all"]

serde = "1.0"
  └─ features: ["derive"]

其他
  ├─ serde_json
  ├─ serde_yaml
  ├─ chrono
  └─ uuid
```

---

## 💡 快速定位

### 修改 UI
- 编辑 `src/pages/Dashboard.tsx`
- 编辑 `src/components/`

### 修改数据处理
- 编辑 `src-tauri/src/commands/`
- 编辑 `src-tauri/src/models/`

### 添加新功能
1. Rust: 在 `src-tauri/src/commands/` 添加命令
2. React: 在 `src/hooks/` 添加 Hook
3. 在 `src/pages/` 添加页面

### 修改配置
- 窗口: `src-tauri/tauri.conf.json`
- 路由: `src/App.tsx`
- 依赖: `package.json` 或 `Cargo.toml`

---

**查看完整源代码，了解实现细节！** 📚
