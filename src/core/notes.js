import { readFile } from 'node:fs/promises';
import { isAbsolute, resolve, relative } from 'node:path';

/**
 * 判断目标路径是否位于学习目录内。
 * @param {string} filePath - 待读取文件路径。
 * @param {string} studyRoot - 允许读取的学习目录根路径。
 * @returns {boolean} 在目录内或等于根目录时返回 true。
 */
function isPathInsideStudyRoot(filePath, studyRoot) {
  // resolvedFile 存储规范化后的文件路径。
  const resolvedFile = resolve(filePath);
  // resolvedRoot 存储规范化后的学习目录路径。
  const resolvedRoot = resolve(studyRoot);
  // relativePath 存储文件相对学习目录的路径。
  const relativePath = relative(resolvedRoot, resolvedFile);

  return relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath));
}

/**
 * 读取 Markdown 文件内容，并限制只能读取学习目录内的文件。
 * @param {{filePath: string, studyRoot: string}} payload - 读取参数。
 * @returns {Promise<string>} Markdown 文本内容。
 */
export async function readMarkdownContent(payload) {
  if (!isPathInsideStudyRoot(payload.filePath, payload.studyRoot)) {
    throw new Error('无权读取学习目录之外的文件');
  }

  return readFile(payload.filePath, 'utf8');
}
