import { join } from 'node:path'
import { readFile } from 'node:fs/promises'
import { describe, expect, test } from 'vitest'
import { makeTempDir, removeTempDir, writeTextFile } from '../helpers.js'
import {
  getConfigPath,
  getDefaultStudyPath,
  loadConfig,
  setStudyPath,
  setVscodePath,
} from '../../src/core/config.js'

describe('config 边界与迁移', () => {
  /**
   * 验证保存不存在的目录时抛出校验错误（覆盖 validateDirectory 与 isDirectory catch 分支）。
   */
  test('setStudyPath/setVscodePath 目录不存在时抛错', async () => {
    // dataDir 存储测试用应用数据目录。
    const dataDir = await makeTempDir('config-ex-data')
    try {
      await expect(
        setStudyPath('/绝对不存在的目录/xyz', { baseDir: dataDir })
      ).rejects.toThrow('文章目录不存在或不是目录')

      await expect(
        setVscodePath('/绝对不存在的目录/xyz', { baseDir: dataDir })
      ).rejects.toThrow('VSCode 目录不存在或不是目录')
    } finally {
      await removeTempDir(dataDir)
    }
  })

  /**
   * 验证读取到旧版 snake_case 配置时会标准化并写回新版文件（覆盖 shouldPersist 写回分支）。
   */
  test('loadConfig 读取旧版 snake_case 配置会写回标准化配置', async () => {
    // dataDir 存储测试用应用数据目录。
    const dataDir = await makeTempDir('config-ex-migrate')
    // studyDir 存储默认文章目录。
    const studyDir = await makeTempDir('config-ex-study')
    try {
      // configPath 存储新版配置文件路径。
      const configPath = join(dataDir, 'config.json')
      // 预置旧版 snake_case 字段的配置文件。
      await writeTextFile(
        configPath,
        JSON.stringify({ study_path: studyDir, vscode_path: studyDir })
      )

      // config 存储标准化后的配置。
      const config = await loadConfig({
        baseDir: dataDir,
        defaultStudyPath: studyDir,
      })
      expect(config).toEqual({ studyPath: studyDir, vscodePath: studyDir })

      // 写回后的文件应是 camelCase 标准结构。
      const persisted = JSON.parse(await readFile(configPath, 'utf8'))
      expect(persisted).toEqual({ studyPath: studyDir, vscodePath: studyDir })
    } finally {
      await removeTempDir(dataDir)
      await removeTempDir(studyDir)
    }
  })

  /**
   * 验证空字符串 studyPath 会回退到默认目录（覆盖 normalizeConfig 的 trim 分支）。
   */
  test('loadConfig 空 studyPath 回退到默认目录', async () => {
    // dataDir 存储测试用应用数据目录。
    const dataDir = await makeTempDir('config-ex-empty')
    // studyDir 存储默认文章目录。
    const studyDir = await makeTempDir('config-ex-empty-study')
    try {
      // configPath 存储新版配置文件路径。
      const configPath = join(dataDir, 'config.json')
      // 预置空白路径配置，触发回退默认目录逻辑。
      await writeTextFile(
        configPath,
        JSON.stringify({ studyPath: '   ', vscodePath: '   ' })
      )

      // config 存储标准化后的配置。
      const config = await loadConfig({
        baseDir: dataDir,
        defaultStudyPath: studyDir,
      })
      expect(config).toEqual({ studyPath: studyDir, vscodePath: studyDir })
    } finally {
      await removeTempDir(dataDir)
      await removeTempDir(studyDir)
    }
  })

  /**
   * 验证 getConfigPath 返回持久化目录下的 config.json 路径。
   */
  test('getConfigPath 返回配置文件路径', async () => {
    // dataDir 存储测试用应用数据目录。
    const dataDir = await makeTempDir('config-ex-path')
    try {
      expect(getConfigPath({ baseDir: dataDir })).toBe(
        join(dataDir, 'config.json')
      )
    } finally {
      await removeTempDir(dataDir)
    }
  })

  /**
   * 验证未注入 defaultStudyPath 时按机器真实情况返回默认目录（覆盖 existsSync 分支）。
   */
  test('getDefaultStudyPath 无注入时返回字符串路径', () => {
    // result 存储默认学习目录。
    const result = getDefaultStudyPath()
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})
