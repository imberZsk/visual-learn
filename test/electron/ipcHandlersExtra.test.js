import { describe, expect, test, vi } from 'vitest'
import { makeTempDir, removeTempDir } from '../helpers.js'
import { IPC } from '../../electron/ipcChannels.js'
import { registerIpcHandlers } from '../../electron/ipcHandlers.js'

/**
 * 创建 Electron ipcMain 的测试替身。
 * @returns {{handle: Function, invoke: Function}} 可注册与调用 handler 的假对象。
 */
function createIpcMainMock() {
  // handlers 存储通道名到处理函数的映射。
  const handlers = new Map()
  return {
    /**
     * 注册 IPC handler。
     * @param {string} channel - IPC 通道名。
     * @param {Function} handler - 通道处理函数。
     */
    handle(channel, handler) {
      handlers.set(channel, handler)
    },
    /**
     * 调用已注册的 IPC handler。
     * @param {string} channel - IPC 通道名。
     * @param {...unknown} args - 渲染进程传入的参数。
     * @returns {Promise<unknown>} handler 执行结果。
     */
    invoke(channel, ...args) {
      // handler 存储目标通道处理函数。
      const handler = handlers.get(channel)
      if (!handler) throw new Error(`未注册通道: ${channel}`)
      return handler({}, ...args)
    },
  }
}

