import { IPC } from './ipcChannels.js';
import { getStudyPath, getVscodePath, setStudyPath, setVscodePath } from '../src/core/config.js';
import { scanStudyNotes } from '../src/core/studyScanner.js';
import { readMarkdownContent } from '../src/core/notes.js';
import { getProgress, setProgress } from '../src/core/progress.js';
import { getAnnotations, createAnnotation, updateAnnotation, deleteAnnotation } from '../src/core/annotations.js';
import { getArticleSummaries, getArticleSummary, setArticleSummary } from '../src/core/articleSummaries.js';
import { getPreference, setPreference } from '../src/core/preferences.js';
import { openInVscode as defaultOpenInVscode } from '../src/core/vscode.js';

/**
 * 从 payload 中读取字符串字段。
 * @param {object} payload - IPC payload。
 * @param {string} key - 字段名。
 * @returns {string} 字符串字段值。
 */
function requireString(payload, key) {
  // value 存储 payload 中指定字段的原始值。
  const value = payload?.[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`缺少参数: ${key}`);
  }

  return value;
}

/**
 * 从 payload 中读取可选字符串字段。
 * @param {object} payload - IPC payload。
 * @param {string} key - 字段名。
 * @returns {string|undefined} 字段不存在时返回 undefined。
 */
function readOptionalString(payload, key) {
  // value 存储 payload 中指定字段的原始值。
  const value = payload?.[key];
  return typeof value === 'string' ? value : undefined;
}

/**
 * 从 payload 中读取数字字段。
 * @param {object} payload - IPC payload。
 * @param {string} key - 字段名。
 * @returns {number} 有限数字字段值。
 */
function requireNumber(payload, key) {
  // value 存储 payload 中指定字段转换后的数字。
  const value = Number(payload?.[key]);
  if (!Number.isFinite(value)) {
    throw new Error(`缺少参数: ${key}`);
  }

  return value;
}

/**
 * 从 payload 中读取可选数字字段。
 * @param {object} payload - IPC payload。
 * @param {string} key - 字段名。
 * @returns {number|undefined} 字段不存在或非有限数字时返回 undefined。
 */
function readOptionalNumber(payload, key) {
  if (payload?.[key] === undefined) return undefined;

  // value 存储 payload 中指定字段转换后的数字。
  const value = Number(payload[key]);
  return Number.isFinite(value) ? value : undefined;
}

/**
 * 生成传给核心服务的共享选项。
 * @param {object} deps - IPC 依赖注入对象。
 * @returns {{baseDir?: string, defaultStudyPath?: string}} 核心服务选项。
 */
function makeCoreOptions(deps) {
  return {
    baseDir: deps.dataDir,
    defaultStudyPath: deps.defaultStudyPath,
  };
}

/**
 * 注册所有 Electron IPC handler。
 * @param {Electron.IpcMain|object} ipcMain - Electron ipcMain 或测试替身。
 * @param {object} deps - 依赖注入对象，包含 dialog/dataDir/openInVscode 等。
 * @returns {void}
 */
