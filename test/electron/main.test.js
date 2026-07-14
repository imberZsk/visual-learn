import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

// electronState 存储 electron mock 的可观测状态，供各用例读取与驱动。
const electronState = {
  // whenReadyResolve 存储 app.whenReady Promise 的 resolve，用于手动触发 ready。
  whenReadyResolve: null,
  // appOnHandlers 存储 app.on 注册的生命周期回调，键为事件名。
  appOnHandlers: new Map(),
  // registerIpcArgs 存储 registerIpcHandlers 被调用时的参数。
  registerIpcArgs: null,
  // lastWindow 存储最近一次创建的 BrowserWindow 假实例。
  lastWindow: null,
  // windowOptions 存储创建窗口时传入的选项。
  windowOptions: null,
  // headersCallbackResult 存储 onHeadersReceived 回调产出的响应头。
  headersCallbackResult: null,
  // exitCode 存储 app.exit 被调用时的退出码。
  exitCode: undefined,
  // quitCalled 标记 app.quit 是否被调用。
  quitCalled: false,
  // allWindows 存储 BrowserWindow.getAllWindows 的返回值。
  allWindows: [],
}

/**
 * 创建 BrowserWindow 假实例，模拟 webContents 事件与脚本执行。
 * @returns {object} 假窗口实例。
 */
function createFakeWindow() {
  // webContents 存储假渲染进程内容，用事件发射器模拟加载事件。
  const webContents = new EventEmitter()
  // executeJavaScriptResult 存储 executeJavaScript 的返回值，用例可覆盖。
  webContents.executeJavaScriptResult = true
  webContents.executeJavaScript = vi.fn(
    async () => webContents.executeJavaScriptResult
  )
  return {
    webContents,
    loadURL: vi.fn(),
    loadFile: vi.fn(),
    on: vi.fn(),
  }
}

// 用 mock 拦截 electron 模块，避免真实启动桌面应用。
vi.mock('electron', () => {
  // BrowserWindow 存储窗口构造函数替身；用普通函数以支持 new 调用。
  const BrowserWindow = vi.fn(function BrowserWindowMock(options) {
    electronState.windowOptions = options
    // win 存储本次创建的假窗口。
    const win = createFakeWindow()
    electronState.lastWindow = win
    return win
  })
  // getAllWindows 返回受控窗口列表，用于 activate 分支。
  BrowserWindow.getAllWindows = () => electronState.allWindows

  return {
    app: {
      whenReady: () =>
        new Promise((resolve) => {
          electronState.whenReadyResolve = resolve
        }),
      on: (event, handler) => {
        electronState.appOnHandlers.set(event, handler)
      },
      exit: (code) => {
        electronState.exitCode = code
      },
      quit: () => {
        electronState.quitCalled = true
      },
    },
    BrowserWindow,
    dialog: { showOpenDialog: vi.fn() },
    ipcMain: { handle: vi.fn() },
    session: {
      defaultSession: {
        webRequest: {
          onHeadersReceived: (callback) => {
            // 立即用假 details 调用，捕获注入的 CSP 响应头。
            callback({ responseHeaders: { 'X-Existing': ['1'] } }, (result) => {
              electronState.headersCallbackResult = result
            })
          },
        },
      },
    },
  }
})

// 拦截 ipcHandlers，避免真实注册，同时记录参数。
vi.mock('../../electron/ipcHandlers.js', () => ({
  registerIpcHandlers: (ipcMain, deps) => {
    electronState.registerIpcArgs = { ipcMain, deps }
  },
}))

/**
 * 重置 electron mock 状态并按给定环境重新导入 main.js。
 * @param {{isDev?: boolean, isSmoke?: boolean}} env - 控制开发/冒烟模式的环境。
 * @returns {Promise<void>} 导入完成后 resolve。
 */
async function loadMain(env = {}) {
  electronState.whenReadyResolve = null
  electronState.appOnHandlers = new Map()
  electronState.registerIpcArgs = null
  electronState.lastWindow = null
  electronState.windowOptions = null
  electronState.headersCallbackResult = null
  electronState.exitCode = undefined
  electronState.quitCalled = false
  electronState.allWindows = []

  // 通过环境变量控制 main.js 内部的 isDev / isSmoke 分支。
  process.env.NODE_ENV = env.isDev ? 'development' : 'production'
  if (env.isSmoke) {
    process.env.VL_SMOKE = '1'
  } else {
    delete process.env.VL_SMOKE
  }

  vi.resetModules()
  await import('../../electron/main.js')
}

