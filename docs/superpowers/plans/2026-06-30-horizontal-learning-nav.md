# 顶部横向学习导航实现计划

> **给自动化执行者：** 实现本计划时需使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans`，并按任务逐项推进。步骤使用复选框语法便于跟踪。

**目标：** 将「学习概览」和「学习资料」移动到顶部横向导航，移除左侧侧边栏。

**架构：** `Header` 负责顶部品牌、横向导航和右侧工具按钮；`App` 只负责单列布局和路由。路由路径保持 `/dashboard` 与 `/notes` 不变。

**技术栈：** React 18、TypeScript、React Router、Ant Design 5、Vite。

## 全局约束

交流、注释、文档统一使用中文。

函数/方法必须添加注释说明用途和关键参数含义。

变量必须添加注释说明该变量用来存储什么数据。

项目没有测试框架和 lint 配置，完成后运行 `npm run build`。

---

### 任务 1：顶部横向导航

**文件：**
- 修改：`src/App.tsx`
- 修改：`src/components/layout/Header.tsx`
- 修改：`src/App.css`

**接口：**
- 消费：React Router 的 `useLocation`、`useNavigate`
- 产出：顶部 `Segmented` 导航，保持 `/dashboard` 与 `/notes` 路由可访问

- [ ] **步骤 1：移除侧边栏布局**

在 `src/App.tsx` 删除 `Sidebar` 引入和渲染，保留顶部 `Header` 与 `Content`。

- [ ] **步骤 2：增加 Header 横向导航**

在 `src/components/layout/Header.tsx` 增加 `Segmented`，根据当前 pathname 选中 `/dashboard` 或 `/notes`，切换时调用 `navigate`。

- [ ] **步骤 3：调整内容区样式**

在 `src/App.css` 删除移动端 `.ant-layout-sider` 固定定位规则，保留内容区高度和紧凑留白。

- [ ] **步骤 4：构建验证**

运行：`npm run build`

期望：TypeScript 编译和 Vite 构建均成功。
