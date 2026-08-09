import { app, BrowserWindow, dialog, ipcMain, session } from 'electron'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { registerIpcHandlers } from './ipcHandlers.js'
import { loadAutoUpdater, registerAppUpdater } from './appUpdater.js'
import { buildCspPolicy } from './security.js'

// __dirname 存储当前 Electron 入口文件所在目录。
const __dirname = dirname(fileURLToPath(import.meta.url))
// DEVELOPMENT_APP_ICON_PATH 存储开发态窗口和 macOS Dock 使用的高清项目图标路径。
const DEVELOPMENT_APP_ICON_PATH = join(__dirname, '../build/icon.png')
// isDev 标记当前是否开发环境。
const isDev = process.env.NODE_ENV === 'development'
// isSmoke 标记当前是否 Electron 启动冒烟自检模式。
const isSmoke = process.env.VL_SMOKE === '1'
// isE2E 标记当前是否执行需要隐藏窗口的 Playwright Electron 测试。
const isE2E = process.env.VL_E2E === '1'
// mainWindow 存储主窗口引用，避免被垃圾回收。
let mainWindow = null

/**
 * 获取渲染进程入口地址。
 * @returns {string} dev server URL 或生产 dist/index.html 路径。
 */
function getRendererTarget() {
  if (isDev) {
    return process.env.ELECTRON_RENDERER_URL || 'http://127.0.0.1:5273'
  }

  return join(__dirname, '../dist/index.html')
}

/**
 * 创建主窗口并加载渲染进程。
 * @returns {BrowserWindow} 创建好的主窗口。
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    // 自动化测试保留真实渲染能力但不显示窗口，避免抢占用户桌面焦点。
    show: !isSmoke && !isE2E,
    title: '学习进度追踪器',
    backgroundColor: '#141414',
    icon: app.isPackaged ? undefined : DEVELOPMENT_APP_ICON_PATH,
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL(getRendererTarget())
  } else {
    mainWindow.loadFile(getRendererTarget())
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  return mainWindow
}

/**
 * 注入 Content-Security-Policy 响应头。
 * @returns {void}
 */
function setupCSP() {
  // policy 存储当前环境对应的 CSP 字符串。
  const policy = buildCspPolicy({
    isDev,
    rendererUrl: isDev ? getRendererTarget() : undefined,
  })

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [policy],
      },
    })
  })
}

/**
 * 执行 Electron 启动冒烟自检。
 * @param {BrowserWindow} win - 主窗口。
 * @returns {Promise<void>} 自检结束后退出进程。
 */
async function runSmokeCheck(win) {
  try {
    await new Promise((resolvePromise, rejectPromise) => {
      win.webContents.once('did-finish-load', resolvePromise)
      win.webContents.once('did-fail-load', (_event, code, description) => {
        rejectPromise(new Error(`load failed ${code} ${description}`))
      })
    })

    // apiReady 存储 preload 暴露 API 是否可用。
    const apiReady = await win.webContents.executeJavaScript(
      "typeof window.visualLearn === 'object' && typeof window.visualLearn.scanStudyNotes === 'function' && typeof window.visualLearn.getProgress === 'function'"
    )
    if (!apiReady) {
      throw new Error('window.visualLearn 未正确暴露')
    }

    console.log('SMOKE_OK preload-api-available')
    app.exit(0)
  } catch (error) {
    console.error('SMOKE_FAIL', error.message)
    app.exit(1)
  }
}

registerIpcHandlers(ipcMain, { dialog })
// appUpdater 存储打包环境的真实更新器；开发和测试使用空替身且不会加载 Electron 更新模块。
const appUpdater = await loadAutoUpdater(
  () => import('electron-updater'),
  app.isPackaged
)
registerAppUpdater(ipcMain, appUpdater, app.isPackaged)

app.whenReady().then(() => {
  // macOS E2E 隐藏 Dock 图标，避免后台测试切换用户当前操作的前台应用。
  if (isE2E) app.dock?.hide()
  // Bug 修复：未打包 Electron 默认显示框架图标；开发态显式设置项目图标，打包态继续使用安装包资源。
  if (process.platform === 'darwin' && !app.isPackaged && !isE2E) {
    app.dock?.setIcon(DEVELOPMENT_APP_ICON_PATH)
  }
  setupCSP()
  // win 存储新创建的主窗口。
  const win = createWindow()
  if (isSmoke) {
    runSmokeCheck(win)
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
