import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { makeTempDir, removeTempDir, writeTextFile } from '../helpers.js'
import { getStorageFilePath } from '../../src/core/storage.js'
import {
  loadConfig,
  setStudyPath,
  setVscodePath,
} from '../../src/core/config.js'
import { getPreference, setPreference } from '../../src/core/preferences.js'
import { getProgress, setProgress } from '../../src/core/progress.js'
import {
  getAnnotations,
  createAnnotation,
  updateAnnotation,
  deleteAnnotation,
} from '../../src/core/annotations.js'
import {
  getArticleSummaries,
  getArticleSummary,
  setArticleSummary,
} from '../../src/core/articleSummaries.js'

describe('storage/config/preferences/progress', () => {
  /**
   * 验证持久化文件统一写入注入的应用数据目录，便于测试隔离和 Electron 运行时复用。
   */
  test('getStorageFilePath 使用统一持久化目录', async () => {
    // dataDir 存储测试用应用数据目录。
    const dataDir = await makeTempDir('storage-path')
    try {
      expect(getStorageFilePath('progress.json', { baseDir: dataDir })).toBe(
        join(dataDir, 'progress.json')
      )
    } finally {
      await removeTempDir(dataDir)
    }
  })

  /**
   * 验证配置读取会补齐默认文章目录，并在保存文章目录时同步默认 VSCode 目录。
   */
  test('loadConfig 与 setStudyPath 会维护 studyPath/vscodePath', async () => {
    // dataDir 存储测试用应用数据目录。
    const dataDir = await makeTempDir('config-data')
    // studyDir 存储默认文章目录。
    const studyDir = await makeTempDir('config-study')
    // vscodeDir 存储独立 VSCode 打开目录。
    const vscodeDir = await makeTempDir('config-vscode')
    try {
      // initialConfig 存储首次加载得到的默认配置。
      const initialConfig = await loadConfig({
        baseDir: dataDir,
        defaultStudyPath: studyDir,
      })
      expect(initialConfig).toEqual({
        studyPath: studyDir,
        vscodePath: studyDir,
      })

      await setStudyPath(vscodeDir, {
        baseDir: dataDir,
        defaultStudyPath: studyDir,
      })
      // syncedConfig 存储修改文章目录后的配置，此时 VSCode 目录应跟随同步。
      const syncedConfig = await loadConfig({
        baseDir: dataDir,
        defaultStudyPath: studyDir,
      })
      expect(syncedConfig).toEqual({
        studyPath: vscodeDir,
        vscodePath: vscodeDir,
      })

      await setVscodePath(studyDir, {
        baseDir: dataDir,
        defaultStudyPath: studyDir,
      })
      // finalConfig 存储独立修改 VSCode 目录后的配置。
      const finalConfig = await loadConfig({
        baseDir: dataDir,
        defaultStudyPath: studyDir,
      })
      expect(finalConfig).toEqual({
        studyPath: vscodeDir,
        vscodePath: studyDir,
      })
    } finally {
      await removeTempDir(dataDir)
      await removeTempDir(studyDir)
      await removeTempDir(vscodeDir)
    }
  })

  /**
   * 验证主题等轻量偏好能按 key/value 读写。
   */
  test('setPreference 与 getPreference 读写键值偏好', async () => {
    // dataDir 存储测试用应用数据目录。
    const dataDir = await makeTempDir('preferences-data')
    try {
      await setPreference('themeMode', 'dark', { baseDir: dataDir })
      expect(await getPreference('themeMode', { baseDir: dataDir })).toBe(
        'dark'
      )
      expect(await getPreference('missing', { baseDir: dataDir })).toBeNull()
    } finally {
      await removeTempDir(dataDir)
    }
  })

  /**
   * 验证学习进度标记完成时写入，取消完成时删除条目以保持数据精简。
   */
  test('setProgress 标记完成和取消完成', async () => {
    // dataDir 存储测试用应用数据目录。
    const dataDir = await makeTempDir('progress-data')
    try {
      // filePath 存储进度记录使用的学习文件路径。
      const filePath = '/tmp/visual-learn-note.md'
      await setProgress(
        { filePath, completed: true, timestamp: 123 },
        { baseDir: dataDir }
      )
      expect(await getProgress({ baseDir: dataDir })).toEqual({
        [filePath]: true,
      })

      await setProgress(
        { filePath, completed: false, timestamp: 456 },
        { baseDir: dataDir }
      )
      expect(await getProgress({ baseDir: dataDir })).toEqual({})
    } finally {
      await removeTempDir(dataDir)
    }
  })

  /**
   * 验证进度读取不会访问应用数据目录之外的旧文件。
   */
  test('getProgress 不读取外部 legacy progress 文件', async () => {
    // dataDir 存储测试用应用数据目录。
    const dataDir = await makeTempDir('progress-migrate-data')
    // legacyDir 存储模拟旧进度文件所在目录。
    const legacyDir = await makeTempDir('progress-migrate-legacy')
    try {
      // legacyPath 存储模拟旧版本 progress.json 文件路径。
      const legacyPath = join(legacyDir, 'progress.json')
      await writeTextFile(
        legacyPath,
        JSON.stringify({
          entries: { '/tmp/a.md': { completed: true, completed_at: 100 } },
        })
      )

      expect(
        await getProgress({ baseDir: dataDir, legacyProgressPath: legacyPath })
      ).toEqual({})
      expect(await getProgress({ baseDir: dataDir })).toEqual({})
    } finally {
      await removeTempDir(dataDir)
      await removeTempDir(legacyDir)
    }
  })

  /**
   * 验证文章标注能独立持久化，并支持创建、读取、更新和删除。
   */
  test('annotations 支持创建、读取、更新和删除', async () => {
    // dataDir 存储测试用应用数据目录。
    const dataDir = await makeTempDir('annotations-data')
    try {
      // filePath 存储标注关联的学习文件路径。
      const filePath = '/tmp/visual-learn-note.md'
      // created 存储新建后的完整标注记录。
      const created = await createAnnotation(
        {
          filePath,
          quote: '重点内容',
          startOffset: 2,
          endOffset: 6,
          prefix: '这是',
          suffix: '之后',
          comment: '这里要复习',
          color: 'yellow',
          timestamp: 100,
        },
        { baseDir: dataDir }
      )

      expect(await getAnnotations(filePath, { baseDir: dataDir })).toEqual([
        created,
      ])

      // updated 存储更新评论和位置后的完整标注记录。
      const updated = await updateAnnotation(
        {
          filePath,
          id: created.id,
          comment: '已经理解',
          startOffset: 3,
          endOffset: 7,
          prefix: '新的前文',
          suffix: '新的后文',
          timestamp: 200,
        },
        { baseDir: dataDir }
      )

      expect(updated.comment).toBe('已经理解')
      expect(updated.updatedAt).toBe(200)
      expect(await getAnnotations(filePath, { baseDir: dataDir })).toEqual([
        updated,
      ])

      await deleteAnnotation({ filePath, id: created.id }, { baseDir: dataDir })
      expect(await getAnnotations(filePath, { baseDir: dataDir })).toEqual([])
    } finally {
      await removeTempDir(dataDir)
    }
  })

  /**
   * 验证文章总总结能按文章路径持久化，并在清空内容时删除条目。
   */
  test('article summaries 支持创建、读取、更新和清空', async () => {
    // dataDir 存储测试用应用数据目录。
    const dataDir = await makeTempDir('article-summaries-data')
    try {
      // filePath 存储总结关联的学习文件路径。
      const filePath = '/tmp/visual-learn-note.md'
      // created 存储首次保存后的文章总结记录。
      const created = await setArticleSummary(
        {
          filePath,
          content: '这篇文章讲如何把概念教给别人。',
          timestamp: 100,
        },
        { baseDir: dataDir }
      )

      expect(created).toEqual({
        filePath,
        content: '这篇文章讲如何把概念教给别人。',
        createdAt: 100,
        updatedAt: 100,
      })
      expect(await getArticleSummary(filePath, { baseDir: dataDir })).toEqual(
        created
      )
      expect(await getArticleSummaries({ baseDir: dataDir })).toEqual({
        [filePath]: created,
      })

      // updated 存储二次编辑后的文章总结记录。
      const updated = await setArticleSummary(
        {
          filePath,
          content: '这篇文章的核心是用自己的话教会别人。',
          timestamp: 200,
        },
        { baseDir: dataDir }
      )

      expect(updated).toEqual({
        filePath,
        content: '这篇文章的核心是用自己的话教会别人。',
        createdAt: 100,
        updatedAt: 200,
      })

      // cleared 存储清空总结后的返回结果。
      const cleared = await setArticleSummary(
        {
          filePath,
          content: '   ',
          timestamp: 300,
        },
        { baseDir: dataDir }
      )

      expect(cleared).toBeNull()
      expect(await getArticleSummary(filePath, { baseDir: dataDir })).toBeNull()
      expect(await getArticleSummaries({ baseDir: dataDir })).toEqual({})
    } finally {
      await removeTempDir(dataDir)
    }
  })
})
