import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'

describe('NotesLibrary 左侧目录布局', () => {
  /**
   * 验证左侧目录给文章标题保留足够宽度，并允许长标题换行展示。
   */
  test('文章标题在左侧目录中保持可读', () => {
    // cssPath 存储学习资料页样式文件路径。
    const cssPath = join(process.cwd(), 'src/pages/NotesLibrary.css')
    // css 存储学习资料页样式文本，便于校验关键布局约束。
    const css = readFileSync(cssPath, 'utf8')

    expect(css).toContain('width: clamp(320px, 28vw, 420px)')
    expect(css).toMatch(/\.nav-item-name\s*\{[\s\S]*white-space: normal/)
    expect(css).toMatch(/\.notes-nav-tree \.ant-tree-indent-unit\s*\{[\s\S]*width: 10px/)
  })

  /**
   * 验证左侧目录的总结标识与打开代码按钮使用一致的垂直居中尺寸。
   */
  test('文章总结标识与代码按钮在左侧目录中保持对齐', () => {
    // cssPath 存储学习资料页样式文件路径。
    const cssPath = join(process.cwd(), 'src/pages/NotesLibrary.css')
    // css 存储学习资料页样式文本，便于校验图标对齐约束。
    const css = readFileSync(cssPath, 'utf8')
    // itemRule 存储学习项行容器的 CSS 规则块。
    const itemRule = css.match(/\.nav-tree-title--item\s*\{[^}]*\}/)?.[0] || ''
    // summaryIconRule 存储文章总结标识的 CSS 规则块。
    const summaryIconRule = css.match(/\.nav-item-summary-icon\s*\{[^}]*\}/)?.[0] || ''
    // demoButtonRule 存储打开代码按钮的 CSS 规则块。
    const demoButtonRule = css.match(/\.nav-item-demo\.ant-btn\s*\{[^}]*\}/)?.[0] || ''

    expect(itemRule).toContain('align-items: center')
    expect(summaryIconRule).toContain('display: inline-flex')
    expect(summaryIconRule).toContain('align-items: center')
    expect(summaryIconRule).toContain('justify-content: center')
    expect(summaryIconRule).toContain('width: 22px')
    expect(summaryIconRule).toContain('height: 22px')
    expect(summaryIconRule).toContain('margin-top: 0')
    expect(demoButtonRule).toContain('width: 22px')
    expect(demoButtonRule).toContain('height: 22px')
  })

  /**
   * 验证文章标注交互具备稳定类名，便于高亮、浮层和评论提示保持可见。
   */
  test('文章标注样式包含高亮浮层和评论提示', () => {
    // cssPath 存储学习资料页样式文件路径。
    const cssPath = join(process.cwd(), 'src/pages/NotesLibrary.css')
    // css 存储学习资料页样式文本，便于校验关键标注样式。
    const css = readFileSync(cssPath, 'utf8')

    expect(css).toContain('.annotation-highlight')
    expect(css).toContain('.annotation-toolbar')
    expect(css).toContain('.annotation-comment-dot')
  })

  /**
   * 验证文章标注采用轻量批注风格，避免厚重黄底破坏阅读体验。
   */
  test('文章标注样式接近 Notion 风格的轻量批注', () => {
    // cssPath 存储学习资料页样式文件路径。
    const cssPath = join(process.cwd(), 'src/pages/NotesLibrary.css')
    // css 存储学习资料页样式文本，便于校验标注视觉约束。
    const css = readFileSync(cssPath, 'utf8')

    expect(css).toMatch(/\.annotation-highlight\s*\{[\s\S]*background: rgba\(255, 249, 226, 0\.78\)/)
    expect(css).toMatch(/\.annotation-highlight\s*\{[\s\S]*border-bottom: 1px solid rgba\(202, 138, 4, 0\.32\)/)
    expect(css).toMatch(/\.annotation-highlight\s*\{[\s\S]*box-shadow: none/)
    expect(css).toMatch(/\.annotation-toolbar\s*\{[\s\S]*border-radius: 10px/)
    expect(css).not.toMatch(/\.annotation-highlight\s*\{[\s\S]*inset 0 -0\./)
  })
})