export function registerIpcHandlers(ipcMain, deps = {}) {
  // coreOptions 存储传给核心服务的共享选项。
  const coreOptions = makeCoreOptions(deps);
  // openInVscode 存储 VSCode 打开函数，测试可注入替身。
  const openInVscode = deps.openInVscode || defaultOpenInVscode;
  // dialog 存储 Electron 原生 dialog 模块。
  const dialog = deps.dialog;

  ipcMain.handle(IPC.GET_STUDY_PATH, async () => getStudyPath(coreOptions));

  ipcMain.handle(IPC.SET_STUDY_PATH, async (_event, payload = {}) => {
    // path 存储用户选择的学习目录路径。
    const path = requireString(payload, 'path');
    await setStudyPath(path, coreOptions);
    return true;
  });

  ipcMain.handle(IPC.GET_VSCODE_PATH, async () => getVscodePath(coreOptions));

  ipcMain.handle(IPC.SET_VSCODE_PATH, async (_event, payload = {}) => {
    // path 存储用户选择的 VSCode 打开目录路径。
    const path = requireString(payload, 'path');
    await setVscodePath(path, coreOptions);
    return true;
  });

  ipcMain.handle(IPC.SCAN_STUDY_NOTES, async (_event, payload = {}) => {
    // studyRoot 存储本次扫描的学习目录根路径。
    const studyRoot = requireString(payload, 'studyRoot');
    return scanStudyNotes(studyRoot);
  });

  ipcMain.handle(IPC.READ_MD_CONTENT, async (_event, payload = {}) => readMarkdownContent({
    filePath: requireString(payload, 'filePath'),
    studyRoot: requireString(payload, 'studyRoot'),
  }));

  ipcMain.handle(IPC.GET_PROGRESS, async () => getProgress(coreOptions));

  ipcMain.handle(IPC.SET_PROGRESS, async (_event, payload = {}) => {
    await setProgress({
      filePath: requireString(payload, 'filePath'),
      completed: Boolean(payload.completed),
      timestamp: Number(payload.timestamp),
    }, coreOptions);
    return true;
  });

  ipcMain.handle(IPC.GET_ANNOTATIONS, async (_event, payload = {}) => getAnnotations(requireString(payload, 'filePath'), coreOptions));

  ipcMain.handle(IPC.CREATE_ANNOTATION, async (_event, payload = {}) => createAnnotation({
    filePath: requireString(payload, 'filePath'),
    quote: requireString(payload, 'quote'),
    startOffset: requireNumber(payload, 'startOffset'),
    endOffset: requireNumber(payload, 'endOffset'),
    prefix: readOptionalString(payload, 'prefix') || '',
    suffix: readOptionalString(payload, 'suffix') || '',
    comment: readOptionalString(payload, 'comment') || '',
    color: readOptionalString(payload, 'color') || 'yellow',
    timestamp: readOptionalNumber(payload, 'timestamp') || Date.now(),
  }, coreOptions));

  ipcMain.handle(IPC.UPDATE_ANNOTATION, async (_event, payload = {}) => updateAnnotation({
    filePath: requireString(payload, 'filePath'),
    id: requireString(payload, 'id'),
    comment: readOptionalString(payload, 'comment'),
    color: readOptionalString(payload, 'color'),
    startOffset: readOptionalNumber(payload, 'startOffset'),
    endOffset: readOptionalNumber(payload, 'endOffset'),
    prefix: readOptionalString(payload, 'prefix'),
    suffix: readOptionalString(payload, 'suffix'),
    timestamp: readOptionalNumber(payload, 'timestamp') || Date.now(),
  }, coreOptions));

  ipcMain.handle(IPC.DELETE_ANNOTATION, async (_event, payload = {}) => {
    await deleteAnnotation({
      filePath: requireString(payload, 'filePath'),
      id: requireString(payload, 'id'),
    }, coreOptions);
    return true;
  });

  ipcMain.handle(IPC.GET_ARTICLE_SUMMARIES, async () => getArticleSummaries(coreOptions));

  ipcMain.handle(IPC.GET_ARTICLE_SUMMARY, async (_event, payload = {}) => getArticleSummary(requireString(payload, 'filePath'), coreOptions));

  ipcMain.handle(IPC.SET_ARTICLE_SUMMARY, async (_event, payload = {}) => setArticleSummary({
    filePath: requireString(payload, 'filePath'),
    content: readOptionalString(payload, 'content') || '',
    timestamp: readOptionalNumber(payload, 'timestamp') || Date.now(),
  }, coreOptions));

  ipcMain.handle(IPC.GET_PREFERENCE, async (_event, payload = {}) => getPreference(requireString(payload, 'key'), coreOptions));

  ipcMain.handle(IPC.SET_PREFERENCE, async (_event, payload = {}) => {
    await setPreference(requireString(payload, 'key'), requireString(payload, 'value'), coreOptions);
    return true;
  });

  ipcMain.handle(IPC.OPEN_IN_VSCODE, async (_event, payload = {}) => {
    // targetPath 存储要用 VSCode 打开的路径。
    const targetPath = requireString(payload, 'targetPath');
    // result 存储 VSCode 打开操作结果。
    const result = await openInVscode(targetPath);
    if (!result.success) {
      throw new Error(result.error || 'VSCode 打开失败');
    }
    return true;
  });

  ipcMain.handle(IPC.SELECT_DIRECTORY, async (_event, payload = {}) => {
    if (!dialog?.showOpenDialog) {
      return { canceled: true };
    }

    // result 存储系统目录选择器返回值。
    const result = await dialog.showOpenDialog({
      defaultPath: payload.defaultPath || undefined,
      properties: ['openDirectory'],
    });
    if (result.canceled || !result.filePaths?.[0]) {
      return { canceled: true };
    }

    return { canceled: false, path: result.filePaths[0] };
  });
}
