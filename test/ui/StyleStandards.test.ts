import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'

// readSource 读取项目内源码，供样式边界静态回归测试复用。
function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

describe('Visual Learn 样式边界', () => {
  test('业务组件不使用固定行内样式', () => {
    // componentSources 存储除阅读页动态定位例外外的业务组件源码。
    const componentSources = [
      'src/App.tsx',
      'src/components/layout/Header.tsx',
      'src/components/charts/HeatmapCalendar.tsx',
      'src/components/charts/ProgressBar.tsx',
      'src/pages/DailyLog.tsx',
      'src/pages/Dashboard.tsx',
      'src/pages/Settings.tsx',
    ].map(readSource)

    for (const componentSource of componentSources) {
      expect(componentSource).not.toMatch(/\bstyle\s*=/)
      expect(componentSource).not.toMatch(/\bstyles\s*=/)
    }
  })

  test('阅读页只保留选区坐标的运行时行内样式', () => {
    // notesSource 存储阅读页源码，用于限制行内样式例外数量和用途。
    const notesSource = readSource('src/pages/NotesLibrary.tsx')
    // inlineStyles 存储阅读页的所有 style 属性，只允许标注浮层的一处。
    const inlineStyles = notesSource.match(/\bstyle\s*=/g) ?? []

    expect(inlineStyles).toHaveLength(1)
    expect(notesSource).toContain('left: annotationToolbar.left')
    expect(notesSource).toContain('top: annotationToolbar.top')
  })

  test('主要页面样式使用语义变量', () => {
    // componentCss 存储当前实际工作区的样式文本。
    const componentCss = [
      'src/components/layout/Header.css',
      'src/components/charts/Charts.css',
      'src/pages/DailyLog.css',
      'src/pages/Dashboard.css',
      'src/pages/Settings.css',
    ]
      .map(readSource)
      .join('\n')

    expect(componentCss).toContain('var(--vl-accent)')
    expect(componentCss).toContain('var(--vl-border)')
    expect(componentCss).not.toMatch(/#[0-9a-f]{3,8}\b/i)
  })

  test('字体与标题图标遵循桌面工作台尺寸', () => {
    // indexCss 存储全局字体定义，确保中文和西文界面使用同一系统字体栈。
    const indexCss = readSource('src/index.css')
    // mainSource 存储 Ant Design 主题入口，确保组件库不会回退到另一套字体。
    const mainSource = readSource('src/main.tsx')
    // dashboardCss 存储概览标题尺寸，防止页面标题和图标被重新放大。
    const dashboardCss = readSource('src/pages/Dashboard.css')

    expect(indexCss).toContain("'PingFang SC'")
    expect(indexCss).toContain("'Microsoft YaHei'")
    expect(mainSource).toContain('fontFamily: APP_FONT_FAMILY')
    expect(dashboardCss).toMatch(
      /\.compact-page-title\.ant-typography\s*\{[\s\S]*font-size: 20px/
    )
    expect(dashboardCss).toMatch(
      /\.compact-page-title \.anticon\s*\{[\s\S]*font-size: 18px/
    )
  })

  test('按钮密度与 Visual Worktree 的 Ant Design 默认尺寸一致', () => {
    // mainSource 存储 Ant Design 全局控件高度配置。
    const mainSource = readSource('src/main.tsx')
    // appCss 存储跨页按钮规则，用于阻止 min-height 覆盖 small 尺寸。
    const appCss = readSource('src/App.css')

    expect(mainSource).toContain('controlHeight: 32')
    expect(appCss).not.toMatch(/\.ant-btn[^{]*\{[^}]*min-height:/)
  })

  test('颜色使用 Visual Worktree 的 Ant Design seed 和算法派生结果', () => {
    // mainSource 存储主题入口，用于防止按主题重新硬编码主色。
    const mainSource = readSource('src/main.tsx')
    // indexCss 存储业务语义色，确保暗色交互色与算法一致。
    const indexCss = readSource('src/index.css')
    // indexHtml 存储 React 挂载前的启动颜色。
    const indexHtml = readSource('index.html')

    expect(mainSource).toContain("colorPrimary: '#1677ff'")
    expect(mainSource).not.toContain("isDark ? '#4096ff'")
    expect(indexCss).toContain('--vl-accent: 22 104 220')
    expect(indexHtml).toContain('--startup-spinner-color: #1668dc')
  })
})
