import {
  expect,
  type Locator,
  type Page,
  type TestInfo,
} from '@playwright/test'
import { learnTest } from './helpers/electronApp'

// capturePage 截取当前 Electron 页面并作为测试附件保留，供 UI 人工验收。
async function capturePage(
  page: Page,
  testInfo: TestInfo,
  screenshotName: string
): Promise<void> {
  // screenshotPath 存储当前页面截图在 Playwright 用例输出目录中的路径。
  const screenshotPath = testInfo.outputPath(`${screenshotName}.png`)
  await page.screenshot({ path: screenshotPath, animations: 'disabled' })
  await testInfo.attach(screenshotName, {
    path: screenshotPath,
    contentType: 'image/png',
  })
}

// assertStableLayout 验证页面没有文档级横向溢出，主内容仍位于视口中。
async function assertStableLayout(page: Page): Promise<void> {
  // layoutMetrics 存储文档与主内容几何信息，用于发现截图之外的溢出。
  const layoutMetrics = await page.evaluate(() => {
    // mainContent 存储应用主内容容器。
    const mainContent = document.querySelector<HTMLElement>('main')
    // mainBounds 存储主内容相对视口的位置和尺寸。
    const mainBounds = mainContent?.getBoundingClientRect()
    // overflowingElements 存储仍参与布局且超出右侧视口的元素摘要，便于定位隐藏浮层等根因。
    const overflowingElements = [...document.querySelectorAll<HTMLElement>('*')]
      .map((element) => {
        // bounds 存储当前元素相对视口的真实几何边界。
        const bounds = element.getBoundingClientRect()
        // style 存储当前元素的最终展示与可见性状态。
        const style = getComputedStyle(element)
        return {
          tag: element.tagName.toLowerCase(),
          className: element.className.toString().slice(0, 120),
          left: Math.round(bounds.left),
          right: Math.round(bounds.right),
          display: style.display,
          visibility: style.visibility,
        }
      })
      .filter(
        (item) =>
          item.display !== 'none' &&
          item.visibility !== 'hidden' &&
          item.right > document.documentElement.clientWidth + 1
      )
      .slice(0, 8)
    return {
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      mainLeft: mainBounds?.left ?? -1,
      mainRight: mainBounds?.right ?? -1,
      overflowingElements,
    }
  })

  expect(
    layoutMetrics.scrollWidth,
    JSON.stringify(layoutMetrics.overflowingElements)
  ).toBe(layoutMetrics.clientWidth)
  expect(layoutMetrics.mainLeft).toBeGreaterThanOrEqual(0)
  expect(layoutMetrics.mainRight).toBeLessThanOrEqual(layoutMetrics.clientWidth)
}

// readButtonDensity 读取可见 Ant Design 按钮的最终高度、字号和横向内边距。
// button 参数存储需要验收的按钮定位器。
async function readButtonDensity(button: Locator) {
  return button.evaluate((element) => {
    // style 存储浏览器计算后的最终按钮样式。
    const style = getComputedStyle(element)
    return {
      height: Number.parseFloat(style.height),
      fontSize: Number.parseFloat(style.fontSize),
      paddingLeft: Number.parseFloat(style.paddingLeft),
      paddingRight: Number.parseFloat(style.paddingRight),
    }
  })
}

learnTest(
  '关键学习工作区生成 UI 验收截图',
  {},
  async (page, _paths, testInfo) => {
    await expect(page.locator('.app-brand img')).toHaveCount(0)
    await assertStableLayout(page)
    await capturePage(page, testInfo, 'dashboard-dark')

    await page.getByText('学习资料', { exact: true }).click()
    await page.getByPlaceholder('搜索学习项...').waitFor()
    await assertStableLayout(page)
    await capturePage(page, testInfo, 'notes-empty-dark')

    await page
      .getByRole('treeitem', { name: /^caret-right folder 前端/ })
      .click()
    await page
      .getByRole('treeitem', { name: /^caret-right book React 0\/2/ })
      .click()
    await page.getByText('01-基础', { exact: true }).click()
    await page.getByRole('heading', { name: 'React 基础' }).waitFor()
    await assertStableLayout(page)
    await capturePage(page, testInfo, 'article-dark')

    await page
      .locator('header button')
      .filter({ has: page.locator('.anticon-setting') })
      .click()
    await expect(page.getByRole('dialog', { name: '设置' })).toBeVisible()
    // regularDensity 存储设置抽屉常规保存按钮的真实密度。
    const regularDensity = await readButtonDensity(
      page
        .getByRole('dialog', { name: '设置' })
        .getByRole('button', { name: '保存' })
    )
    expect(regularDensity).toEqual({
      height: 32,
      fontSize: 14,
      paddingLeft: 15,
      paddingRight: 15,
    })
    // smallDensity 存储顶栏小号图标按钮的真实高度和字号。
    const smallDensity = await readButtonDensity(
      page
        .locator('header button')
        .filter({ has: page.locator('.anticon-setting') })
    )
    expect(smallDensity.height).toBe(24)
    expect(smallDensity.fontSize).toBe(16)
    await capturePage(page, testInfo, 'settings-dark')
    await page.locator('.ant-drawer-close').click()
    await expect(page.getByRole('dialog', { name: '设置' })).toHaveCount(0)

    await page
      .locator('header button')
      .filter({ has: page.locator('.anticon-sun') })
      .click()
    await page.getByText('学习概览', { exact: true }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await assertStableLayout(page)
    await capturePage(page, testInfo, 'dashboard-light')

    await page.setViewportSize({ width: 960, height: 700 })
    await assertStableLayout(page)
    await capturePage(page, testInfo, 'dashboard-narrow-light')
  }
)
