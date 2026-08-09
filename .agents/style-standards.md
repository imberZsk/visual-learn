# 样式规范

## 样式归属

- `src/index.css` 只保留 `--vl-*` 主题语义变量、基础重置、滚动条和真正跨页的全局规则。
- `src/App.css` 只保留应用外壳、跨页 Ant Design 密度与共享 loading 规则。
- 组件或页面专用样式放在相邻 `ComponentName.css` / `PageName.css`，由对应 TSX 显式导入。选择器必须绑定业务根 class，禁止无边界覆盖所有 antd 内部 DOM。
- `src/theme-dark.css` 仅是历史日志页的兼容层；新增或活跃页面不得继续向其中增加深色补丁，应使用 `--vl-*` 变量同时适配明暗主题。
- 字体栈、标题级别、图标尺寸、顶栏和资料树宽度属于设计基础，必须遵循 `ui-standards.md` 的统一数值，页面不得局部复制或覆盖另一套尺寸。

## JSX 行内样式边界

- 业务组件默认禁止 `style={{ ... }}`、`styles={{ ... }}`、`valueStyle={{ ... }}` 和通过 `*Props` 传入固定 style。固定布局、尺寸、间距、字号、颜色、背景、边框、圆角、阴影和滚动规则必须进入相邻 CSS。
- `width: "100%"`、`marginBottom: 0` 和 `color: token.colorTextSecondary` 同样属于固定视觉规则，不能因代码短就留在 JSX。
- antd 的 `block`、`danger`、`type`、`size`、`status`、`Typography type` 和语义 `Tag color` 属于组件 API，可以使用。
- 唯一已批准例外是 `NotesLibrary` 中由用户文字选区实时计算的标注工具条 `left/top`。其他运行时几何值必须先证明无法用 class/CSS 自定义属性表达，并注释数据来源，不得夹带固定间距或颜色。

## 颜色与覆盖

- `src/main.tsx` 集中定义 Ant Design 运行时 token，CSS 集中消费 `src/index.css` 中的语义变量；业务 TSX/CSS 不散落 hex/rgb/hsl 色值。
- 明暗主题必须保持正文、弱化文本、边界、选中态、完成态、代码高亮和标注的可读性，不为某一主题单独写死色值。
- 不把 `!important` 作为默认方案。覆盖 antd 内部结构时必须限定业务根 class，并说明 DOM 或优先级原因。

## 完成前检查

1. 搜索本次组件中的 `style=`、`styles=`、`valueStyle=`、裸色值和非规范布局间距。
2. 确认组件 CSS 已由业务根 class 限定，专用规则没有回流全局 CSS。
3. 运行格式检查、紧凑布局脚本、相关测试、完整测试、类型检查、构建和无头 E2E。
4. 生成概览、资料库、阅读区、设置抽屉的明暗与最小窗口截图，并按 `ui-standards.md` 逐张人工检查。
