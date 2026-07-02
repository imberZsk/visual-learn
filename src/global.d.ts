export {}

declare global {
  interface Window {
    /** Electron preload 暴露给渲染进程的受限 API。 */
    visualLearn: VisualLearnBridge
  }
}

/** 学习资料扫描结果中的单篇文章。 */
interface VisualLearnStudyItem {
  /** 文件绝对路径，作为学习进度 key。 */
  path: string
  /** 前端展示名称。 */
  name: string
  /** 所属分类名称。 */
  category: string
  /** 对应代码目录路径，无代码目录时为 null。 */
  demoPath: string | null
  /** 文件大小，单位字节。 */
  size: number
  /** 最后修改时间戳，单位毫秒。 */
  modified: number
}

/** 学习资料扫描结果中的分类。 */
interface VisualLearnStudyCategory {
  /** 分类名称。 */
  name: string
  /** 顶层分组名称。 */
  group: string
  /** 分类下的文章列表。 */
  items: VisualLearnStudyItem[]
}

/** Electron preload 暴露的 API 形状。 */
interface VisualLearnBridge {
  /** 读取学习目录路径。 */
  getStudyPath: () => Promise<string>
  /** 保存学习目录路径。 */
  setStudyPath: (path: string) => Promise<boolean>
  /** 读取 VSCode 打开目录路径。 */
  getVscodePath: () => Promise<string>
  /** 保存 VSCode 打开目录路径。 */
  setVscodePath: (path: string) => Promise<boolean>
  /** 扫描学习资料。 */
  scanStudyNotes: (payload: { studyRoot: string }) => Promise<VisualLearnStudyCategory[]>
  /** 读取 Markdown 内容。 */
  readMdContent: (payload: { filePath: string; studyRoot: string }) => Promise<string>
  /** 获取学习进度。 */
  getProgress: () => Promise<Record<string, boolean>>
  /** 设置学习进度。 */
  setProgress: (payload: { filePath: string; completed: boolean; timestamp: number }) => Promise<boolean>
  /** 读取轻量偏好。 */
  getPreference: (key: string) => Promise<string | null>
  /** 写入轻量偏好。 */
  setPreference: (key: string, value: string) => Promise<boolean>
  /** 用 VSCode 打开路径。 */
  openInVscode: (targetPath: string) => Promise<boolean>
  /** 打开系统目录选择器。 */
  selectDirectory: (payload?: { defaultPath?: string }) => Promise<{ canceled: boolean; path?: string }>
}
