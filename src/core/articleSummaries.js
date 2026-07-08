import { getStorageFilePath, readFirstValidJsonWithSource, writeJsonFile } from './storage.js';

// SUMMARY_FILE_NAME 存储文章总总结使用的持久化文件名。
const SUMMARY_FILE_NAME = 'article-summaries.json';

/**
 * 获取文章总总结文件路径。
 * @param {{baseDir?: string}} options - 可选配置，baseDir 用于测试隔离。
 * @returns {string} 总总结文件绝对路径。
 */
function getArticleSummariesFilePath(options = {}) {
  return getStorageFilePath(SUMMARY_FILE_NAME, options);
}

/**
 * 判断传入值是否为普通对象。
 * @param {unknown} value - 需要判断的数据。
 * @returns {boolean} 普通对象返回 true。
 */
function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * 将任意值转成字符串。
 * @param {unknown} value - 需要转换的数据。
 * @returns {string} 可用于持久化的字符串。
 */
function toStringValue(value) {
  return typeof value === 'string' ? value : '';
}

/**
 * 将任意值转成有限数字。
 * @param {unknown} value - 需要转换的数据。
 * @param {number} fallback - 转换失败时使用的默认值。
 * @returns {number} 可用于持久化的数字。
 */
function toFiniteNumber(value, fallback) {
  // number 存储强制转换后的数字。
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

/**
 * 标准化单篇文章的总总结记录。
 * @param {unknown} value - 从 JSON 读取到的原始总结数据。
 * @param {string} filePath - 总总结所属文章路径。
 * @returns {{filePath: string, content: string, createdAt: number, updatedAt: number}|null} 合法总结返回标准对象。
 */
function normalizeArticleSummary(value, filePath) {
  if (!isRecord(value)) return null;

  // content 存储用户用费曼学习法写下的文章总总结。
  const content = toStringValue(value.content).trim();
  if (!filePath || !content) return null;

  // createdAt 存储总结首次创建时间戳。
  const createdAt = toFiniteNumber(value.createdAt, Date.now());
  // updatedAt 存储总结最后更新时间戳。
  const updatedAt = toFiniteNumber(value.updatedAt, createdAt);

  return {
    filePath,
    content,
    createdAt,
    updatedAt,
  };
}

/**
 * 标准化完整文章总总结数据结构。
 * @param {unknown} value - 从 JSON 读取到的原始数据。
 * @returns {{entries: Record<string, {filePath: string, content: string, createdAt: number, updatedAt: number}>}} 标准总结数据。
 */
function normalizeArticleSummariesData(value) {
  // rawData 存储对象形态的完整总结数据。
  const rawData = isRecord(value) ? value : {};
  // rawEntries 存储文件路径到总结记录的原始映射。
  const rawEntries = isRecord(rawData.entries) ? rawData.entries : {};
  // entries 存储清洗后的文件路径到总结记录映射。
  const entries = {};

  for (const [filePath, summaryValue] of Object.entries(rawEntries)) {
    // summary 存储当前文章清洗后的总总结。
    const summary = normalizeArticleSummary(summaryValue, filePath);
    if (summary) {
      entries[filePath] = summary;
    }
  }

  return { entries };
}

/**
 * 读取完整文章总总结数据。
 * @param {{baseDir?: string}} options - 可选配置，baseDir 用于测试隔离。
 * @returns {Promise<{entries: Record<string, {filePath: string, content: string, createdAt: number, updatedAt: number}>}>} 完整总结数据。
 */
async function loadArticleSummariesData(options = {}) {
  // loaded 存储总总结文件读取结果。
  const loaded = await readFirstValidJsonWithSource([getArticleSummariesFilePath(options)]);
  return normalizeArticleSummariesData(loaded?.data);
}

/**
 * 保存完整文章总总结数据。
 * @param {{entries: Record<string, {filePath: string, content: string, createdAt: number, updatedAt: number}>}} data - 完整总结数据。
 * @param {{baseDir?: string}} options - 可选配置，baseDir 用于测试隔离。
 * @returns {Promise<void>} 写入完成后 resolve。
 */
async function saveArticleSummariesData(data, options = {}) {
  await writeJsonFile(getArticleSummariesFilePath(options), data, options);
}

/**
 * 读取所有文章总总结，用于左侧列表显示是否已总结。
 * @param {{baseDir?: string}} options - 可选配置，baseDir 用于测试隔离。
 * @returns {Promise<Record<string, {filePath: string, content: string, createdAt: number, updatedAt: number}>>} 文件路径到总结记录的映射。
 */
export async function getArticleSummaries(options = {}) {
  // data 存储完整文章总总结数据。
  const data = await loadArticleSummariesData(options);
  return data.entries;
}

/**
 * 读取指定文章的总总结。
 * @param {string} filePath - 文章绝对路径。
 * @param {{baseDir?: string}} options - 可选配置，baseDir 用于测试隔离。
 * @returns {Promise<{filePath: string, content: string, createdAt: number, updatedAt: number}|null>} 命中返回总结记录。
 */
export async function getArticleSummary(filePath, options = {}) {
  // data 存储完整文章总总结数据。
  const data = await loadArticleSummariesData(options);
  return data.entries[filePath] || null;
}

/**
 * 创建、更新或清空指定文章的总总结。
 * @param {{filePath: string, content: string, timestamp?: number}} payload - 总总结保存参数。
 * @param {{baseDir?: string}} options - 可选配置，baseDir 用于测试隔离。
 * @returns {Promise<{filePath: string, content: string, createdAt: number, updatedAt: number}|null>} 清空内容时返回 null。
 */
export async function setArticleSummary(payload, options = {}) {
  // data 存储完整文章总总结数据。
  const data = await loadArticleSummariesData(options);
  // filePath 存储总结关联的文章路径。
  const filePath = toStringValue(payload?.filePath);
  // content 存储去掉首尾空白后的总结正文。
  const content = toStringValue(payload?.content).trim();
  // timestamp 存储本次保存总结的时间戳。
  const timestamp = toFiniteNumber(payload?.timestamp, Date.now());

  if (!filePath) {
    throw new Error('总结参数不完整');
  }

  if (!content) {
    delete data.entries[filePath];
    await saveArticleSummariesData(data, options);
    return null;
  }

  // previous 存储当前文章已有的总结记录。
  const previous = data.entries[filePath] || null;
  // summary 存储准备写入的新总结记录。
  const summary = {
    filePath,
    content,
    createdAt: previous?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  data.entries[filePath] = summary;
  await saveArticleSummariesData(data, options);
  return summary;
}
