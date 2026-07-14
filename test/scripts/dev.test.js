import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

// spawnMock 存储 child_process.spawn 的替身。
const spawnMock = vi.fn()
// findAvailablePortMock 存储端口探测函数替身。
const findAvailablePortMock = vi.fn()
// isTcpPortInUseMock 存储端口占用探测函数替身，用于模拟 Vite 就绪。
const isTcpPortInUseMock = vi.fn()

// 拦截真实 spawn，避免启动 Vite/Electron 进程。
vi.mock('node:child_process', () => ({
  spawn: (...args) => spawnMock(...args),
}))

// 拦截端口工具，避免真实网络探测导致测试变慢或不稳定。
vi.mock('../../scripts/dev-port.mjs', async (importOriginal) => {
  // actual 存储原始模块，保留 buildDevServerUrl/buildViteArgs 等纯函数实现。
  const actual = await importOriginal()
  return {
    ...actual,
    findAvailablePort: (...args) => findAvailablePortMock(...args),
    isTcpPortInUse: (...args) => isTcpPortInUseMock(...args),
  }
})

// 动态导入被测模块，确保 mock 已生效。
const { startViteDev, startElectronDev, main } =
  await import('../../scripts/dev.mjs')

/**
 * 创建带 kill 方法的假子进程。
 * @returns {EventEmitter & {kill: Function}} 假子进程实例。
 */
function createFakeChild() {
  // child 存储假子进程。
  const child = new EventEmitter()
  child.kill = vi.fn()
  return child
}

describe('dev startViteDev / startElectronDev', () => {
  beforeEach(() => {
    spawnMock.mockReset()
  })

  /**
   * 验证启动 Vite 时传入 host/port 参数。
   */
  test('startViteDev 使用 host/port 启动 Vite', () => {
    spawnMock.mockReturnValue(createFakeChild())
    startViteDev('127.0.0.1', 5273)
    // spawn 参数应含 --host 与 --port。
    expect(spawnMock.mock.calls[0][1]).toEqual(
      expect.arrayContaining(['--host', '--port', '5273'])
    )
  })

  /**
   * 验证启动 Electron 时注入渲染进程 URL 环境变量。
   */
  test('startElectronDev 注入 renderer URL 环境变量', () => {
    spawnMock.mockReturnValue(createFakeChild())
    startElectronDev('http://127.0.0.1:5273')
    // spawn 第三个参数的 env 应携带 ELECTRON_RENDERER_URL。
    expect(spawnMock.mock.calls[0][2].env.ELECTRON_RENDERER_URL).toBe(
      'http://127.0.0.1:5273'
    )
  })
})

describe('dev main', () => {
  // originalEnv 存储原始环境变量快照。
  let originalEnv

  beforeEach(() => {
    spawnMock.mockReset()
    findAvailablePortMock.mockReset()
    isTcpPortInUseMock.mockReset()
    originalEnv = { ...process.env }
    delete process.env.VITE_HOST
    delete process.env.VITE_PORT
  })

  afterEach(() => {
    process.env = originalEnv
  })

  /**
   * 验证完整启动流程：探测端口 -> 等待 Vite 就绪 -> 启动 Electron -> 透传退出码 -> 收尾杀 Vite。
   */
  test('完整流程返回 Electron 退出码并终止 Vite', async () => {
    // 端口从默认 5273 顺延到 5274，覆盖“端口被占用”提示分支。
    findAvailablePortMock.mockResolvedValue(5274)
    // 首次探测即返回就绪，跳过等待循环。
    isTcpPortInUseMock.mockResolvedValue(true)

    // viteChild 存储假 Vite 子进程。
    const viteChild = createFakeChild()
    // electronChild 存储假 Electron 子进程。
    const electronChild = createFakeChild()
    // 第一次 spawn 返回 Vite，第二次返回 Electron。
    spawnMock.mockReturnValueOnce(viteChild).mockReturnValueOnce(electronChild)

    // promise 存储 main 执行结果。
    const promise = main()
    // 等待微任务，确保 waitForVite 与 Electron 监听已注册。
    await new Promise((resolve) => setTimeout(resolve, 0))
    electronChild.emit('exit', 0, null)

    expect(await promise).toBe(0)
    // 收尾应终止 Vite 子进程。
    expect(viteChild.kill).toHaveBeenCalledWith('SIGTERM')
  })

  /**
   * 验证 Electron 被信号终止时退出码按 1 处理。
   */
  test('Electron 被信号终止时退出码按 1 处理', async () => {
    findAvailablePortMock.mockResolvedValue(5273)
    isTcpPortInUseMock.mockResolvedValue(true)

    // viteChild 存储假 Vite 子进程。
    const viteChild = createFakeChild()
    // electronChild 存储假 Electron 子进程。
    const electronChild = createFakeChild()
    spawnMock.mockReturnValueOnce(viteChild).mockReturnValueOnce(electronChild)

    // promise 存储 main 执行结果。
    const promise = main()
    await new Promise((resolve) => setTimeout(resolve, 0))
    electronChild.emit('exit', null, 'SIGKILL')

    expect(await promise).toBe(1)
  })

  /**
   * 验证 waitForVite 在端口首次未就绪时会重试等待（覆盖轮询等待分支）。
   */
  test('Vite 端口首次未就绪时轮询等待后再启动 Electron', async () => {
    findAvailablePortMock.mockResolvedValue(5273)
    // 第一次探测未就绪，第二次就绪，触发 setTimeout 等待分支。
    isTcpPortInUseMock.mockResolvedValueOnce(false).mockResolvedValue(true)

    // viteChild 存储假 Vite 子进程。
    const viteChild = createFakeChild()
    // electronChild 存储假 Electron 子进程。
    const electronChild = createFakeChild()
    spawnMock.mockReturnValueOnce(viteChild).mockReturnValueOnce(electronChild)

    // promise 存储 main 执行结果。
    const promise = main()
    // 等待轮询（150ms 间隔）后 Electron 启动。
    while (spawnMock.mock.calls.length < 2) {
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
    electronChild.emit('exit', 0, null)

    expect(await promise).toBe(0)
    // 至少探测两次端口。
    expect(isTcpPortInUseMock.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  /**
   * 验证 Electron 启动 error 时 reject，且仍会终止 Vite。
   */
  test('Electron error 事件导致 reject 并终止 Vite', async () => {
    findAvailablePortMock.mockResolvedValue(5273)
    isTcpPortInUseMock.mockResolvedValue(true)

    // viteChild 存储假 Vite 子进程。
    const viteChild = createFakeChild()
    // electronChild 存储假 Electron 子进程。
    const electronChild = createFakeChild()
    spawnMock.mockReturnValueOnce(viteChild).mockReturnValueOnce(electronChild)

    // promise 存储 main 执行结果。
    const promise = main()
    await new Promise((resolve) => setTimeout(resolve, 0))
    electronChild.emit('error', new Error('electron 崩溃'))

    await expect(promise).rejects.toThrow('electron 崩溃')
    expect(viteChild.kill).toHaveBeenCalledWith('SIGTERM')
  })
})