describe('electron/main 生命周期', () => {
  // originalEnv 存储原始环境变量快照。
  let originalEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.clearAllMocks()
  })

  /**
   * 验证导入即注册 IPC handler。
   */
  test('导入时注册 IPC handler 并注入 dialog', async () => {
    await loadMain({ isDev: false })
    expect(electronState.registerIpcArgs).not.toBeNull()
    expect(electronState.registerIpcArgs.deps.dialog).toBeDefined()
  })

  /**
   * 验证生产环境 ready 后创建窗口、注入 CSP 并用 loadFile 加载。
   */
  test('生产环境 ready 后 loadFile 加载并注入生产 CSP', async () => {
    await loadMain({ isDev: false })
    // 触发 app ready。
    electronState.whenReadyResolve()
    await new Promise((resolve) => setTimeout(resolve, 0))

    // 生产环境用 loadFile 加载 dist 文件。
    expect(electronState.lastWindow.loadFile).toHaveBeenCalled()
    expect(electronState.lastWindow.loadURL).not.toHaveBeenCalled()
    // 生产环境显示窗口（非冒烟）。
    expect(electronState.windowOptions.show).toBe(true)
    // CSP 响应头应被注入，且是生产策略（script-src 不含 unsafe-eval）。
    const csp =
      electronState.headersCallbackResult.responseHeaders[
        'Content-Security-Policy'
      ][0]
    expect(csp).toContain("script-src 'self'")
    expect(csp).not.toContain('unsafe-eval')
  })

  /**
   * 验证开发环境 ready 后用 loadURL 加载 dev server。
   */
  test('开发环境 ready 后 loadURL 加载 dev server', async () => {
    process.env.ELECTRON_RENDERER_URL = 'http://127.0.0.1:5999'
    await loadMain({ isDev: true })
    electronState.whenReadyResolve()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(electronState.lastWindow.loadURL).toHaveBeenCalledWith(
      'http://127.0.0.1:5999'
    )
    // 开发 CSP 含 unsafe-eval。
    const csp =
      electronState.headersCallbackResult.responseHeaders[
        'Content-Security-Policy'
      ][0]
    expect(csp).toContain('unsafe-eval')
    delete process.env.ELECTRON_RENDERER_URL
  })

  /**
   * 验证冒烟模式下加载成功且 API 就绪时输出 SMOKE_OK 并 exit(0)。
   */
  test('冒烟模式加载成功且 API 就绪时 exit 0', async () => {
    await loadMain({ isDev: false, isSmoke: true })
    electronState.whenReadyResolve()
    await new Promise((resolve) => setTimeout(resolve, 0))

    // 冒烟模式不显示窗口（窗口在 ready 后才创建，故在此断言）。
    expect(electronState.windowOptions.show).toBe(false)
    // 触发加载完成事件，驱动 runSmokeCheck。
    electronState.lastWindow.webContents.emit('did-finish-load')
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(electronState.exitCode).toBe(0)
  })

  /**
   * 验证冒烟模式下 API 未暴露时 exit(1)。
   */
  test('冒烟模式 API 未就绪时 exit 1', async () => {
    await loadMain({ isDev: false, isSmoke: true })
    electronState.whenReadyResolve()
    await new Promise((resolve) => setTimeout(resolve, 0))

    // 让 executeJavaScript 返回 false，模拟 preload API 未暴露。
    electronState.lastWindow.webContents.executeJavaScriptResult = false
    electronState.lastWindow.webContents.emit('did-finish-load')
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(electronState.exitCode).toBe(1)
  })

  /**
   * 验证冒烟模式下加载失败时 exit(1)。
   */
  test('冒烟模式加载失败时 exit 1', async () => {
    await loadMain({ isDev: false, isSmoke: true })
    electronState.whenReadyResolve()
    await new Promise((resolve) => setTimeout(resolve, 0))

    // 触发加载失败事件，驱动 runSmokeCheck 的 reject 分支。
    electronState.lastWindow.webContents.emit(
      'did-fail-load',
      {},
      -6,
      'ERR_FILE_NOT_FOUND'
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(electronState.exitCode).toBe(1)
  })

  /**
   * 验证 activate 事件在无窗口时创建新窗口。
   */
  test('activate 无窗口时创建新窗口', async () => {
    await loadMain({ isDev: false })
    // activateHandler 存储 activate 事件回调。
    const activateHandler = electronState.appOnHandlers.get('activate')
    // 无窗口场景。
    electronState.allWindows = []
    activateHandler()
    expect(electronState.lastWindow).not.toBeNull()
  })

  /**
   * 验证 activate 事件在已有窗口时不重复创建。
   */
  test('activate 已有窗口时不重复创建', async () => {
    await loadMain({ isDev: false })
    const activateHandler = electronState.appOnHandlers.get('activate')
    electronState.lastWindow = null
    // 已有窗口场景。
    electronState.allWindows = [{}]
    activateHandler()
    expect(electronState.lastWindow).toBeNull()
  })

  /**
   * 验证非 macOS 平台 window-all-closed 时退出应用。
   */
  test('非 darwin 平台 window-all-closed 退出应用', async () => {
    await loadMain({ isDev: false })
    // windowClosedHandler 存储 window-all-closed 事件回调。
    const windowClosedHandler =
      electronState.appOnHandlers.get('window-all-closed')
    // originalPlatform 存储原始平台标识。
    const originalPlatform = process.platform
    Object.defineProperty(process, 'platform', {
      value: 'linux',
      configurable: true,
    })
    windowClosedHandler()
    expect(electronState.quitCalled).toBe(true)
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      configurable: true,
    })
  })

  /**
   * 验证 darwin 平台 window-all-closed 时不退出应用。
   */
  test('darwin 平台 window-all-closed 不退出应用', async () => {
    await loadMain({ isDev: false })
    const windowClosedHandler =
      electronState.appOnHandlers.get('window-all-closed')
    const originalPlatform = process.platform
    Object.defineProperty(process, 'platform', {
      value: 'darwin',
      configurable: true,
    })
    windowClosedHandler()
    expect(electronState.quitCalled).toBe(false)
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      configurable: true,
    })
  })

  /**
   * 验证窗口 closed 事件会解除窗口引用。
   */
  test('窗口 closed 事件清空窗口引用', async () => {
    await loadMain({ isDev: false })
    electronState.whenReadyResolve()
    await new Promise((resolve) => setTimeout(resolve, 0))

    // closedCall 存储 win.on 注册的 closed 回调。
    const closedCall = electronState.lastWindow.on.mock.calls.find(
      ([event]) => event === 'closed'
    )
    expect(closedCall).toBeDefined()
    // 执行 closed 回调覆盖引用清理分支。
    closedCall[1]()
  })
})
