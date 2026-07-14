import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

// spawnMock 存储 child_process.spawn 的替身，用于捕获调用并返回假子进程。
const spawnMock = vi.fn()

// 拦截真实 spawn，避免测试真正启动 Vite 进程。
vi.mock('node:child_process', () => ({
  spawn: (...args) => spawnMock(...args),
}))

// 动态导入被测模块，确保 mock 已生效。
const { startVite, main } = await import('../../scripts/vite-dev.mjs')

/**
 * 创建带 kill 方法的假子进程，便于测试触发 exit/error 事件。
 * @returns {EventEmitter & {kill: Function}} 假子进程实例。
 */
function createFakeChild() {
  // child 存储假子进程，用事件发射器模拟 spawn 返回值。
  const child = new EventEmitter()
  child.kill = vi.fn()
  return child
}

describe('vite-dev startVite', () => {
  beforeEach(() => {
    spawnMock.mockReset()
  })

  /**
   * 验证子进程正常退出时透传退出码。
   */
  test('子进程正常退出返回退出码', async () => {
    // child 存储假 Vite 子进程。
    const child = createFakeChild()
    spawnMock.mockReturnValue(child)
    // promise 存储 startVite 的执行结果。
    const promise = startVite(['--open'])
    child.emit('exit', 3, null)
    expect(await promise).toBe(3)
  })

  /**
   * 验证子进程被信号终止时按退出码 1 处理。
   */
  test('子进程被信号终止时退出码按 1 处理', async () => {
    // child 存储假 Vite 子进程。
    const child = createFakeChild()
    spawnMock.mockReturnValue(child)
    // promise 存储 startVite 的执行结果。
    const promise = startVite([])
    child.emit('exit', null, 'SIGTERM')
    expect(await promise).toBe(1)
  })

  /**
   * 验证子进程报错时 reject。
   */
  test('子进程 error 事件导致 reject', async () => {
    // child 存储假 Vite 子进程。
    const child = createFakeChild()
    spawnMock.mockReturnValue(child)
    // promise 存储 startVite 的执行结果。
    const promise = startVite([])
    child.emit('error', new Error('spawn 失败'))
    await expect(promise).rejects.toThrow('spawn 失败')
  })
})

describe('vite-dev main', () => {
  // originalArgv 存储原始 process.argv，用于用例后恢复。
  let originalArgv
  // originalEnv 存储原始环境变量快照，用于用例后恢复。
  let originalEnv

  beforeEach(() => {
    spawnMock.mockReset()
    originalArgv = process.argv
    originalEnv = { ...process.env }
    delete process.env.VITE_HOST
    delete process.env.VITE_PORT
  })

  afterEach(() => {
    process.argv = originalArgv
    process.env = originalEnv
  })

  /**
   * 验证显式 --port + --strictPort 时使用精确端口，不做探测。
   */
  test('显式端口且 strictPort 时使用精确端口', async () => {
    process.argv = ['node', 'vite-dev.mjs', '--port', '4321', '--strictPort']
    // child 存储假 Vite 子进程。
    const child = createFakeChild()
    spawnMock.mockReturnValue(child)

    // promise 存储 main 执行结果。
    const promise = main()
    child.emit('exit', 0, null)
    expect(await promise).toBe(0)

    // spawn 参数应包含精确端口 4321。
    expect(spawnMock.mock.calls[0][1]).toEqual(
      expect.arrayContaining(['--port', '4321', '--strictPort'])
    )
  })

  /**
   * 验证未指定端口时从默认端口起动态探测并启动 Vite。
   */
  test('未指定端口时动态探测端口', async () => {
    process.argv = ['node', 'vite-dev.mjs']
    // child 存储假 Vite 子进程。
    const child = createFakeChild()
    spawnMock.mockReturnValue(child)

    // promise 存储 main 执行结果。
    const promise = main()
    // main 会先 await 真实 findAvailablePort（网络探测），需等 spawn 被调用、exit 监听注册后再 emit。
    while (spawnMock.mock.calls.length === 0) {
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
    child.emit('exit', 0, null)
    expect(await promise).toBe(0)
    // 应传入 --host 与 --port 参数。
    expect(spawnMock.mock.calls[0][1]).toEqual(
      expect.arrayContaining(['--host', '--port'])
    )
  })

  /**
   * 验证起始端口被占用、动态顺延到其他端口时打印顺延提示（覆盖 port !== startPort 分支）。
   */
  test('起始端口被占用时打印顺延提示', async () => {
    // 通过环境变量把起始端口设为一个已被自身占用的端口，强制顺延。
    // 用一个真实监听的 server 占住起始端口，触发 findAvailablePort 顺延。
    const net = await import('node:net')
    // server 存储用于占用起始端口的临时 TCP server。
    const server = net.default.createServer()
    // startPort 存储 server 实际监听端口，作为脚本的起始探测端口。
    const startPort = await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve(server.address().port))
    })
    process.env.VITE_PORT = String(startPort)
    process.argv = ['node', 'vite-dev.mjs']

    // logSpy 存储 console.log 替身，用于断言顺延提示。
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    // child 存储假 Vite 子进程。
    const child = createFakeChild()
    spawnMock.mockReturnValue(child)

    // promise 存储 main 执行结果。
    const promise = main()
    while (spawnMock.mock.calls.length === 0) {
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
    child.emit('exit', 0, null)
    await promise

    // 应输出端口顺延提示。
    expect(
      logSpy.mock.calls.some(
        ([msg]) => typeof msg === 'string' && msg.includes('已顺延到')
      )
    ).toBe(true)

    logSpy.mockRestore()
    await new Promise((resolve) => server.close(resolve))
  })
})
