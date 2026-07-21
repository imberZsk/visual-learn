import { readFileSync } from 'node:fs'

/**
 * 读取仓库内文本文件内容。
 *
 * @param {string} path 文件相对项目根目录的路径。
 * @returns {string} 文件文本内容。
 */
function readProjectFile(path) {
  // content 存储指定文件的完整文本，用于后续静态布局断言
  const content = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
  return content
}

/**
 * 断言文本中包含指定片段。
 *
 * @param {string} content 被检查的文件文本。
 * @param {string} expected 期望出现的文本片段。
 * @param {string} message 断言失败时输出的错误信息。
 */
function expectIncludes(content, expected, message) {
  if (!content.includes(expected)) {
    throw new Error(`${message}\n缺少片段: ${expected}`)
  }
}

// appContent 存储应用根布局组件源码，用于检查外层留白是否收紧
const appContent = readProjectFile('src/App.tsx')
// headerContent 存储头部组件源码，用于检查头部高度和横向内边距
const headerContent = readProjectFile('src/components/layout/Header.tsx')
// sidebarContent 存储侧边栏组件源码，用于检查 Logo 区高度和菜单高度
const sidebarContent = readProjectFile('src/components/layout/Sidebar.tsx')
// notesCss 存储学习资料页样式，用于检查视口高度计算和阅读区密度
const notesCss = readProjectFile('src/pages/NotesLibrary.css')
// dashboardContent 存储概览页源码，用于检查页头和卡片间距
const dashboardContent = readProjectFile('src/pages/Dashboard.tsx')
// settingsCss 存储设置页样式，用于检查页面标题和卡片间距
const settingsCss = readProjectFile('src/pages/Settings.css')

expectIncludes(
  appContent,
  "className=\"app-content\"",
  '主内容区应使用统一的紧凑布局 class，而不是散落的内联大留白。'
)
expectIncludes(
  headerContent,
  'height: 48',
  '头部高度应压缩到 48px，减少顶部占用。'
)
expectIncludes(
  sidebarContent,
  'width={176}',
  '侧边栏宽度应适度压缩到 176px。'
)
expectIncludes(
  sidebarContent,
  "height: 'calc(100% - 48px)'",
  '侧边栏菜单高度应匹配 48px Logo 区。'
)
expectIncludes(
  notesCss,
  'height: calc(100vh - 96px);',
  '学习资料页高度应匹配 48px Header + 24px 内容上下留白 + 24px 内容内边距。'
)
expectIncludes(
  notesCss,
  'padding: 0 28px;',
  '阅读正文横向留白应收紧但保留可读宽度。'
)
expectIncludes(
  dashboardContent,
  'className="dashboard-page"',
  '概览页应使用紧凑页头 class，避免散落内联间距。'
)
expectIncludes(
  dashboardContent,
  'gutter={[12, 12]}',
  '概览页卡片栅格间距应收紧到 12px。'
)
expectIncludes(
  settingsCss,
  'margin-bottom: 12px !important;',
  '设置页标题下方间距应收紧到 12px。'
)

console.log('compact layout checks passed')
