import { getStorageFilePath, readFirstValidJsonWithSource, writeJsonFile } from './storage.js';

// LEGACY_PROGRESS_PATH 存储旧版本进度文件路径，用于一次性迁移。
const LEGACY_PROGRESS_PATH = '/Users/imber/Desktop/ai/visual-learn/data/progress.json';

/**
 * 获取进度文件路径。
 * @param {{baseDir?: string}} options - 可选配置，baseDir 用于测试隔离。
 * @returns {string} 进度文件绝对路径。
 */
function getProgressFilePath(options = {}) {
  return getStorageFilePath('progress.json', options);
}

/**
 * 标准化进度数据结构。
 * @param {unknown} value - 从 JSON 读取到的原始进度数据。
 * @returns {{entries: Record<string, {completed: boolean, completedAt?: number|null, completed_at?: number|null}>}} 标准进度数据。
 */
function normalizeProgressData(value) {
  // rawData 存储对象形态的进度数据。
  const rawData = value && typeof value === 'object' ? value : {};
  // rawEntries 存储进度条目映射。
  const rawEntries = rawData.entries && typeof rawData.entries === 'object' ? rawData.entries : {};
  // entries 存储清洗后的进度条目映射。
  const entries = {};

  for (const [filePath, entry] of Object.entries(rawEntries)) {
    // completed 存储该文件是否完成。
    const completed = Boolean(entry?.completed);
    if (completed) {
      entries[filePath] = {
        completed: true,
        completedAt: entry.completedAt ?? entry.completed_at ?? null,
      };
    }
  }

  return { entries };
}

/**
 * 从磁盘读取完整进度数据，并兼容旧路径迁移。
 * @param {{baseDir?: string, legacyProgressPath?: string}} options - 读取进度的选项。
 * @returns {Promise<{entries: Record<string, {completed: boolean, completedAt?: number|null}>}>} 完整进度数据。
 */
async function loadProgressData(options = {}) {
  // progressPath 存储新版进度文件路径。
  const progressPath = getProgressFilePath(options);
  // legacyPath 存储旧版进度文件路径。
  const legacyPath = options.legacyProgressPath || LEGACY_PROGRESS_PATH;
  // loaded 存储候选进度文件的读取结果。
  const loaded = await readFirstValidJsonWithSource([progressPath, legacyPath]);
  if (!loaded) {
    return { entries: {} };
  }

  // data 存储标准化后的进度数据。
  const data = normalizeProgressData(loaded.data);
  if (loaded.sourcePath !== progressPath) {
    await saveProgressData(data, options);
  }

  return data;
}

/**
 * 保存完整进度数据。
 * @param {{entries: Record<string, {completed: boolean, completedAt?: number|null}>}} data - 完整进度数据。
 * @param {{baseDir?: string}} options - 写入进度的选项。
 * @returns {Promise<void>} 写入完成后 resolve。
 */
async function saveProgressData(data, options = {}) {
  await writeJsonFile(getProgressFilePath(options), data, options);
}

/**
 * 读取前端使用的简化进度映射。
 * @param {{baseDir?: string, legacyProgressPath?: string}} options - 读取进度的选项。
 * @returns {Promise<Record<string, boolean>>} 文件路径到完成状态的映射。
 */
export async function getProgress(options = {}) {
  // data 存储完整进度数据。
  const data = await loadProgressData(options);
  // result 存储前端使用的简化进度映射。
  const result = {};
  for (const [filePath, entry] of Object.entries(data.entries)) {
    result[filePath] = Boolean(entry.completed);
  }

  return result;
}

/**
 * 设置某个学习文件的完成状态。
 * @param {{filePath: string, completed: boolean, timestamp: number}} payload - 进度更新参数。
 * @param {{baseDir?: string, legacyProgressPath?: string}} options - 写入进度的选项。
 * @returns {Promise<void>} 写入完成后 resolve。
 */
export async function setProgress(payload, options = {}) {
  // data 存储当前完整进度数据。
  const data = await loadProgressData(options);
  // filePath 存储要更新的学习文件路径。
  const filePath = payload.filePath;

  if (payload.completed) {
    data.entries[filePath] = {
      completed: true,
      completedAt: payload.timestamp,
    };
  } else {
    delete data.entries[filePath];
  }

  await saveProgressData(data, options);
}
