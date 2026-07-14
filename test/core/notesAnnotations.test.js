import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { makeTempDir, removeTempDir, writeTextFile } from '../helpers.js'
import { readMarkdownContent } from '../../src/core/notes.js'
import {
  createAnnotation,
  updateAnnotation,
  deleteAnnotation,
  getAnnotations,
} from '../../src/core/annotations.js'

describe('notes 读取权限', () => {
  /**
   * 验证读取学习目录内文件返回内容。
   */
  test('读取学习目录内文件返回内容', async () => {
    // studyDir 存储学习目录根路径。
    const studyDir = await makeTempDir('notes-inside')
    try {
      // notePath 存储学习目录内的 Markdown 文件路径。
      const notePath = join(studyDir, 'a.md')
      await writeTextFile(notePath, '# 标题\n正文')
      expect(
        await readMarkdownContent({ filePath: notePath, studyRoot: studyDir })
      ).toContain('正文')
    } finally {
      await removeTempDir(studyDir)
    }
  })

  /**
   * 验证读取学习目录外文件时抛出越权错误（覆盖 notes.js:28 分支）。
   */
  test('读取学习目录外文件抛越权错误', async () => {
    // studyDir 存储学习目录根路径。
    const studyDir = await makeTempDir('notes-outside')
    try {
      await expect(
        readMarkdownContent({ filePath: '/etc/hosts', studyRoot: studyDir })
      ).rejects.toThrow('无权读取学习目录之外的文件')
    } finally {
      await removeTempDir(studyDir)
    }
  })
})

describe('annotations 错误路径', () => {
  /**
   * 验证创建标注缺少必填字段时抛“参数不完整”错误（覆盖 annotations.js:201）。
   */
  test('创建标注缺少必填字段抛错', async () => {
    // dataDir 存储测试用应用数据目录。
    const dataDir = await makeTempDir('ann-err-create')
    try {
      // filePath 为空，annotation 归一化失败，应抛错。
      await expect(
        createAnnotation(
          { filePath: '', quote: 'x', startOffset: 0, endOffset: 1 },
          { baseDir: dataDir }
        )
      ).rejects.toThrow('标注参数不完整')
    } finally {
      await removeTempDir(dataDir)
    }
  })

  /**
   * 验证更新不存在的标注时抛“标注不存在”错误（覆盖 annotations.js:229）。
   */
  test('更新不存在的标注抛错', async () => {
    // dataDir 存储测试用应用数据目录。
    const dataDir = await makeTempDir('ann-err-update')
    try {
      await expect(
        updateAnnotation(
          { filePath: '/tmp/a.md', id: '不存在', comment: 'x' },
          { baseDir: dataDir }
        )
      ).rejects.toThrow('标注不存在')
    } finally {
      await removeTempDir(dataDir)
    }
  })

  /**
   * 验证删除文章仅剩标注后会移除该文章键（覆盖 annotations.js:271 的 delete 分支）。
   */
  test('删除最后一条标注后移除文章键', async () => {
    // dataDir 存储测试用应用数据目录。
    const dataDir = await makeTempDir('ann-err-delete')
    try {
      // filePath 存储标注关联文章路径。
      const filePath = '/tmp/visual-learn-del.md'
      // created 存储新建的标注。
      const created = await createAnnotation(
        { filePath, quote: '内容', startOffset: 0, endOffset: 2, timestamp: 1 },
        { baseDir: dataDir }
      )
      // 删除唯一标注，触发 delete data.entries[filePath] 分支。
      await deleteAnnotation({ filePath, id: created.id }, { baseDir: dataDir })
      expect(await getAnnotations(filePath, { baseDir: dataDir })).toEqual([])
    } finally {
      await removeTempDir(dataDir)
    }
  })
})
