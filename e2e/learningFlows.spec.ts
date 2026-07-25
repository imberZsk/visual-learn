import { expect, type Page } from '@playwright/test'
import { learnTest } from './helpers/electronApp'

/** openNotes 进入资料页并等待真实目录扫描完成。 */
async function openNotes(page: Page) {
  await page.getByText('学习资料', { exact: true }).click()
  await page.getByPlaceholder('搜索学习项...').waitFor()
}

/** expandReactTree 按用户操作展开前端分组和 React 学科。 */
async function expandReactTree(page: Page) {
  await page.getByRole('treeitem', { name: /^caret-right folder 前端/ }).click()
  await page
    .getByRole('treeitem', { name: /^caret-right book React 0\/2/ })
    .click()
}

/** openFirstArticle 打开资料页中的第一篇测试文章。 */
async function openFirstArticle(page: Page) {
  await openNotes(page)
  await expandReactTree(page)
  await page.getByText('01-基础', { exact: true }).click()
  await page.getByRole('heading', { name: 'React 基础' }).waitFor()
}

learnTest('概览展示真实扫描后的四项统计', {}, async (page) => {
  await expect(page.getByText('学科分类')).toBeVisible()
  await expect(page.getByText('学习总篇数')).toBeVisible()
  await expect(page.getByText('已完成', { exact: true })).toBeVisible()
  await expect(page.getByText('完成率')).toBeVisible()
})

learnTest('概览展示临时学习目录路径', {}, async (page, paths) => {
  await expect(page.getByText(paths.studyPath, { exact: true })).toBeVisible()
})

learnTest('概览展示真实分组与学科', {}, async (page) => {
  await expect(page.getByText('前端', { exact: true })).toBeVisible()
  await expect(page.getByText('React', { exact: true })).toBeVisible()
})

