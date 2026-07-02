import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { makeTempDir, removeTempDir, writeTextFile } from '../helpers.js';
import { getStorageFilePath } from '../../src/core/storage.js';
import { loadConfig, setStudyPath, setVscodePath } from '../../src/core/config.js';
import { getPreference, setPreference } from '../../src/core/preferences.js';
import { getProgress, setProgress } from '../../src/core/progress.js';

describe('storage/config/preferences/progress', () => {
  /**
   * 验证持久化文件统一写入注入的应用数据目录，便于测试隔离和 Electron 运行时复用。
   */
  test('getStorageFilePath 使用统一持久化目录', async () => {
    // dataDir 存储测试用应用数据目录。
    const dataDir = await makeTempDir('storage-path');
    try {
      expect(getStorageFilePath('progress.json', { baseDir: dataDir })).toBe(join(dataDir, 'progress.json'));
    } finally {
      await removeTempDir(dataDir);
    }
  });

  /**
   * 验证配置读取会补齐默认文章目录，并在保存文章目录时同步默认 VSCode 目录。
   */
  test('loadConfig 与 setStudyPath 会维护 studyPath/vscodePath', async () => {
    // dataDir 存储测试用应用数据目录。
    const dataDir = await makeTempDir('config-data');
    // studyDir 存储默认文章目录。
    const studyDir = await makeTempDir('config-study');
    // vscodeDir 存储独立 VSCode 打开目录。
    const vscodeDir = await makeTempDir('config-vscode');
    try {
      // initialConfig 存储首次加载得到的默认配置。
      const initialConfig = await loadConfig({ baseDir: dataDir, defaultStudyPath: studyDir });
      expect(initialConfig).toEqual({ studyPath: studyDir, vscodePath: studyDir });

      await setStudyPath(vscodeDir, { baseDir: dataDir, defaultStudyPath: studyDir });
      // syncedConfig 存储修改文章目录后的配置，此时 VSCode 目录应跟随同步。
      const syncedConfig = await loadConfig({ baseDir: dataDir, defaultStudyPath: studyDir });
      expect(syncedConfig).toEqual({ studyPath: vscodeDir, vscodePath: vscodeDir });

      await setVscodePath(studyDir, { baseDir: dataDir, defaultStudyPath: studyDir });
      // finalConfig 存储独立修改 VSCode 目录后的配置。
      const finalConfig = await loadConfig({ baseDir: dataDir, defaultStudyPath: studyDir });
      expect(finalConfig).toEqual({ studyPath: vscodeDir, vscodePath: studyDir });
    } finally {
      await removeTempDir(dataDir);
      await removeTempDir(studyDir);
      await removeTempDir(vscodeDir);
    }
  });

  /**
   * 验证主题等轻量偏好能按 key/value 读写。
   */
  test('setPreference 与 getPreference 读写键值偏好', async () => {
    // dataDir 存储测试用应用数据目录。
    const dataDir = await makeTempDir('preferences-data');
    try {
      await setPreference('themeMode', 'dark', { baseDir: dataDir });
      expect(await getPreference('themeMode', { baseDir: dataDir })).toBe('dark');
      expect(await getPreference('missing', { baseDir: dataDir })).toBeNull();
    } finally {
      await removeTempDir(dataDir);
    }
  });

  /**
   * 验证学习进度标记完成时写入，取消完成时删除条目以保持数据精简。
   */
  test('setProgress 标记完成和取消完成', async () => {
    // dataDir 存储测试用应用数据目录。
    const dataDir = await makeTempDir('progress-data');
    try {
      // filePath 存储进度记录使用的学习文件路径。
      const filePath = '/tmp/visual-learn-note.md';
      await setProgress({ filePath, completed: true, timestamp: 123 }, { baseDir: dataDir });
      expect(await getProgress({ baseDir: dataDir })).toEqual({ [filePath]: true });

      await setProgress({ filePath, completed: false, timestamp: 456 }, { baseDir: dataDir });
      expect(await getProgress({ baseDir: dataDir })).toEqual({});
    } finally {
      await removeTempDir(dataDir);
    }
  });

  /**
   * 验证旧版进度文件可一次性迁移到新的统一持久化目录。
   */
  test('getProgress 会读取并迁移 legacy progress 文件', async () => {
    // dataDir 存储测试用应用数据目录。
    const dataDir = await makeTempDir('progress-migrate-data');
    // legacyDir 存储模拟旧进度文件所在目录。
    const legacyDir = await makeTempDir('progress-migrate-legacy');
    try {
      // legacyPath 存储模拟旧版本 progress.json 文件路径。
      const legacyPath = join(legacyDir, 'progress.json');
      await writeTextFile(legacyPath, JSON.stringify({ entries: { '/tmp/a.md': { completed: true, completed_at: 100 } } }));

      expect(await getProgress({ baseDir: dataDir, legacyProgressPath: legacyPath })).toEqual({ '/tmp/a.md': true });
      expect(await getProgress({ baseDir: dataDir })).toEqual({ '/tmp/a.md': true });
    } finally {
      await removeTempDir(dataDir);
      await removeTempDir(legacyDir);
    }
  });
});
