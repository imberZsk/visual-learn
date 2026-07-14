import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

// existsSyncMock 存储 fs.existsSync 替身，用于控制 dist/index.html 是否存在。
const existsSyncMock = vi.fn()
// spawnMock 存储 child_process.spawn 替身，用于返回假 Electron 子进程。
const spawnMock = vi.fn()
// exitMock 存储 process.exit 替身，用于捕获退出码且不真正退出进程。
const exitMock = vi.fn()

// 拦截真实文件系统与子进程，避免真正启动 Electron 冒烟自检。
vi.mock('node:fs', () => ({
  existsSync: (path) => existsSyncMock(path),
}))
vi.mock('node:child_process', () => ({
  spawn: (...args) => spawnMock(...args),
}))

/**
 * 创建带 stdout/stderr 事件流的假 Electron 子进程。
 * @returns {EventEmitter & {stdout: EventEmitter, stderr: EventEmitter, kill: Function}} 假子进程。
 */
function createFakeChild() {
  // child 存储假子进程，用事件发射器模拟退出事件。
  const child = new EventEmitter()
  child.stdout = new EventEmitter()
  child.stderr = new EventEmitter()
  child.kill = vi.fn()
  return child
}

describe('verify-boot 启动自检', () => {
  beforeEach(() => {
    existsSyncMock.mockReset()
    spawnMock.mockReset()
    exitMock.mockReset()
    // 用替身接管 process.exit，避免测试进程被真正结束。
    vi.spyOn(process, 'exit').mockImplementation((code) => exitMock(code))
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
    vi.useRealTimers()
  })

  /**
   * 验证缺少 dist/index.html 时退出码为 2。
   */
  test('缺少 dist/index.html 时 exit 2', async () => {
    existsSyncMock.mockReturnValue(false)
    // dist 不存在时仍会继续执行到 spawn（因 exit 被替身接管不中断），提供假子进程避免报错。
    spawnMock.mockReturnValue(createFakeChild())

    vi.resetModules()
    await import('../../scripts/verify-boot.mjs')
    expect(exitMock).toHaveBeenCalledWith(2)
  })

  /**
   * 验证子进程输出 SMOKE_OK 且正常退出时退出码为 0。
   */
  test('输出 SMOKE_OK 且退出时 exit 0', async () => {
    existsSyncMock.mockReturnValue(true)
    // child 存储假 Electron 子进程。
    const child = createFakeChild()
    spawnMock.mockReturnValue(child)

    vi.resetModules()
    await import('../../scripts/verify-boot.mjs')

    // 模拟 stdout/stderr 输出，覆盖数据回调分支。
    child.stdout.emit('data', Buffer.from('SMOKE_OK preload-api-available\n'))
    child.stderr.emit('data', Buffer.from('warning\n'))
    // 子进程正常退出，触发成功分支。
    child.emit('exit', 0)
    expect(exitMock).toHaveBeenCalledWith(0)
  })

  /**
   * 验证未出现 SMOKE_OK 标记时按子进程退出码失败退出。
   */
  test('未出现 SMOKE_OK 时按退出码失败', async () => {
    existsSyncMock.mockReturnValue(true)
    // child 存储假 Electron 子进程。
    const child = createFakeChild()
    spawnMock.mockReturnValue(child)

    vi.resetModules()
    await import('../../scripts/verify-boot.mjs')

    // 退出码 5 且无 SMOKE_OK，应以 5 退出。
    child.emit('exit', 5)
    expect(exitMock).toHaveBeenCalledWith(5)
  })

  /**
   * 验证退出码为 0 但缺少 SMOKE_OK 标记时兜底退出码为 1。
   */
  test('退出码为空且无 SMOKE_OK 时兜底 exit 1', async () => {
    existsSyncMock.mockReturnValue(true)
    // child 存储假 Electron 子进程。
    const child = createFakeChild()
    spawnMock.mockReturnValue(child)

    vi.resetModules()
    await import('../../scripts/verify-boot.mjs')

    // 退出码 null 且无 SMOKE_OK，应兜底为 1。
    child.emit('exit', null)
    expect(exitMock).toHaveBeenCalledWith(1)
  })

  /**
   * 验证 30s 内未收到成功标记时超时退出码为 3 并杀掉子进程。
   */
  test('超时未收到标记时 exit 3 并 kill 子进程', async () => {
    vi.useFakeTimers()
    existsSyncMock.mockReturnValue(true)
    // child 存储假 Electron 子进程。
    const child = createFakeChild()
    spawnMock.mockReturnValue(child)

    vi.resetModules()
    await import('../../scripts/verify-boot.mjs')

    // 推进假时钟到超时阈值，触发超时保护分支。
    vi.advanceTimersByTime(30000)
    expect(child.kill).toHaveBeenCalledWith('SIGKILL')
    expect(exitMock).toHaveBeenCalledWith(3)
  })
})
