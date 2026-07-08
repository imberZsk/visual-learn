export {}

declare global {
  interface Window {
    /** Electron preload 暴露给渲染进程的受限 API。 */
    visualLearn: VisualLearnBridge
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

/** 文章标注记录。 */
interface VisualLearnAnnotation {
  /** 标注唯一 ID。 */
  id: string
  /** 标注关联的文章绝对路径。 */
  filePath: string
  /** 用户选中的原文片段。 */
  quote: string
  /** 标注在文章纯文本中的起始偏移。 */
  startOffset: number
  /** 标注在文章纯文本中的结束偏移。 */
  endOffset: number
  /** 选中文本前方上下文。 */
  prefix: string
  /** 选中文本后方上下文。 */
  suffix: string
  /** 评论内容，空字符串表示纯高亮。 */
  comment: string
  /** 高亮颜色名称。 */
  color: string
  /** 创建时间戳。 */
  createdAt: number
  /** 更新时间戳。 */
  updatedAt: number
}

/** 新建文章标注的输入参数。 */
interface VisualLearnAnnotationInput {
  /** 标注关联的文章绝对路径。 */
  filePath: string
  /** 用户选中的原文片段。 */
  quote: string
  /** 标注在文章纯文本中的起始偏移。 */
  startOffset: number
  /** 标注在文章纯文本中的结束偏移。 */
  endOffset: number
  /** 选中文本前方上下文。 */
  prefix: string
  /** 选中文本后方上下文。 */
  suffix: string
  /** 评论内容，空字符串表示纯高亮。 */
  comment: string
  /** 高亮颜色名称。 */
  color: string
  /** 创建时间戳。 */
  timestamp: number
}

/** 更新文章标注的输入参数。 */
interface VisualLearnAnnotationUpdate {
  /** 标注关联的文章绝对路径。 */
  filePath: string
  /** 标注唯一 ID。 */
  id: string
  /** 评论内容，空字符串表示清空评论。 */
  comment?: string
  /** 高亮颜色名称。 */
  color?: string
  /** 标注在文章纯文本中的起始偏移。 */
  startOffset?: number
  /** 标注在文章纯文本中的结束偏移。 */
  endOffset?: number
  /** 选中文本前方上下文。 */
  prefix?: string
  /** 选中文本后方上下文。 */
  suffix?: string
  /** 更新时间戳。 */
  timestamp: number
}

/** 文章总总结记录。 */
interface VisualLearnArticleSummary {
  /** 总总结关联的文章绝对路径。 */
  filePath: string
  /** 用户用自己的话写下的文章总总结。 */
  content: string
  /** 首次创建时间戳。 */
  createdAt: number
  /** 最后更新时间戳。 */
  updatedAt: number
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
  /** 获取文章标注。 */
  getAnnotations: (payload: { filePath: string }) => Promise<VisualLearnAnnotation[]>
  /** 创建文章标注。 */
  createAnnotation: (payload: VisualLearnAnnotationInput) => Promise<VisualLearnAnnotation>
  /** 更新文章标注。 */
  updateAnnotation: (payload: VisualLearnAnnotationUpdate) => Promise<VisualLearnAnnotation>
  /** 删除文章标注。 */
  deleteAnnotation: (payload: { filePath: string; id: string }) => Promise<boolean>
  /** 获取所有文章总总结。 */
  getArticleSummaries: () => Promise<Record<string, VisualLearnArticleSummary>>
  /** 获取单篇文章总总结。 */
  getArticleSummary: (payload: { filePath: string }) => Promise<VisualLearnArticleSummary | null>
  /** 设置单篇文章总总结。 */
  setArticleSummary: (payload: { filePath: string; content: string; timestamp: number }) => Promise<VisualLearnArticleSummary | null>
  /** 读取轻量偏好。 */
  getPreference: (key: string) => Promise<string | null>
  /** 写入轻量偏好。 */
  setPreference: (key: string, value: string) => Promise<boolean>
  /** 用 VSCode 打开路径。 */
  openInVscode: (targetPath: string) => Promise<boolean>
  /** 打开系统目录选择器。 */
  selectDirectory: (payload?: { defaultPath?: string }) => Promise<{ canceled: boolean; path?: string }>
}
}
