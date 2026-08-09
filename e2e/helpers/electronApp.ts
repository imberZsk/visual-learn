import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  _electron as electron,
  test,
  type ElectronApplication,
  type Page,
  type TestInfo,
} from '@playwright/test'

/** prepareHome 创建包含真实 Markdown 与隔离持久化数据的临时用户目录。 */
async function prepareHome(seed: Record<string, unknown> = {}) {
  // homePath 存储当前用例独占的 HOME。
  const homePath = await mkdtemp(join(tmpdir(), 'visual-learn-e2e-'))
  // studyPath 存储真实扫描使用的学习资料根目录。
  const studyPath = join(homePath, 'study')
  // articleDir 存储测试文章与代码目录。
  const articleDir = join(studyPath, '前端', 'React小册')
  const demoPath = join(studyPath, '前端', 'React-demo', '01-基础')
  const storagePath = join(homePath, '.visualLearn')
  await Promise.all([
    mkdir(articleDir, { recursive: true }),
    mkdir(demoPath, { recursive: true }),
    mkdir(storagePath, { recursive: true }),
  ])
  // firstArticlePath 存储第一篇文章绝对路径。
  const firstArticlePath = join(articleDir, '01-基础.md')
  // secondArticlePath 存储第二篇文章绝对路径。
  const secondArticlePath = join(articleDir, '02-进阶.md')
  await writeFile(
    firstArticlePath,
    '# React 基础\n\n这是第一篇文章。\n\n```js\nconsole.log("learn")\n```\n',
    'utf8'
  )
  await writeFile(
    secondArticlePath,
    '# React 进阶\n\n这是第二篇文章。\n',
    'utf8'
  )
  await writeFile(
    join(storagePath, 'config.json'),
    JSON.stringify({ studyPath, vscodePath: studyPath }),
    'utf8'
  )
  if (seed.progress)
    await writeFile(
      join(storagePath, 'progress.json'),
      JSON.stringify(seed.progress),
      'utf8'
    )
  if (seed.preferences)
    await writeFile(
      join(storagePath, 'preferences.json'),
      JSON.stringify(seed.preferences),
      'utf8'
    )
  if (seed.summaries)
    await writeFile(
      join(storagePath, 'article-summaries.json'),
      JSON.stringify(seed.summaries),
      'utf8'
    )
  return { homePath, studyPath, firstArticlePath, secondArticlePath }
}

/** learnTest 注册一条使用独立临时资料库的 Electron 测试。 */
export function learnTest(
  name: string,
  seed: Record<string, unknown>,
  body: (
    page: Page,
    paths: Awaited<ReturnType<typeof prepareHome>>,
    testInfo: TestInfo,
    app: ElectronApplication
  ) => Promise<void>
) {
  test(name, async ({ browserName }, testInfo) => {
    // Electron 仅使用 Chromium 渲染，阻止测试配置误扩展到其他浏览器。
    test.skip(browserName !== 'chromium', 'Electron E2E 仅支持 Chromium')
    // paths 存储当前用例临时路径集合。
    const paths = await prepareHome(seed)
    // app 存储当前用例真实 Electron 进程。
    const app = await electron.launch({
      args: ['.'],
      env: {
        ...process.env,
        HOME: paths.homePath,
        NODE_ENV: 'production',
        VL_E2E: '1',
      },
    })
    try {
      // page 存储 Electron 主窗口。
      const page = await app.firstWindow()
      await page.getByText('Visual Learn', { exact: true }).waitFor()
      await body(page, paths, testInfo, app)
    } finally {
      await app.close()
      await rm(paths.homePath, { recursive: true, force: true })
    }
  })
}
