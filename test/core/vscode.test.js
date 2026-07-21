import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

// execMock 存储 child_process.exec 的替身，用于捕获命令并控制回调结果。
const execMock = vi.fn()
// existsSyncMock 存储 fs.existsSync 的替身，用于控制 VSCode CLI 兜底路径是否存在。
const existsSyncMock = vi.fn()

// 用替身拦截真实子进程与文件系统，避免测试真正启动 VSCode。
vi.mock('node:child_process', () => ({
  exec: (command, callback) => execMock(command, callback),
}))
vi.mock('node:fs', () => ({
  existsSync: (path) => existsSyncMock(path),
}))

// 动态导入被测模块，确保上面的 mock 已生效。
const { buildVscodeCommand, openInVscode } =
  await import('../../src/core/vscode.js')

describe('buildVscodeCommand', () => {
  /**
   * 验证默认模板会注入新窗口参数并给路径加引号。
   */
  test('默认模板注入 -n 新窗口参数并引用路径', () => {
    // command 存储构建出的最终命令字符串。
    const command = buildVscodeCommand('/tmp/学习 目录')
    expect(command).toBe('code -n "/tmp/学习 目录"')
  })

  /**
   * 验证已含 --reuse-window 时不再注入新窗口参数。
   */
  test('模板已含 reuse-window 时不再注入新窗口参数', () => {
    // command 存储构建出的最终命令字符串。
    const command = buildVscodeCommand('/tmp/a', 'code --reuse-window {path}')
    expect(command).toBe('code --reuse-window "/tmp/a"')
  })

  /**
   * 验证非 code 命令的模板不注入新窗口参数，且无 {path} 时把路径追加到末尾。
   */
  test('非 code 命令且无 path 占位符时追加路径到末尾', () => {
    // command 存储构建出的最终命令字符串。
    const command = buildVscodeCommand('/tmp/a', 'cursor')
    expect(command).toBe('cursor "/tmp/a"')
  })

  /**
   * 验证纯空白模板 trim 后为空字符串，不注入 code 参数，路径直接追加到末尾。
   * 注意 '   ' 本身是 truthy，不会走 `|| 'code {path}'` 兜底，trim 后变成空串。
   */
  test('纯空白模板 trim 后为空串并把路径追加到末尾', () => {
    // command 存储构建出的最终命令字符串。
    const command = buildVscodeCommand('/tmp/a', '   ')
    expect(command).toBe(' "/tmp/a"')
  })

  /**
   * 验证传入 null 模板时走 `|| 'code {path}'` 兜底到默认命令。
   */
  test('null 模板走默认 code 命令兜底', () => {
    // command 存储构建出的最终命令字符串。
    const command = buildVscodeCommand('/tmp/a', null)
    expect(command).toBe('code -n "/tmp/a"')
  })
})

describe('openInVscode', () => {
  beforeEach(() => {
    execMock.mockReset()
    existsSyncMock.mockReset()
  })
  afterEach(() => {
    vi.clearAllMocks()
  })

  /**
   * 验证首次 exec 成功时直接返回 success。
   */
  test('主命令执行成功直接返回 success', async () => {
    execMock.mockImplementationOnce((_command, callback) => callback(null))
    // result 存储打开操作结果。
    const result = await openInVscode('/tmp/a')
    expect(result).toEqual({ success: true })
    expect(execMock).toHaveBeenCalledTimes(1)
  })

  /**
   * 验证主命令失败后走 CLI 兜底路径并成功。
   */
  test('主命令失败后走存在的 CLI 兜底路径成功', async () => {
    // 第一次主命令失败，第二次兜底 CLI 成功。
    execMock
      .mockImplementationOnce((_command, callback) =>
        callback(new Error('fail'))
      )
      .mockImplementationOnce((_command, callback) => callback(null))
    // 让第一个候选 CLI 路径存在。
    existsSyncMock.mockReturnValue(true)

    // result 存储打开操作结果。
    const result = await openInVscode('/tmp/a')
    expect(result).toEqual({ success: true })
    // 第二次命令应使用兜底 CLI 路径。
    expect(execMock.mock.calls[1][0]).toContain('/usr/local/bin/code')
  })

  /**
   * 验证 CLI 兜底路径存在但执行仍失败时返回错误。
   */
  test('CLI 兜底路径执行失败返回错误信息', async () => {
    execMock
      .mockImplementationOnce((_command, callback) =>
        callback(new Error('fail'))
      )
      .mockImplementationOnce((_command, callback) =>
        callback(new Error('fail again'))
      )
    existsSyncMock.mockReturnValue(true)

    // result 存储打开操作结果。
    const result = await openInVscode('/tmp/a')
    expect(result).toEqual({
      success: false,
      error: '未找到 VSCode，请确认已安装',
    })
  })

  /**
   * 验证无 CLI 兜底路径时走 macOS open 命令并成功。
   */
  test('无 CLI 路径时走 open -a 兜底成功', async () => {
    execMock
      .mockImplementationOnce((_command, callback) =>
        callback(new Error('fail'))
      )
      .mockImplementationOnce((_command, callback) => callback(null))
    // 所有候选 CLI 路径都不存在。
    existsSyncMock.mockReturnValue(false)

    // result 存储打开操作结果。
    const result = await openInVscode('/tmp/a')
    expect(result).toEqual({ success: true })
    expect(execMock.mock.calls[1][0]).toContain('open -a "Visual Studio Code"')
  })

  /**
   * 验证无 CLI 路径且 open 命令失败时返回错误。
   */
  test('无 CLI 路径且 open 命令失败返回错误信息', async () => {
    execMock
      .mockImplementationOnce((_command, callback) =>
        callback(new Error('fail'))
      )
      .mockImplementationOnce((_command, callback) =>
        callback(new Error('open fail'))
      )
    existsSyncMock.mockReturnValue(false)

    // result 存储打开操作结果。
    const result = await openInVscode('/tmp/a')
    expect(result).toEqual({
      success: false,
      error: '未找到 VSCode，请确认已安装',
    })
  })
})
