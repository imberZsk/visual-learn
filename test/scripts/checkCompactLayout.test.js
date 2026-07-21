import { afterEach, describe, expect, test, vi } from 'vitest'

// consoleLogMock 存储 console.log 替身，用于断言脚本通过时的输出。
const consoleLogMock = vi.fn()

describe('check-compact-layout 静态布局校验', () => {
  afterEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    vi.doUnmock('node:fs')
  })

  /**
   * 验证所有期望片段都存在时脚本正常通过并打印成功日志。
   * 用 mock 让 readFileSync 返回包含全部断言片段的文本，避免依赖真实源码当前形态。
   */
  test('全部片段存在时校验通过', async () => {
    // allFragments 存储脚本会断言的全部片段，拼进同一段文本让任意文件读取都命中。
    const allFragments = [
      'className="app-content"',
      'height: 48',
      'width={176}',
      "height: 'calc(100% - 48px)'",
      'height: calc(100vh - 96px);',
      'padding: 0 28px;',
      'className="dashboard-page"',
      'gutter={[12, 12]}',
      'margin-bottom: 12px !important;',
    ].join('\n')

    // 拦截文件读取，返回覆盖所有断言片段的假内容。
    vi.doMock('node:fs', () => ({
      readFileSync: () => allFragments,
    }))

    vi.stubGlobal('console', { ...console, log: consoleLogMock })
    vi.resetModules()
    await import('../../scripts/check-compact-layout.mjs')

    expect(consoleLogMock).toHaveBeenCalledWith('compact layout checks passed')
  })

  /**
   * 验证缺少片段时脚本抛出错误，覆盖 expectIncludes 失败分支。
   */
  test('缺少片段时抛出错误', async () => {
    // 返回空内容，任何断言都会失败。
    vi.doMock('node:fs', () => ({
      readFileSync: () => '',
    }))

    vi.resetModules()
    // 首个断言失败即抛错，导入应 reject。
    await expect(
      import('../../scripts/check-compact-layout.mjs')
    ).rejects.toThrow('主内容区应使用统一的紧凑布局')
  })
})
