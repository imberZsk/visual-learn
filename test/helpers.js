import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

/**
 * 创建测试专用临时目录。
 * @param {string} name - 临时目录名称中的业务标识，便于定位失败用例。
 * @returns {Promise<string>} 创建好的临时目录绝对路径。
 */
export async function makeTempDir(name) {
  // dir 存储当前测试独占的临时目录路径。
  const dir = join(tmpdir(), `visual-learn-${name}-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  await mkdir(dir, { recursive: true });
  return dir;
}

/**
 * 递归删除测试临时目录。
 * @param {string} dir - 需要删除的临时目录路径。
 * @returns {Promise<void>} 删除完成后 resolve。
 */
export async function removeTempDir(dir) {
  await rm(dir, { recursive: true, force: true });
}

/**
 * 写入文本文件，并自动创建父目录。
 * @param {string} filePath - 目标文件绝对路径。
 * @param {string} content - 要写入的文本内容。
 * @returns {Promise<void>} 写入完成后 resolve。
 */
export async function writeTextFile(filePath, content) {
  // parentDir 存储目标文件的父目录路径。
  const parentDir = dirname(filePath);
  await mkdir(parentDir, { recursive: true });
  await writeFile(filePath, content, 'utf8');
}
