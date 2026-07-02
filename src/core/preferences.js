import { getStorageFilePath, readFirstValidJsonWithSource, writeJsonFile } from './storage.js';

/**
 * 获取偏好文件路径。
 * @param {{baseDir?: string}} options - 可选配置，baseDir 用于测试隔离。
 * @returns {string} 偏好文件绝对路径。
 */
function getPreferencesFilePath(options = {}) {
  return getStorageFilePath('preferences.json', options);
}

/**
 * 读取偏好数据。
 * @param {{baseDir?: string}} options - 可选配置，baseDir 用于测试隔离。
 * @returns {Promise<{values: Record<string, string>}>} 偏好键值对象。
 */
async function loadPreferences(options = {}) {
  // loaded 存储偏好文件读取结果。
  const loaded = await readFirstValidJsonWithSource([getPreferencesFilePath(options)]);
  // values 存储偏好键值映射。
  const values = loaded?.data?.values && typeof loaded.data.values === 'object' ? loaded.data.values : {};
  return { values };
}

/**
 * 读取指定偏好值。
 * @param {string} key - 偏好项名称。
 * @param {{baseDir?: string}} options - 可选配置，baseDir 用于测试隔离。
 * @returns {Promise<string|null>} 命中返回字符串，缺失返回 null。
 */
export async function getPreference(key, options = {}) {
  // preferences 存储当前偏好数据。
  const preferences = await loadPreferences(options);
  // value 存储指定 key 对应的偏好值。
  const value = preferences.values[key];
  return typeof value === 'string' ? value : null;
}

/**
 * 写入指定偏好值。
 * @param {string} key - 偏好项名称。
 * @param {string} value - 要保存的偏好值。
 * @param {{baseDir?: string}} options - 可选配置，baseDir 用于测试隔离。
 * @returns {Promise<void>} 写入完成后 resolve。
 */
export async function setPreference(key, value, options = {}) {
  // preferences 存储当前偏好数据。
  const preferences = await loadPreferences(options);
  preferences.values[key] = value;
  await writeJsonFile(getPreferencesFilePath(options), preferences, options);
}