learnTest('概览学科入口跳转并打开第一篇文章', {}, async (page) => {
  await page.getByTitle('查看 React 的学习内容').click()
  await expect(page).toHaveURL(/#\/notes/)
  await expect(page.locator('.article-title')).toHaveText('01-基础')
})

learnTest('顶部导航可在概览与资料页往返', {}, async (page) => {
  await openNotes(page)
  await page.getByText('学习概览', { exact: true }).click()
  await expect(page.getByText('总体学习进度')).toBeVisible()
})

learnTest('资料页初始提示选择文章', {}, async (page) => {
  await openNotes(page)
  await expect(page.getByText('选择左侧一篇学习内容开始阅读')).toBeVisible()
})

learnTest('资料树展示三级目录和两篇文章', {}, async (page) => {
  await openNotes(page)
  await expect(page.getByText('前端', { exact: true })).toBeVisible()
  await expandReactTree(page)
  await expect(page.getByText('React', { exact: true })).toBeVisible()
  await expect(page.getByText('01-基础', { exact: true })).toBeVisible()
  await expect(page.getByText('02-进阶', { exact: true }).first()).toBeVisible()
})

learnTest('搜索命中时只展示匹配文章', {}, async (page) => {
  await openNotes(page)
  await page.getByPlaceholder('搜索学习项...').fill('进阶')
  await page.locator('.ant-tree-switcher').first().click()
  await page.locator('.ant-tree-switcher').nth(1).click()
  await expect(page.getByText('02-进阶', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('01-基础', { exact: true })).toHaveCount(0)
})

learnTest('搜索无结果时展示明确空状态', {}, async (page) => {
  await openNotes(page)
  await page.getByPlaceholder('搜索学习项...').fill('不存在文章')
  await expect(page.getByText('没有匹配的学习项')).toBeVisible()
})

learnTest('点击文章渲染 Markdown 正文', {}, async (page) => {
  await openFirstArticle(page)
  await expect(page.getByText('这是第一篇文章。')).toBeVisible()
})

learnTest('文章标题生成右侧目录', {}, async (page) => {
  await openFirstArticle(page)
  await expect(page.locator('.toc-list').getByText('React 基础')).toBeVisible()
})

learnTest('下一篇按钮切换到第二篇文章', {}, async (page) => {
  await openFirstArticle(page)
  await page.getByRole('button', { name: /下一篇.*02-进阶/ }).click()
  await expect(page.getByRole('heading', { name: 'React 进阶' })).toBeVisible()
})

learnTest('上一篇按钮切回第一篇文章', {}, async (page) => {
  await openNotes(page)
  await expandReactTree(page)
  await page.getByText('02-进阶', { exact: true }).click()
  await page.getByRole('button', { name: /上一篇.*01-基础/ }).click()
  await expect(page.getByRole('heading', { name: 'React 基础' })).toBeVisible()
})

learnTest('完成复选框更新文章完成状态', {}, async (page) => {
  await openNotes(page)
  await expandReactTree(page)
  const itemRow = page
    .locator('.nav-tree-title--item')
    .filter({ hasText: '01-基础' })
    .first()
  await itemRow.getByRole('checkbox').click()
  await expect(itemRow.getByRole('checkbox')).toBeChecked()
  await expect(itemRow.getByText('01-基础', { exact: true })).toHaveCSS(
    'text-decoration-line',
    'line-through'
  )
})

learnTest('折叠目录后阅读区保持可用', {}, async (page) => {
  await openFirstArticle(page)
  await page.locator('.notes-toolbar button').first().click()
  await expect(page.locator('.notes-nav-panel')).toHaveCount(0)
  await expect(page.getByText('这是第一篇文章。')).toBeVisible()
})

learnTest('沉浸阅读隐藏工具栏和目录', {}, async (page) => {
  await openFirstArticle(page)
  await page.getByRole('button', { name: /沉浸阅读/ }).click()
  await expect(page.locator('.notes-toolbar')).toHaveCount(0)
  await expect(page.locator('.notes-nav-panel')).toHaveCount(0)
})

learnTest('沉浸阅读可以退出', {}, async (page) => {
  await openFirstArticle(page)
  await page.getByRole('button', { name: /沉浸阅读/ }).click()
  await page.getByRole('button', { name: /退出/ }).click()
  await expect(page.locator('.notes-toolbar')).toBeVisible()
})

learnTest('Markdown 代码块展示语言和复制入口', {}, async (page) => {
  await openFirstArticle(page)
  await expect(page.getByText('console.log("learn")')).toBeVisible()
  await expect(page.locator('.code-block').getByRole('button')).toBeVisible()
})

learnTest('文章总结可创建并展示', {}, async (page) => {
  await openFirstArticle(page)
  await page.getByRole('button', { name: /写总结/ }).click()
  await page
    .getByPlaceholder('用自己的话讲给别人听：这篇文章到底在说什么？')
    .fill('React 总结内容')
  await page.getByRole('button', { name: /保存总结/ }).click()
  await expect(page.locator('.article-summary-content')).toHaveText(
    'React 总结内容'
  )
})

learnTest('文章总结可编辑更新', {}, async (page) => {
  await openFirstArticle(page)
  await page.getByRole('button', { name: /写总结/ }).click()
  const editor = page.getByPlaceholder(
    '用自己的话讲给别人听：这篇文章到底在说什么？'
  )
  await editor.fill('旧总结')
  await page.getByRole('button', { name: /保存总结/ }).click()
  await page.getByRole('button', { name: /编辑总结/ }).click()
  await editor.fill('新总结')
  await page.getByRole('button', { name: /保存总结/ }).click()
  await expect(page.locator('.article-summary-content')).toHaveText('新总结')
})

learnTest('主题按钮切换并持久化根节点', {}, async (page) => {
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page
    .locator('header button')
    .filter({ has: page.locator('.anticon-sun') })
    .click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

learnTest('设置抽屉回显路径并可保存有效目录', {}, async (page, paths) => {
  await page
    .locator('header button')
    .filter({ has: page.locator('.anticon-setting') })
    .click()
  await expect(
    page.getByPlaceholder('请输入或选择文章内容目录路径')
  ).toHaveValue(paths.studyPath)
  await page.getByRole('button', { name: /保存$/ }).click()
  await expect(page.getByText('保存成功')).toBeVisible()
})