describe('registerIpcHandlers 边界与错误路径', () => {
  /**
   * 验证设置学习目录与 VSCode 目录后可回读，且缺参会抛错。
   */
  test('设置/读取 study 与 vscode 目录，缺参抛错', async () => {
    // dataDir 存储测试用应用数据目录。
    const dataDir = await makeTempDir('ipc-extra-data')
    // studyDir 存储可用作合法目录的临时目录。
    const studyDir = await makeTempDir('ipc-extra-study')
    try {
      // ipcMain 存储 Electron ipcMain 的测试替身。
      const ipcMain = createIpcMainMock()
      registerIpcHandlers(ipcMain, { dataDir, defaultStudyPath: studyDir })

      // 设置合法学习目录返回 true。
      expect(await ipcMain.invoke(IPC.SET_STUDY_PATH, { path: studyDir })).toBe(
        true
      )
      expect(await ipcMain.invoke(IPC.GET_STUDY_PATH)).toBe(studyDir)

      // 设置合法 VSCode 目录返回 true。
      expect(
        await ipcMain.invoke(IPC.SET_VSCODE_PATH, { path: studyDir })
      ).toBe(true)
      expect(await ipcMain.invoke(IPC.GET_VSCODE_PATH)).toBe(studyDir)

      // 缺少 path 参数应抛出“缺少参数”错误。
      await expect(ipcMain.invoke(IPC.SET_STUDY_PATH, {})).rejects.toThrow(
        '缺少参数: path'
      )
      await expect(ipcMain.invoke(IPC.SET_VSCODE_PATH, {})).rejects.toThrow(
        '缺少参数: path'
      )
    } finally {
      await removeTempDir(dataDir)
      await removeTempDir(studyDir)
    }
  })

  /**
   * 验证创建标注缺少数字偏移参数时抛错。
   */
  test('创建标注缺少 startOffset 抛出缺少参数错误', async () => {
    // dataDir 存储测试用应用数据目录。
    const dataDir = await makeTempDir('ipc-extra-num')
    try {
      // ipcMain 存储 Electron ipcMain 的测试替身。
      const ipcMain = createIpcMainMock()
      registerIpcHandlers(ipcMain, { dataDir })

      // startOffset 非有限数字，requireNumber 应抛错。
      await expect(
        ipcMain.invoke(IPC.CREATE_ANNOTATION, {
          filePath: '/tmp/a.md',
          quote: '正文',
          startOffset: 'x',
          endOffset: 2,
        })
      ).rejects.toThrow('缺少参数: startOffset')
    } finally {
      await removeTempDir(dataDir)
    }
  })

  /**
   * 验证 VSCode 打开失败时 handler 抛出错误。
   */
  test('OPEN_IN_VSCODE 打开失败时抛错', async () => {
    // dataDir 存储测试用应用数据目录。
    const dataDir = await makeTempDir('ipc-extra-vscode')
    try {
      // openInVscode 存储返回失败结果的替身。
      const openInVscode = vi.fn(async () => ({
        success: false,
        error: '未安装',
      }))
      // ipcMain 存储 Electron ipcMain 的测试替身。
      const ipcMain = createIpcMainMock()
      registerIpcHandlers(ipcMain, { dataDir, openInVscode })

      await expect(
        ipcMain.invoke(IPC.OPEN_IN_VSCODE, { targetPath: '/tmp/a' })
      ).rejects.toThrow('未安装')
    } finally {
      await removeTempDir(dataDir)
    }
  })

  /**
   * 验证 VSCode 打开失败且无 error 字段时使用默认错误文案。
   */
  test('OPEN_IN_VSCODE 失败无 error 字段时用默认文案', async () => {
    // dataDir 存储测试用应用数据目录。
    const dataDir = await makeTempDir('ipc-extra-vscode2')
    try {
      // openInVscode 存储返回失败但无 error 的替身。
      const openInVscode = vi.fn(async () => ({ success: false }))
      const ipcMain = createIpcMainMock()
      registerIpcHandlers(ipcMain, { dataDir, openInVscode })

      await expect(
        ipcMain.invoke(IPC.OPEN_IN_VSCODE, { targetPath: '/tmp/a' })
      ).rejects.toThrow('VSCode 打开失败')
    } finally {
      await removeTempDir(dataDir)
    }
  })

  /**
   * 验证无 dialog 依赖时目录选择器直接返回 canceled。
   */
  test('SELECT_DIRECTORY 无 dialog 时返回 canceled', async () => {
    // dataDir 存储测试用应用数据目录。
    const dataDir = await makeTempDir('ipc-extra-dialog1')
    try {
      const ipcMain = createIpcMainMock()
      // 不注入 dialog。
      registerIpcHandlers(ipcMain, { dataDir })
      expect(await ipcMain.invoke(IPC.SELECT_DIRECTORY, {})).toEqual({
        canceled: true,
      })
    } finally {
      await removeTempDir(dataDir)
    }
  })

  /**
   * 验证用户取消系统目录选择器时返回 canceled。
   */
  test('SELECT_DIRECTORY 用户取消时返回 canceled', async () => {
    // dataDir 存储测试用应用数据目录。
    const dataDir = await makeTempDir('ipc-extra-dialog2')
    try {
      // dialog 存储返回取消结果的替身。
      const dialog = {
        showOpenDialog: vi.fn(async () => ({ canceled: true, filePaths: [] })),
      }
      const ipcMain = createIpcMainMock()
      registerIpcHandlers(ipcMain, { dataDir, dialog })
      expect(await ipcMain.invoke(IPC.SELECT_DIRECTORY, {})).toEqual({
        canceled: true,
      })
    } finally {
      await removeTempDir(dataDir)
    }
  })

  /**
   * 验证用户选中目录时返回路径。
   */
  test('SELECT_DIRECTORY 选中目录时返回 path', async () => {
    // dataDir 存储测试用应用数据目录。
    const dataDir = await makeTempDir('ipc-extra-dialog3')
    try {
      // dialog 存储返回选中路径的替身。
      const dialog = {
        showOpenDialog: vi.fn(async () => ({
          canceled: false,
          filePaths: ['/tmp/chosen'],
        })),
      }
      const ipcMain = createIpcMainMock()
      registerIpcHandlers(ipcMain, { dataDir, dialog })
      // 传入 defaultPath 覆盖对应分支。
      expect(
        await ipcMain.invoke(IPC.SELECT_DIRECTORY, { defaultPath: '/tmp' })
      ).toEqual({
        canceled: false,
        path: '/tmp/chosen',
      })
      expect(dialog.showOpenDialog).toHaveBeenCalledWith({
        defaultPath: '/tmp',
        properties: ['openDirectory'],
      })
    } finally {
      await removeTempDir(dataDir)
    }
  })
})
