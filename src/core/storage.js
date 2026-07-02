import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// DEFAULT_STORAGE_DIR 存储应用默认持久化目录，兼容历史桌面版本的数据位置。
export const DEFAULT_STORAGE_DIR = '/Users/imber/.visualLearn';

/**
 * 获取本次运行使用的持久化根目录。
 * @param {{baseDir?: string}} options - 可选配置，baseDir 用于测试或 Electron 注入自定义数据目录。
 * @returns {string} 持久化根目录绝对路径。
 */
export function getStorageDir(options = {}) {
  return options.baseDir || DEFAULT_STORAGE_DIR;
}

/**
 * 获取持久化目录下指定文件的绝对路径。
 * @param {string} fileName - 要拼接到持久化目录下的文件名。
 * @param {{baseDir?: string}} options - 可选配置，baseDir 用于测试隔离。
 * @returns {string} 持久化文件绝对路径。
 */
export function getStorageFilePath(fileName, options = {}) {
  // storageDir 存储本次调用使用的持久化根目录。
  const storageDir = getStorageDir(options);
  return join(storageDir, fileName);
}

/**
 * 确保持久化目录存在。
 * @param {{baseDir?: string}} options - 可选配置，baseDir 用于测试隔离。
 * @returns {Promise<void>} 目录创建完成后 resolve。
 */
export async function ensureStorageDir(options = {}) {
  // storageDir 存储本次调用使用的持久化根目录。
  const storageDir = getStorageDir(options);
  await mkdir(storageDir, { recursive: true });
}

/**
 * 读取并解析 JSON 文件。
 * @param {string} filePath - 要读取的 JSON 文件路径。
 * @returns {Promise<unknown|null>} 解析成功返回数据，文件不存在或损坏返回 null。
 */
export async function readJsonFile(filePath) {
  try {
    // content 存储 JSON 文件文本内容。
    const content = await readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * 从多个候选 JSON 文件中读取第一个有效数据，并返回来源路径。
 * @param {string[]} paths - 按优先级排列的候选 JSON 文件路径。
 * @returns {Promise<{data: unknown, sourcePath: string}|null>} 命中结果与来源路径。
 */
export async function readFirstValidJsonWithSource(paths) {
  for (const filePath of paths) {
    // data 存储当前候选文件解析出的 JSON 数据。
    const data = await readJsonFile(filePath);
    if (data !== null) {
      return { data, sourcePath: filePath };
    }
  }

  return null;
}

/**
 * 将数据以格式化 JSON 写入文件。
 * @param {string} filePath - 要写入的目标文件路径。
 * @param {unknown} data - 要序列化保存的数据。
 * @param {{baseDir?: string}} options - 可选配置，baseDir 用于确保目录存在。
 * @returns {Promise<void>} 写入完成后 resolve。
 */
export async function writeJsonFile(filePath, data, options = {}) {
  await ensureStorageDir(options);
  // content 存储格式化后的 JSON 文本。
  const content = JSON.stringify(data, null, 2);
  await writeFile(filePath, content, 'utf8');
}
