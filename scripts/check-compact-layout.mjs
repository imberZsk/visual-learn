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
// headerCss 存储头部样式，用于检查头部高度和横向内边距。
const headerCss = readProjectFile('src/components/layout/Header.css')
// notesCss 存储学习资料页样式，用于检查视口高度计算和阅读区密度
const notesCss = readProjectFile('src/pages/NotesLibrary.css')
// dashboardCss 存储概览页样式，用于检查统计带和工作区网格。
const dashboardCss = readProjectFile('src/pages/Dashboard.css')
// settingsCss 存储设置页样式，用于检查页面标题和卡片间距
const settingsCss = readProjectFile('src/pages/Settings.css')

expectIncludes(
  appContent,
  'className="app-shell"',
  '应用应使用统一视口外壳，将滚动交给页面工作区。'
)
expectIncludes(
  headerCss,
  'height: 56px;',
  '头部应使用稳定的 56px 产品导航高度。'
)
expectIncludes(
  headerCss,
  'padding: 0 24px;',
  '头部应使用 24px 横向内边距对齐产品与全局操作。'
)
expectIncludes(notesCss, 'height: 100%;', '学习资料页应填满应用主工作区。')
expectIncludes(
  notesCss,
  'width: clamp(264px, 24vw, 320px);',
  '学习目录应控制在 264-320px，避免挤压阅读区。'
)
expectIncludes(
  dashboardCss,
  'grid-template-columns: repeat(4, minmax(0, 1fr));',
  '概览统计应使用统一四列摘要带。'
)
expectIncludes(
  dashboardCss,
  'grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);',
  '概览主工作区应并排总进度与学科列表。'
)
expectIncludes(
  settingsCss,
  'margin-bottom: 8px;',
  '设置标签与路径控件应使用 8px 标准间距。'
)

console.log('compact layout checks passed')
