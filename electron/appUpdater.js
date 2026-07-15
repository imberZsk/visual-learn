/**
 * 注册应用更新 IPC；`ipcMain` 是 Electron IPC，`updater` 是可注入的更新器。
 * @param {Electron.IpcMain|object} ipcMain - IPC 注册器。
 * @param {object} updater - electron-updater 实例。
 * @param {boolean} isPackaged - 当前是否为打包应用。
 * @returns {void}
 */
export function registerAppUpdater(ipcMain, updater, isPackaged) {
  // downloaded 存储安装包是否已完整下载。
  let downloaded = false
  // downloadPromise 存储正在执行的下载任务，避免重复下载。
  let downloadPromise = null
  updater.autoDownload = false
  updater.autoInstallOnAppQuit = false

  ipcMain.handle('app-update:check', async () => {
    // 业务场景：开发环境没有发布配置，只返回无更新。
    if (!isPackaged) return { available: false }
    // result 存储 GitHub Release 检查结果。
    const result = await updater.checkForUpdates()
    // version 存储远端最新版本号。
    const version = result?.updateInfo?.version
    return version
      ? { available: true, version, downloaded }
      : { available: false }
  })

  ipcMain.handle('app-update:download', async () => {
    // 业务场景：重复点击时复用同一 Promise，避免并发写入安装包。
    if (!downloadPromise) {
      downloadPromise = updater
        .downloadUpdate()
        .then(() => {
          downloaded = true
          return { downloaded: true }
        })
        .finally(() => {
          downloadPromise = null
        })
    }
    return downloadPromise
  })

  ipcMain.handle('app-update:install', () => {
    if (!downloaded) throw new Error('更新尚未下载完成')
    updater.quitAndInstall(false, true)
    return true
  })
}
