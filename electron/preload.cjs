const { contextBridge, ipcRenderer } = require('electron');

// IPC 通道名常量：preload 使用 CommonJS，故在此内联一份并与 electron/ipcChannels.js 保持一致。
const IPC = {
  GET_STUDY_PATH: 'visual-learn:get-study-path',
  SET_STUDY_PATH: 'visual-learn:set-study-path',
  GET_VSCODE_PATH: 'visual-learn:get-vscode-path',
  SET_VSCODE_PATH: 'visual-learn:set-vscode-path',
  SCAN_STUDY_NOTES: 'visual-learn:scan-study-notes',
  READ_MD_CONTENT: 'visual-learn:read-md-content',
  GET_PROGRESS: 'visual-learn:get-progress',
  SET_PROGRESS: 'visual-learn:set-progress',
  GET_PREFERENCE: 'visual-learn:get-preference',
  SET_PREFERENCE: 'visual-learn:set-preference',
  OPEN_IN_VSCODE: 'visual-learn:open-in-vscode',
  SELECT_DIRECTORY: 'visual-learn:select-directory',
};

contextBridge.exposeInMainWorld('visualLearn', {
  /**
   * 读取学习目录路径。
   * @returns {Promise<string>} 学习目录路径。
   */
  getStudyPath: () => ipcRenderer.invoke(IPC.GET_STUDY_PATH),
  /**
   * 保存学习目录路径。
   * @param {string} path - 学习目录路径。
   * @returns {Promise<boolean>} 保存结果。
   */
  setStudyPath: (path) => ipcRenderer.invoke(IPC.SET_STUDY_PATH, { path }),
  /**
   * 读取 VSCode 打开目录路径。
   * @returns {Promise<string>} VSCode 打开目录路径。
   */
  getVscodePath: () => ipcRenderer.invoke(IPC.GET_VSCODE_PATH),
  /**
   * 保存 VSCode 打开目录路径。
   * @param {string} path - VSCode 打开目录路径。
   * @returns {Promise<boolean>} 保存结果。
   */
  setVscodePath: (path) => ipcRenderer.invoke(IPC.SET_VSCODE_PATH, { path }),
  /**
   * 扫描学习资料。
   * @param {{studyRoot: string}} payload - 扫描参数。
   * @returns {Promise<object[]>} 分类列表。
   */
  scanStudyNotes: (payload) => ipcRenderer.invoke(IPC.SCAN_STUDY_NOTES, payload),
  /**
   * 读取 Markdown 内容。
   * @param {{filePath: string, studyRoot: string}} payload - 读取参数。
   * @returns {Promise<string>} Markdown 文本内容。
   */
  readMdContent: (payload) => ipcRenderer.invoke(IPC.READ_MD_CONTENT, payload),
  /**
   * 获取学习进度。
   * @returns {Promise<Record<string, boolean>>} 文件路径到完成状态的映射。
   */
  getProgress: () => ipcRenderer.invoke(IPC.GET_PROGRESS),
  /**
   * 设置学习进度。
   * @param {{filePath: string, completed: boolean, timestamp: number}} payload - 进度更新参数。
   * @returns {Promise<boolean>} 保存结果。
   */
  setProgress: (payload) => ipcRenderer.invoke(IPC.SET_PROGRESS, payload),
  /**
   * 读取轻量偏好。
   * @param {string} key - 偏好键。
   * @returns {Promise<string|null>} 偏好值。
   */
  getPreference: (key) => ipcRenderer.invoke(IPC.GET_PREFERENCE, { key }),
  /**
   * 写入轻量偏好。
   * @param {string} key - 偏好键。
   * @param {string} value - 偏好值。
   * @returns {Promise<boolean>} 保存结果。
   */
  setPreference: (key, value) => ipcRenderer.invoke(IPC.SET_PREFERENCE, { key, value }),
  /**
   * 用 VSCode 打开路径。
   * @param {string} targetPath - 要打开的目录或文件路径。
   * @returns {Promise<boolean>} 打开结果。
   */
  openInVscode: (targetPath) => ipcRenderer.invoke(IPC.OPEN_IN_VSCODE, { targetPath }),
  /**
   * 打开系统目录选择器。
   * @param {{defaultPath?: string}} payload - 选择器参数。
   * @returns {Promise<{canceled: boolean, path?: string}>} 选择结果。
   */
  selectDirectory: (payload) => ipcRenderer.invoke(IPC.SELECT_DIRECTORY, payload),
});
