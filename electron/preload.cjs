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
  GET_ANNOTATIONS: 'visual-learn:get-annotations',
  CREATE_ANNOTATION: 'visual-learn:create-annotation',
  UPDATE_ANNOTATION: 'visual-learn:update-annotation',
  DELETE_ANNOTATION: 'visual-learn:delete-annotation',
  GET_ARTICLE_SUMMARIES: 'visual-learn:get-article-summaries',
  GET_ARTICLE_SUMMARY: 'visual-learn:get-article-summary',
  SET_ARTICLE_SUMMARY: 'visual-learn:set-article-summary',
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
   * 获取文章标注。
   * @param {{filePath: string}} payload - 标注读取参数。
   * @returns {Promise<object[]>} 文章标注列表。
   */
  getAnnotations: (payload) => ipcRenderer.invoke(IPC.GET_ANNOTATIONS, payload),
  /**
   * 创建文章标注。
   * @param {object} payload - 标注创建参数。
   * @returns {Promise<object>} 创建后的标注。
   */
  createAnnotation: (payload) => ipcRenderer.invoke(IPC.CREATE_ANNOTATION, payload),
  /**
   * 更新文章标注。
   * @param {object} payload - 标注更新参数。
   * @returns {Promise<object>} 更新后的标注。
   */
  updateAnnotation: (payload) => ipcRenderer.invoke(IPC.UPDATE_ANNOTATION, payload),
  /**
   * 删除文章标注。
   * @param {{filePath: string, id: string}} payload - 标注删除参数。
   * @returns {Promise<boolean>} 删除结果。
   */
  deleteAnnotation: (payload) => ipcRenderer.invoke(IPC.DELETE_ANNOTATION, payload),
  /**
   * 获取所有文章总总结。
   * @returns {Promise<Record<string, object>>} 文件路径到总结记录的映射。
   */
  getArticleSummaries: () => ipcRenderer.invoke(IPC.GET_ARTICLE_SUMMARIES),
  /**
   * 获取单篇文章总总结。
   * @param {{filePath: string}} payload - 总总结读取参数。
   * @returns {Promise<object|null>} 文章总总结记录。
   */
  getArticleSummary: (payload) => ipcRenderer.invoke(IPC.GET_ARTICLE_SUMMARY, payload),
  /**
   * 设置单篇文章总总结。
   * @param {{filePath: string, content: string, timestamp: number}} payload - 总总结保存参数。
   * @returns {Promise<object|null>} 保存后的总总结，清空时返回 null。
   */
  setArticleSummary: (payload) => ipcRenderer.invoke(IPC.SET_ARTICLE_SUMMARY, payload),
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
