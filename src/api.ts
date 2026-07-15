/**
 * 获取 Electron preload 暴露的 API。
 * @returns Electron 渲染进程安全桥接 API。
 */
function getBridge(): Window['visualLearn'] {
  // bridge 存储 preload 注入到 window 上的 API 对象。
  const bridge = window.visualLearn
  if (!bridge) {
    throw new Error('Electron API 未就绪，请在桌面应用中运行')
  }

  return bridge
}

/** 前端页面使用的统一后端 API 适配器。 */
export const appApi = {
  /** 检查应用更新。 */
  checkAppUpdate: () => getBridge().checkAppUpdate(),
  /** 下载应用更新。 */
  downloadAppUpdate: () => getBridge().downloadAppUpdate(),
  /** 安装已下载的应用更新。 */
  installAppUpdate: () => getBridge().installAppUpdate(),
  /** 读取学习目录路径。 */
  getStudyPath: () => getBridge().getStudyPath(),
  /** 保存学习目录路径。 */
  setStudyPath: (path: string) => getBridge().setStudyPath(path),
  /** 读取 VSCode 打开目录路径。 */
  getVscodePath: () => getBridge().getVscodePath(),
  /** 保存 VSCode 打开目录路径。 */
  setVscodePath: (path: string) => getBridge().setVscodePath(path),
  /** 扫描学习资料。 */
  scanStudyNotes: (studyRoot: string) =>
    getBridge().scanStudyNotes({ studyRoot }),
  /** 读取 Markdown 文件内容。 */
  readMdContent: (filePath: string, studyRoot: string) =>
    getBridge().readMdContent({ filePath, studyRoot }),
  /** 获取学习进度映射。 */
  getProgress: () => getBridge().getProgress(),
  /** 设置学习进度。 */
  setProgress: (filePath: string, completed: boolean, timestamp: number) =>
    getBridge().setProgress({ filePath, completed, timestamp }),
  /** 获取文章标注。 */
  getAnnotations: (filePath: string) =>
    getBridge().getAnnotations({ filePath }),
  /** 创建文章标注。 */
  createAnnotation: (payload: VisualLearnAnnotationInput) =>
    getBridge().createAnnotation(payload),
  /** 更新文章标注。 */
  updateAnnotation: (payload: VisualLearnAnnotationUpdate) =>
    getBridge().updateAnnotation(payload),
  /** 删除文章标注。 */
  deleteAnnotation: (filePath: string, id: string) =>
    getBridge().deleteAnnotation({ filePath, id }),
  /** 获取所有文章总总结。 */
  getArticleSummaries: () => getBridge().getArticleSummaries(),
  /** 获取单篇文章总总结。 */
  getArticleSummary: (filePath: string) =>
    getBridge().getArticleSummary({ filePath }),
  /** 设置单篇文章总总结。 */
  setArticleSummary: (filePath: string, content: string, timestamp: number) =>
    getBridge().setArticleSummary({ filePath, content, timestamp }),
  /** 读取轻量偏好。 */
  getPreference: (key: string) => getBridge().getPreference(key),
  /** 写入轻量偏好。 */
  setPreference: (key: string, value: string) =>
    getBridge().setPreference(key, value),
  /** 用 VSCode 打开路径。 */
  openInVscode: (targetPath: string) => getBridge().openInVscode(targetPath),
  /** 打开系统目录选择器。 */
  selectDirectory: (payload?: { defaultPath?: string }) =>
    getBridge().selectDirectory(payload),
}
