import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { getStorageFilePath, readFirstValidJsonWithSource, writeJsonFile } from './storage.js';

// PRIMARY_STUDY_PATH 存储新版默认文章目录。
const PRIMARY_STUDY_PATH = '/Users/imber/Desktop/knowledge';
// LEGACY_STUDY_PATH 存储旧版默认文章目录。
const LEGACY_STUDY_PATH = '/Users/imber/Desktop/imber';
// LEGACY_CONFIG_PATH 存储旧版配置文件路径。
const LEGACY_CONFIG_PATH = '/Users/imber/.visual-learn-config.json';

/**
 * 判断路径是否是存在的目录。
 * @param {string} dirPath - 待检查的目录路径。
 * @returns {boolean} 路径存在且是目录时返回 true。
 */
function isDirectory(dirPath) {
  try {
    return statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

/**
 * 获取当前机器上的默认学习目录。
 * @param {{defaultStudyPath?: string}} options - 可选配置，defaultStudyPath 用于测试或运行时覆盖。
 * @returns {string} 默认学习目录路径。
 */
export function getDefaultStudyPath(options = {}) {
  if (options.defaultStudyPath) {
    return options.defaultStudyPath;
  }

  return existsSync(PRIMARY_STUDY_PATH) ? PRIMARY_STUDY_PATH : LEGACY_STUDY_PATH;
}

/**
 * 获取当前配置文件路径。
 * @param {{baseDir?: string}} options - 可选配置，baseDir 用于测试隔离。
 * @returns {string} 配置文件绝对路径。
 */
function getConfigFilePath(options = {}) {
  return getStorageFilePath('config.json', options);
}

/**
 * 标准化配置对象，补齐旧配置缺失字段。
 * @param {unknown} value - 从 JSON 读取到的原始配置。
 * @param {string} defaultStudyPath - 当前默认学习目录。
 * @returns {{studyPath: string, vscodePath: string}} 标准配置。
 */
function normalizeConfig(value, defaultStudyPath) {
  // rawConfig 存储对象形态的配置数据。
  const rawConfig = value && typeof value === 'object' ? value : {};
  // studyPath 存储文章目录路径，空值时使用默认目录。
  const studyPath = typeof rawConfig.study_path === 'string'
    ? rawConfig.study_path
    : typeof rawConfig.studyPath === 'string'
      ? rawConfig.studyPath
      : defaultStudyPath;
  // vscodePath 存储 VSCode 打开目录，空值时跟随文章目录。
  const vscodePath = typeof rawConfig.vscode_path === 'string'
    ? rawConfig.vscode_path
    : typeof rawConfig.vscodePath === 'string'
      ? rawConfig.vscodePath
      : studyPath;

  return {
    studyPath: studyPath.trim() ? studyPath : defaultStudyPath,
    vscodePath: vscodePath.trim() ? vscodePath : (studyPath.trim() ? studyPath : defaultStudyPath),
  };
}

/**
 * 读取应用配置，并在需要时迁移旧路径或补齐字段。
 * @param {{baseDir?: string, defaultStudyPath?: string, legacyConfigPath?: string}} options - 读取配置的选项。
 * @returns {Promise<{studyPath: string, vscodePath: string}>} 应用配置。
 */
export async function loadConfig(options = {}) {
  // defaultStudyPath 存储当前机器可用的默认学习目录。
  const defaultStudyPath = getDefaultStudyPath(options);
  // configPath 存储新版配置文件路径。
  const configPath = getConfigFilePath(options);
  // legacyPath 存储旧版配置文件路径；测试注入 baseDir 时默认隔离真实用户配置。
  const legacyPath = options.legacyConfigPath || (options.baseDir ? null : LEGACY_CONFIG_PATH);
  // candidatePaths 存储按优先级排列的配置读取候选路径。
  const candidatePaths = [configPath, legacyPath].filter(Boolean);
  // loaded 存储候选配置文件的第一个有效读取结果。
  const loaded = await readFirstValidJsonWithSource(candidatePaths);

  if (!loaded) {
    return { studyPath: defaultStudyPath, vscodePath: defaultStudyPath };
  }

  // config 存储标准化后的配置对象。
  const config = normalizeConfig(loaded.data, defaultStudyPath);
  // shouldPersist 标记是否需要写回新版配置文件。
  const shouldPersist = loaded.sourcePath !== configPath || JSON.stringify(loaded.data) !== JSON.stringify(config);
  if (shouldPersist) {
    await writeJsonFile(configPath, config, options);
  }

  return config;
}

/**
 * 校验用户配置的目录路径存在且为目录。
 * @param {string} dirPath - 用户输入的目录路径。
 * @param {string} label - 错误提示中的目录类型名称。
 * @returns {void} 校验失败时抛出错误。
 */
function validateDirectory(dirPath, label) {
  if (!isDirectory(dirPath)) {
    throw new Error(`${label}不存在或不是目录: ${dirPath}`);
  }
}

/**
 * 保存文章目录配置；当 VSCode 目录此前跟随文章目录时同步更新。
 * @param {string} studyPath - 新的文章目录路径。
 * @param {{baseDir?: string, defaultStudyPath?: string}} options - 写入配置的选项。
 * @returns {Promise<void>} 写入完成后 resolve。
 */
export async function setStudyPath(studyPath, options = {}) {
  validateDirectory(studyPath, '文章目录');
  // config 存储当前完整配置，避免更新文章目录时丢失 VSCode 目录。
  const config = await loadConfig(options);
  // vscodeShouldFollow 标记 VSCode 目录是否仍跟随旧文章目录。
  const vscodeShouldFollow = config.vscodePath === config.studyPath;
  // nextConfig 存储写回文件的新配置。
  const nextConfig = {
    studyPath,
    vscodePath: vscodeShouldFollow ? studyPath : config.vscodePath,
  };

  await writeJsonFile(getConfigFilePath(options), nextConfig, options);
}

/**
 * 保存 VSCode 打开目录配置。
 * @param {string} vscodePath - 新的 VSCode 打开目录路径。
 * @param {{baseDir?: string, defaultStudyPath?: string}} options - 写入配置的选项。
 * @returns {Promise<void>} 写入完成后 resolve。
 */
export async function setVscodePath(vscodePath, options = {}) {
  validateDirectory(vscodePath, 'VSCode 目录');
  // config 存储当前完整配置，避免更新 VSCode 目录时丢失文章目录。
  const config = await loadConfig(options);
  // nextConfig 存储写回文件的新配置。
  const nextConfig = {
    studyPath: config.studyPath,
    vscodePath,
  };

  await writeJsonFile(getConfigFilePath(options), nextConfig, options);
}

/**
 * 读取当前学习目录路径。
 * @param {{baseDir?: string, defaultStudyPath?: string}} options - 读取配置的选项。
 * @returns {Promise<string>} 学习目录路径。
 */
export async function getStudyPath(options = {}) {
  // config 存储当前应用配置。
  const config = await loadConfig(options);
  return config.studyPath;
}

/**
 * 读取当前 VSCode 打开目录路径。
 * @param {{baseDir?: string, defaultStudyPath?: string}} options - 读取配置的选项。
 * @returns {Promise<string>} VSCode 打开目录路径。
 */
export async function getVscodePath(options = {}) {
  // config 存储当前应用配置。
  const config = await loadConfig(options);
  return config.vscodePath;
}

/**
 * 兼容测试或调试时定位配置文件。
 * @param {{baseDir?: string}} options - 可选配置，baseDir 用于测试隔离。
 * @returns {string} 配置文件路径。
 */
export function getConfigPath(options = {}) {
  return join(getConfigFilePath(options));
}
