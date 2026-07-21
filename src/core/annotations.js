import { getStorageFilePath, readFirstValidJsonWithSource, writeJsonFile } from './storage.js';

// DEFAULT_COLOR 存储当前标注默认高亮颜色。
const DEFAULT_COLOR = 'yellow';

/**
 * 获取标注文件路径。
 * @param {{baseDir?: string}} options - 可选配置，baseDir 用于测试隔离。
 * @returns {string} 标注文件绝对路径。
 */
function getAnnotationsFilePath(options = {}) {
  return getStorageFilePath('annotations.json', options);
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
 * 将任意值转成字符串。
 * @param {unknown} value - 需要转换的数据。
 * @returns {string} 可用于持久化的字符串。
 */
function toStringValue(value) {
  return typeof value === 'string' ? value : '';
}

/**
 * 标准化单条标注记录。
 * @param {unknown} value - 从 JSON 或 payload 读取到的原始标注数据。
 * @param {string} filePath - 标注所属文章路径。
 * @returns {object|null} 合法标注返回标准对象，否则返回 null。
 */
function normalizeAnnotation(value, filePath) {
  if (!isRecord(value)) return null;

  // id 存储标注唯一标识。
  const id = toStringValue(value.id);
  // quote 存储用户选中的原文片段。
  const quote = toStringValue(value.quote);
  // startOffset 存储标注起始纯文本偏移量。
  const startOffset = toFiniteNumber(value.startOffset, -1);
  // endOffset 存储标注结束纯文本偏移量。
  const endOffset = toFiniteNumber(value.endOffset, -1);
  if (!id || !quote || startOffset < 0 || endOffset <= startOffset) return null;

  // createdAt 存储标注创建时间戳。
  const createdAt = toFiniteNumber(value.createdAt, Date.now());
  // updatedAt 存储标注最后更新时间戳。
  const updatedAt = toFiniteNumber(value.updatedAt, createdAt);

  return {
    id,
    filePath,
    quote,
    startOffset,
    endOffset,
    prefix: toStringValue(value.prefix),
    suffix: toStringValue(value.suffix),
    comment: toStringValue(value.comment),
    color: toStringValue(value.color) || DEFAULT_COLOR,
    createdAt,
    updatedAt,
  };
}

/**
 * 标准化指定文章的标注列表。
 * @param {unknown} value - 原始标注列表。
 * @param {string} filePath - 标注所属文章路径。
 * @returns {object[]} 标准标注列表。
 */
function normalizeAnnotationList(value, filePath) {
  if (!Array.isArray(value)) return [];

  // annotations 存储清洗后的标注列表。
  const annotations = [];
  for (const item of value) {
    // annotation 存储当前条目清洗后的标注。
    const annotation = normalizeAnnotation(item, filePath);
    if (annotation) annotations.push(annotation);
  }

  return annotations;
}

/**
 * 标准化完整标注数据结构。
 * @param {unknown} value - 从 JSON 读取到的原始数据。
 * @returns {{entries: Record<string, object[]>}} 标准标注数据。
 */
function normalizeAnnotationsData(value) {
  // rawData 存储对象形态的完整标注数据。
  const rawData = isRecord(value) ? value : {};
  // rawEntries 存储文件路径到标注列表的原始映射。
  const rawEntries = isRecord(rawData.entries) ? rawData.entries : {};
  // entries 存储清洗后的文件路径到标注列表映射。
  const entries = {};

  for (const [filePath, list] of Object.entries(rawEntries)) {
    // annotations 存储当前文章清洗后的标注列表。
    const annotations = normalizeAnnotationList(list, filePath);
    if (annotations.length > 0) {
      entries[filePath] = annotations;
    }
  }

  return { entries };
}

/**
 * 读取完整标注数据。
 * @param {{baseDir?: string}} options - 可选配置，baseDir 用于测试隔离。
 * @returns {Promise<{entries: Record<string, object[]>}>} 完整标注数据。
 */
async function loadAnnotationsData(options = {}) {
  // loaded 存储标注文件读取结果。
  const loaded = await readFirstValidJsonWithSource([getAnnotationsFilePath(options)]);
  return normalizeAnnotationsData(loaded?.data);
}

/**
 * 保存完整标注数据。
 * @param {{entries: Record<string, object[]>}} data - 完整标注数据。
 * @param {{baseDir?: string}} options - 可选配置，baseDir 用于测试隔离。
 * @returns {Promise<void>} 写入完成后 resolve。
 */
async function saveAnnotationsData(data, options = {}) {
  await writeJsonFile(getAnnotationsFilePath(options), data, options);
}

/**
 * 生成标注唯一 ID。
 * @param {number} timestamp - 创建标注时的时间戳。
 * @returns {string} 标注唯一 ID。
 */
function makeAnnotationId(timestamp) {
  // randomPart 存储随机后缀，降低同一毫秒内重复创建时的冲突概率。
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `annotation-${timestamp}-${randomPart}`;
}

/**
 * 读取指定文章的标注列表。
 * @param {string} filePath - 文章绝对路径。
 * @param {{baseDir?: string}} options - 可选配置，baseDir 用于测试隔离。
 * @returns {Promise<object[]>} 当前文章的标注列表。
 */
export async function getAnnotations(filePath, options = {}) {
  // data 存储完整标注数据。
  const data = await loadAnnotationsData(options);
  return data.entries[filePath] || [];
}

/**
 * 创建文章标注。
 * @param {{filePath: string, quote: string, startOffset: number, endOffset: number, prefix?: string, suffix?: string, comment?: string, color?: string, timestamp?: number}} payload - 新建标注参数。
 * @param {{baseDir?: string}} options - 可选配置，baseDir 用于测试隔离。
 * @returns {Promise<object>} 创建后的完整标注记录。
 */
export async function createAnnotation(payload, options = {}) {
  // data 存储完整标注数据。
  const data = await loadAnnotationsData(options);
  // filePath 存储标注关联的文章路径。
  const filePath = toStringValue(payload?.filePath);
  // timestamp 存储本次创建标注的时间戳。
  const timestamp = toFiniteNumber(payload?.timestamp, Date.now());
  // annotation 存储准备写入的新标注记录。
  const annotation = normalizeAnnotation({
    id: makeAnnotationId(timestamp),
    filePath,
    quote: payload?.quote,
    startOffset: payload?.startOffset,
    endOffset: payload?.endOffset,
    prefix: payload?.prefix,
    suffix: payload?.suffix,
    comment: payload?.comment,
    color: payload?.color || DEFAULT_COLOR,
    createdAt: timestamp,
    updatedAt: timestamp,
  }, filePath);

  if (!filePath || !annotation) {
    throw new Error('标注参数不完整');
  }

  // entries 存储当前文章已有标注列表。
  const entries = data.entries[filePath] || [];
  data.entries[filePath] = [...entries, annotation];
  await saveAnnotationsData(data, options);
  return annotation;
}

/**
 * 更新文章标注。
 * @param {{filePath: string, id: string, comment?: string, color?: string, startOffset?: number, endOffset?: number, prefix?: string, suffix?: string, timestamp?: number}} payload - 更新标注参数。
 * @param {{baseDir?: string}} options - 可选配置，baseDir 用于测试隔离。
 * @returns {Promise<object>} 更新后的完整标注记录。
 */
export async function updateAnnotation(payload, options = {}) {
  // data 存储完整标注数据。
  const data = await loadAnnotationsData(options);
  // filePath 存储标注关联的文章路径。
  const filePath = toStringValue(payload?.filePath);
  // id 存储要更新的标注 ID。
  const id = toStringValue(payload?.id);
  // annotations 存储当前文章已有标注列表。
  const annotations = data.entries[filePath] || [];
  // index 存储目标标注在当前文章列表中的位置。
  const index = annotations.findIndex((annotation) => annotation.id === id);
  if (index < 0) {
    throw new Error('标注不存在');
  }

  // previous 存储更新前的标注记录。
  const previous = annotations[index];
  // timestamp 存储本次更新的时间戳。
  const timestamp = toFiniteNumber(payload?.timestamp, Date.now());
  // updated 存储合并 payload 后的标注记录。
  const updated = {
    ...previous,
    comment: payload?.comment === undefined ? previous.comment : toStringValue(payload.comment),
    color: payload?.color === undefined ? previous.color : (toStringValue(payload.color) || DEFAULT_COLOR),
    startOffset: payload?.startOffset === undefined ? previous.startOffset : toFiniteNumber(payload.startOffset, previous.startOffset),
    endOffset: payload?.endOffset === undefined ? previous.endOffset : toFiniteNumber(payload.endOffset, previous.endOffset),
    prefix: payload?.prefix === undefined ? previous.prefix : toStringValue(payload.prefix),
    suffix: payload?.suffix === undefined ? previous.suffix : toStringValue(payload.suffix),
    updatedAt: timestamp,
  };

  annotations[index] = updated;
  data.entries[filePath] = annotations;
  await saveAnnotationsData(data, options);
  return updated;
}

/**
 * 删除文章标注。
 * @param {{filePath: string, id: string}} payload - 删除标注参数。
 * @param {{baseDir?: string}} options - 可选配置，baseDir 用于测试隔离。
 * @returns {Promise<void>} 删除完成后 resolve。
 */
export async function deleteAnnotation(payload, options = {}) {
  // data 存储完整标注数据。
  const data = await loadAnnotationsData(options);
  // filePath 存储标注关联的文章路径。
  const filePath = toStringValue(payload?.filePath);
  // id 存储要删除的标注 ID。
  const id = toStringValue(payload?.id);
  // annotations 存储删除目标后剩余的当前文章标注列表。
  const annotations = (data.entries[filePath] || []).filter((annotation) => annotation.id !== id);

  if (annotations.length > 0) {
    data.entries[filePath] = annotations;
  } else {
    delete data.entries[filePath];
  }

  await saveAnnotationsData(data, options);
}
