import { join } from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import { makeTempDir, removeTempDir, writeTextFile } from '../helpers.js';
import { IPC } from '../../electron/ipcChannels.js';
import { registerIpcHandlers } from '../../electron/ipcHandlers.js';

/**
 * 创建 Electron ipcMain 的测试替身。
 * @returns {{handle: Function, invoke: Function, handlers: Map<string, Function>}} 可注册与调用 handler 的假对象。
 */
function createIpcMainMock() {
  // handlers 存储通道名到处理函数的映射。
  const handlers = new Map();
  return {
    handlers,
    /**
     * 注册 IPC handler。
     * @param {string} channel - IPC 通道名。
     * @param {Function} handler - 通道处理函数。
     * @returns {void}
     */
    handle(channel, handler) {
      handlers.set(channel, handler);
    },
    /**
     * 调用已注册的 IPC handler。
     * @param {string} channel - IPC 通道名。
     * @param {...unknown} args - 渲染进程传入的参数。
     * @returns {Promise<unknown>} handler 执行结果。
     */
    invoke(channel, ...args) {
      // handler 存储目标通道处理函数。
      const handler = handlers.get(channel);
      if (!handler) throw new Error(`未注册通道: ${channel}`);
      return handler({}, ...args);
    },
  };
}

describe('registerIpcHandlers', () => {
  /**
   * 验证 Electron IPC 暴露完整学习资料能力。
   */
  test('注册学习扫描、阅读、进度、配置、偏好和 VSCode 通道', async () => {
    // dataDir 存储测试用应用数据目录。
    const dataDir = await makeTempDir('ipc-data');
    // studyDir 存储测试学习目录。
    const studyDir = await makeTempDir('ipc-study');
    try {
      // notePath 存储测试 Markdown 文件路径。
      const notePath = join(studyDir, '指南', '入门', '快速开始.md');
      await writeTextFile(notePath, '# 快速开始\n正文');

      // ipcMain 存储 Electron ipcMain 的测试替身。
      const ipcMain = createIpcMainMock();
      // openInVscode 存储 VSCode 打开函数替身。
      const openInVscode = vi.fn(async () => ({ success: true }));
      registerIpcHandlers(ipcMain, {
        dataDir,
        defaultStudyPath: studyDir,
        openInVscode,
      });

      expect(await ipcMain.invoke(IPC.GET_STUDY_PATH)).toBe(studyDir);
      expect(await ipcMain.invoke(IPC.GET_VSCODE_PATH)).toBe(studyDir);

      // categories 存储 IPC 扫描学习目录的结果。
      const categories = await ipcMain.invoke(IPC.SCAN_STUDY_NOTES, { studyRoot: studyDir });
      expect(categories[0].items[0].path).toBe(notePath);

      expect(await ipcMain.invoke(IPC.READ_MD_CONTENT, { filePath: notePath, studyRoot: studyDir })).toContain('正文');
      await ipcMain.invoke(IPC.SET_PROGRESS, { filePath: notePath, completed: true, timestamp: 1000 });
      expect(await ipcMain.invoke(IPC.GET_PROGRESS)).toEqual({ [notePath]: true });

      await ipcMain.invoke(IPC.SET_PREFERENCE, { key: 'lastItemPath', value: notePath });
      expect(await ipcMain.invoke(IPC.GET_PREFERENCE, { key: 'lastItemPath' })).toBe(notePath);

      await ipcMain.invoke(IPC.OPEN_IN_VSCODE, { targetPath: studyDir });
      expect(openInVscode).toHaveBeenCalledWith(studyDir);
    } finally {
      await removeTempDir(dataDir);
      await removeTempDir(studyDir);
    }
  });
});
