import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  App as AntdApp,
  Tag,
  Space,
  Input,
  Button,
  Checkbox,
  Empty,
  Modal,
  Tooltip,
  Tree,
} from 'antd'
import {
  SearchOutlined,
  CodeOutlined,
  ReloadOutlined,
  FileMarkdownOutlined,
  CheckCircleFilled,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UnorderedListOutlined,
  CaretRightOutlined,
  CaretDownOutlined,
  FolderOutlined,
  BookOutlined,
  LeftOutlined,
  RightOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  HighlightOutlined,
  CommentOutlined,
  DeleteOutlined,
  SaveOutlined,
  FormOutlined,
} from '@ant-design/icons'
import type { CheckboxChangeEvent } from 'antd/es/checkbox'
import type { DataNode, TreeProps } from 'antd/es/tree'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { appApi } from '../api'
import CodeBlock from '../components/CodeBlock'
import LoadingState from '../components/LoadingState'
import {
  applyAnnotationHighlights,
  clearAnnotationHighlights,
  createAnnotationDraft,
  getAnnotatableText,
  resolveAnnotationPosition,
  type AnnotationDraft,
  type ArticleAnnotation,
} from '../utils/annotations'
import './NotesLibrary.css'

const { Search, TextArea } = Input

// 后端偏好存储 key：记录上次打开的学习项路径，用于再次进入页面时恢复
const LAST_ITEM_KEY = 'lastItemPath'

/**
 * 生成归类层级的 Tree key。
 * @param group - 顶层归类名称。
 * @returns antd Tree 使用的唯一 key。
 */
const makeGroupKey = (group: string): string => `group:${group}`

/**
 * 生成学科层级的 Tree key。
 * @param group - 顶层归类名称。
 * @param category - 学科分类名称。
 * @returns antd Tree 使用的唯一 key。
 */
const makeCategoryKey = (group: string, category: string): string =>
  `category:${group}:${category}`

/**
 * 生成学习项层级的 Tree key。
 * @param path - 学习项文件绝对路径。
 * @returns antd Tree 使用的唯一 key。
 */
const makeItemKey = (path: string): string => `item:${path}`

/**
 * 合并 Tree 展开 key，并去重保持展开状态稳定。
 * @param previousKeys - 当前已经展开的 Tree key 列表。
 * @param nextKeys - 本次需要追加展开的 Tree key 列表。
 * @returns 合并去重后的 Tree key 列表。
 */
const mergeExpandedKeys = (
  previousKeys: React.Key[],
  nextKeys: React.Key[]
): React.Key[] => Array.from(new Set([...previousKeys, ...nextKeys]))

/**
 * 递归提取 React 节点中的纯文本（用于复制代码块原文）
 */
const extractText = (node: React.ReactNode): string => {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join('')
  // 处理 React 元素：继续向下取 children
  if (React.isValidElement(node)) {
    return extractText((node.props as { children?: React.ReactNode }).children)
  }
  return ''
}

/**
 * ReactMarkdown 自定义渲染器：
 * - pre：包成带语言标签 + 复制按钮的优雅代码块
 * - code：行内代码原样渲染（块级代码由 pre 的 CodeBlock 接管样式）
 */
const markdownComponents = {
  // 围栏代码块：从内层 code 的 className 提取语言，整体交给 CodeBlock
  pre({ children }: { children?: React.ReactNode }) {
    // pre 的唯一子节点通常是 code 元素，从其 className(language-xxx) 取语言
    const codeEl = React.Children.toArray(children).find(
      (c) => React.isValidElement(c) && c.type === 'code'
    ) as
      | React.ReactElement<{ className?: string; children?: React.ReactNode }>
      | undefined

    const className = codeEl?.props?.className || ''
    const match = /language-([\w-]+)/.exec(className)
    const language = match ? match[1] : ''
    const rawCode = extractText(codeEl?.props?.children).replace(/\n$/, '')

    return (
      <CodeBlock language={language} rawCode={rawCode}>
        {children}
      </CodeBlock>
    )
  },
}

/**
 * 格式化文章总结更新时间。
 * @param timestamp - 总结最后更新时间戳。
 * @returns 适合显示在总结卡片里的短时间文本。
 */
const formatSummaryUpdatedAt = (timestamp: number): string => {
  // date 存储由时间戳转换出的日期对象。
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * 学习单元（小册中的一篇文档）
 */
interface StudyItem {
  path: string
  name: string
  category: string
  demoPath: string | null
  size: number
  modified: number
}

/**
 * 学科分类
 */
interface StudyCategory {
  name: string
  group: string
  items: StudyItem[]
}

/**
 * 文章标题（用于 TOC 目录导航）
 */
interface Heading {
  id: string
  text: string
  level: number
}

/**
 * 左侧导航树节点数据。
 */
interface NavTreeNode extends DataNode {
  item?: StudyItem // 学习项节点关联的业务数据，非叶子节点不需要。
}

/**
 * 选中文本后的标注浮层状态。
 */
interface AnnotationToolbarState {
  left: number // 浮层相对阅读滚动区左侧的距离。
  top: number // 浮层相对阅读滚动区顶部的距离。
  draft: AnnotationDraft // 当前选区生成的标注草稿。
}

/**
 * 学习资料页面
 * 顶部：精简工具栏（折叠目录 / 沉浸模式 / 刷新 / 打开项目）
 * 左侧：可折叠的三级导航树（默认全部展开）
 * 右侧：文章内容（更大阅读区，支持上/下一章切换、沉浸式阅读）+ TOC 目录
 */
const NotesLibrary: React.FC = () => {
  // message 存储 antd App 上下文消息 API，确保提示跟随当前主题。
  const { message } = AntdApp.useApp()
  // 所有分类数据
  const [categories, setCategories] = useState<StudyCategory[]>([])
  // 加载状态
  const [loading, setLoading] = useState(true)
  // 当前选中的学习单元
  const [activeItem, setActiveItem] = useState<StudyItem | null>(null)
  // 学习进度：文件路径 -> 是否完成
  const [progress, setProgress] = useState<Record<string, boolean>>({})
  // 列表搜索关键词
  const [searchText, setSearchText] = useState('')
  // 右栏 md 内容
  const [mdContent, setMdContent] = useState<string>('')
  // md 加载状态
  const [mdLoading, setMdLoading] = useState(false)
  // 左侧导航是否折叠
  const [listCollapsed, setListCollapsed] = useState(false)
  // 是否进入沉浸式阅读模式（隐藏左导航/工具栏，文章铺满）
  const [immersive, setImmersive] = useState(false)
  // 已展开的 antd Tree 节点 key 列表
  const [expandedTreeKeys, setExpandedTreeKeys] = useState<React.Key[]>([])
  // 文章标题列表（TOC）
  const [headings, setHeadings] = useState<Heading[]>([])
  // 当前高亮的标题 id
  const [activeHeadingId, setActiveHeadingId] = useState<string>('')
  // 当前文章的标注列表
  const [annotations, setAnnotations] = useState<ArticleAnnotation[]>([])
  // 选中文本后显示的标注操作浮层
  const [annotationToolbar, setAnnotationToolbar] =
    useState<AnnotationToolbarState | null>(null)
  // 待添加评论的选区标注草稿
  const [pendingAnnotationDraft, setPendingAnnotationDraft] =
    useState<AnnotationDraft | null>(null)
  // 正在查看或编辑的已有标注
  const [editingAnnotation, setEditingAnnotation] =
    useState<ArticleAnnotation | null>(null)
  // 评论输入框内容
  const [commentText, setCommentText] = useState('')
  // 标注保存 / 更新 / 删除中的状态
  const [annotationSaving, setAnnotationSaving] = useState(false)
  // 所有文章总总结：文件路径 -> 总总结记录
  const [articleSummaries, setArticleSummaries] = useState<
    Record<string, VisualLearnArticleSummary>
  >({})
  // 当前文章的总总结
  const [activeSummary, setActiveSummary] =
    useState<VisualLearnArticleSummary | null>(null)
  // 总总结编辑弹窗是否打开
  const [summaryModalOpen, setSummaryModalOpen] = useState(false)
  // 总总结输入框内容
  const [summaryText, setSummaryText] = useState('')
  // 总总结保存中的状态
  const [summarySaving, setSummarySaving] = useState(false)

  // annotationModalOpen 存储评论编辑弹窗是否打开。
  const annotationModalOpen = Boolean(
    pendingAnnotationDraft || editingAnnotation
  )

  // 来自学习概览页的跳转参数（group + category）
  const location = useLocation()

  // 文章正文容器引用（用于扫描标题、滚动定位）
  const markdownRef = useRef<HTMLDivElement>(null)
  // 阅读滚动容器引用
  const scrollRef = useRef<HTMLDivElement>(null)
  // 左侧导航容器引用（用于把选中项滚动到可视区域）
  const navPanelRef = useRef<HTMLDivElement>(null)

  // 初始化加载
  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 键盘快捷键：Cmd/Ctrl+R 或 F5 触发数据刷新，阻止浏览器默认刷新行为
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (((e.metaKey || e.ctrlKey) && e.key === 'r') || e.key === 'F5') {
        e.preventDefault()
        loadData()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 选中并加载某个学习项内容（公共逻辑，初始化与点击共用）
  // 同时把路径写入后端偏好文件，作为「上次打开」的缓存
  const selectAndLoad = async (item: StudyItem) => {
    setActiveItem(item)
    setMdLoading(true)
    setMdContent('')
    setHeadings([])
    setAnnotations([])
    setAnnotationToolbar(null)
    setPendingAnnotationDraft(null)
    setEditingAnnotation(null)
    setCommentText('')
    setActiveSummary(null)
    setSummaryModalOpen(false)
    setSummaryText('')
    if (markdownRef.current) {
      clearAnnotationHighlights(markdownRef.current)
    }
    // 缓存当前打开的学习项路径，便于下次进入页面时恢复
    appApi.setPreference(LAST_ITEM_KEY, item.path).catch((error) => {
      console.error('保存上次打开学习项失败:', error)
    })
    try {
      // 先取配置的学习目录，后端安全校验需要此参数
      const studyRoot = await appApi.getStudyPath()
      // annotationPromise 存储当前文章标注读取任务，失败时降级为空列表，避免影响正文阅读。
      const annotationPromise = appApi
        .getAnnotations(item.path)
        .catch((error) => {
          console.error('读取文章标注失败:', error)
          message.warning('文章标注读取失败，本次先显示正文')
          return [] as ArticleAnnotation[]
        })
      // summaryPromise 存储当前文章总总结读取任务，失败时降级为空，避免影响正文阅读。
      const summaryPromise = appApi
        .getArticleSummary(item.path)
        .catch((error) => {
          console.error('读取文章总结失败:', error)
          message.warning('文章总结读取失败，本次先显示正文')
          return null as VisualLearnArticleSummary | null
        })
      // contentPromise 存储当前文章 Markdown 正文读取任务。
      const contentPromise = appApi.readMdContent(item.path, studyRoot)
      // loadedArticle 存储正文内容、标注列表与文章总总结的并行读取结果。
      const loadedArticle = await Promise.all([
        contentPromise,
        annotationPromise,
        summaryPromise,
      ])
      // content 存储当前文章 Markdown 正文内容。
      const content = loadedArticle[0]
      // noteAnnotations 存储当前文章已有标注列表。
      const noteAnnotations = loadedArticle[1]
      // articleSummary 存储当前文章已有总总结。
      const articleSummary = loadedArticle[2]
      setMdContent(content)
      setAnnotations(noteAnnotations)
      setActiveSummary(articleSummary)
    } catch (error) {
      console.error('读取 md 失败:', error)
      setMdContent(`> ⚠️ 无法读取文件内容：${error}`)
    } finally {
      setMdLoading(false)
    }
  }

  // 加载分类数据和进度
  const loadData = async () => {
    try {
      setLoading(true)
      // 先取配置的学习目录，扫描学习资料需要此参数
      const studyRoot = await appApi.getStudyPath()
      // summariesPromise 存储所有文章总总结读取任务，失败时只隐藏总结标识。
      const summariesPromise = appApi.getArticleSummaries().catch((error) => {
        console.error('读取文章总结列表失败:', error)
        message.warning('文章总结列表读取失败，本次先隐藏总结标识')
        return {} as Record<string, VisualLearnArticleSummary>
      })
      // loadedData 存储分类、进度和总结索引的并行加载结果。
      const loadedData = await Promise.all([
        appApi.scanStudyNotes(studyRoot) as Promise<StudyCategory[]>,
        appApi.getProgress(),
        summariesPromise,
      ])
      // cats 存储扫描得到的学习资料分类。
      const cats = loadedData[0]
      // prog 存储文件路径到完成状态的映射。
      const prog = loadedData[1]
      // summaries 存储文件路径到文章总总结的映射。
      const summaries = loadedData[2]
      setCategories(cats)
      setProgress(prog)
      setArticleSummaries(summaries)

      // 决定初始要打开的学习项，优先级：
      //   1. 概览页跳转指定的学科 -> 打开该学科第一篇
      //   2. 后端偏好文件缓存的上次打开项（任务3）
      //   3. 都没有则不自动打开（保持空状态）
      const navState = location.state as {
        group?: string
        category?: string
      } | null

      let target: StudyItem | null = null

      // 情况1：来自概览页点击某学科
      if (navState?.category) {
        const cat = cats.find(
          (c) => c.name === navState.category && c.items.length > 0
        )
        if (cat) target = cat.items[0]
      }

      // 情况2：恢复上次打开的缓存项（仅当缓存路径在本次扫描结果中仍存在）
      if (!target) {
        // cachedPath 存储后端偏好文件中记录的上次打开学习项路径
        const cachedPath = await appApi.getPreference(LAST_ITEM_KEY)
        if (cachedPath) {
          for (const c of cats) {
            const found = c.items.find((it) => it.path === cachedPath)
            if (found) {
              target = found
              break
            }
          }
        }
      }

      // 命中目标则自动打开，并确保其所属层级/学科处于展开态
      if (target) {
        const owningCat = cats.find((c) =>
          c.items.some((it) => it.path === target!.path)
        )
        if (owningCat) {
          setExpandedTreeKeys((prev) =>
            mergeExpandedKeys(prev, [
              makeGroupKey(owningCat.group || '其他'),
              makeCategoryKey(owningCat.group || '其他', owningCat.name),
            ])
          )
        }
        await selectAndLoad(target)
      }
    } catch (error) {
      console.error('加载失败:', error)
      message.error('加载失败: ' + error)
    } finally {
      setLoading(false)
    }
  }

  // 按第一层级（group）分组的导航树数据
  // 搜索时：只保留含匹配学习项的学科，且过滤学习项
  const navTree = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    // 只保留有学习内容的分类
    const activeCats = categories.filter((c) => c.items.length > 0)

    // 按 group 归拢
    const groupMap = new Map<string, StudyCategory[]>()
    for (const cat of activeCats) {
      const g = cat.group || '其他'
      if (!groupMap.has(g)) groupMap.set(g, [])
      groupMap.get(g)!.push(cat)
    }

    // 构建分组结构，并计算进度；搜索时过滤
    const result = Array.from(groupMap.entries()).map(([group, cats]) => {
      const catNodes = cats
        .map((cat) => {
          // 搜索过滤学习项
          const items = keyword
            ? cat.items.filter((it) => it.name.toLowerCase().includes(keyword))
            : cat.items
          const total = cat.items.length
          const done = cat.items.filter((it) => progress[it.path]).length
          const percent = total > 0 ? Math.round((done / total) * 100) : 0
          return { name: cat.name, items, total, done, percent }
        })
        // 搜索时去掉没有匹配项的学科
        .filter((c) => !keyword || c.items.length > 0)

      const gTotal = cats.reduce((s, c) => s + c.items.length, 0)
      const gDone = cats.reduce(
        (s, c) => s + c.items.filter((it) => progress[it.path]).length,
        0
      )
      const gPercent = gTotal > 0 ? Math.round((gDone / gTotal) * 100) : 0
      return {
        group,
        categories: catNodes,
        total: gTotal,
        done: gDone,
        percent: gPercent,
      }
    })

    // 搜索时去掉没有匹配学科的层级
    return result.filter((g) => !keyword || g.categories.length > 0)
  }, [categories, progress, searchText])

  // 全部学习项的「线性顺序」列表（与导航树展示顺序一致，不受搜索过滤影响）
  // 用于上/下一章切换：按 group -> category -> item 依次拉平
  const orderedItems = useMemo(() => {
    const activeCats = categories.filter((c) => c.items.length > 0)
    const groupMap = new Map<string, StudyCategory[]>()
    for (const cat of activeCats) {
      const g = cat.group || '其他'
      if (!groupMap.has(g)) groupMap.set(g, [])
      groupMap.get(g)!.push(cat)
    }
    // 按 group 顺序、再按学科顺序、再按学科内 items 顺序拉平
    const flat: StudyItem[] = []
    for (const cats of groupMap.values()) {
      for (const cat of cats) {
        for (const it of cat.items) flat.push(it)
      }
    }
    return flat
  }, [categories])

  // 当前学习项在线性列表中的位置，及上一篇 / 下一篇
  const chapterNav = useMemo(() => {
    if (!activeItem)
      return {
        index: -1,
        prev: null as StudyItem | null,
        next: null as StudyItem | null,
      }
    const idx = orderedItems.findIndex((it) => it.path === activeItem.path)
    return {
      index: idx,
      prev: idx > 0 ? orderedItems[idx - 1] : null,
      next:
        idx >= 0 && idx < orderedItems.length - 1
          ? orderedItems[idx + 1]
          : null,
    }
  }, [activeItem, orderedItems])

  // 搜索时自动展开所有含匹配项的层级和学科
  useEffect(() => {
    if (!searchText.trim()) return
    // keys 存储搜索命中后需要展开的 group 与 category 节点。
    const keys: React.Key[] = []
    for (const g of navTree) {
      keys.push(makeGroupKey(g.group))
      for (const c of g.categories) keys.push(makeCategoryKey(g.group, c.name))
    }
    setExpandedTreeKeys(keys)
  }, [searchText, navTree])

  // 点击学习单元：加载并显示 md 内容（并把阅读区滚回顶部）
  const handleSelectItem = async (item: StudyItem) => {
    await selectAndLoad(item)
    // 切换文章后，阅读区滚动回到顶部
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }

  // 跳到上一篇 / 下一篇（用于沉浸阅读时的章节切换）
  const goToChapter = (item: StudyItem | null) => {
    if (!item) return
    // 确保目标所属层级/学科展开，方便左侧高亮可见
    const owningCat = categories.find((c) =>
      c.items.some((it) => it.path === item.path)
    )
    if (owningCat) {
      setExpandedTreeKeys((prev) =>
        mergeExpandedKeys(prev, [
          makeGroupKey(owningCat.group || '其他'),
          makeCategoryKey(owningCat.group || '其他', owningCat.name),
        ])
      )
    }
    handleSelectItem(item)
  }

  // md 渲染完成后扫描标题，构建 TOC
  // 依赖 mdContent：内容变化后下一帧 DOM 已更新，扫描 h1-h4
  useEffect(() => {
    if (!mdContent || mdLoading) {
      setHeadings([])
      return
    }
    // 延迟到 DOM 渲染后执行
    const timer = setTimeout(() => {
      const container = markdownRef.current
      if (!container) return
      const nodes = container.querySelectorAll('h1, h2, h3, h4')
      const result: Heading[] = []
      nodes.forEach((node, index) => {
        const el = node as HTMLElement
        // 给每个标题赋唯一 id，供点击跳转
        const id = `toc-heading-${index}`
        el.id = id
        const level = parseInt(el.tagName.substring(1), 10)
        result.push({
          id,
          text: el.textContent || '',
          level,
        })
      })
      setHeadings(result)
      setActiveHeadingId(result[0]?.id || '')
    }, 50)

    return () => clearTimeout(timer)
  }, [mdContent, mdLoading])

  // 内容切换后把选中的左侧导航项滚动到可视区域（列表展开时）
  useEffect(() => {
    if (!activeItem || listCollapsed || immersive) return
    const timer = setTimeout(() => {
      const panel = navPanelRef.current
      if (!panel) return
      const activeEl = panel.querySelector(
        '.ant-tree-treenode-selected'
      ) as HTMLElement | null
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' })
      }
    }, 60)
    return () => clearTimeout(timer)
  }, [activeItem, listCollapsed, immersive])

  // 监听阅读区滚动，高亮当前标题
  useEffect(() => {
    const scrollEl = scrollRef.current
    if (!scrollEl || headings.length === 0) return

    // 滚动处理：找到当前视口顶部附近最后一个已划过的标题
    const handleScroll = () => {
      const container = markdownRef.current
      if (!container) return
      const scrollTop = scrollEl.scrollTop
      let current = headings[0]?.id || ''
      for (const h of headings) {
        const el = document.getElementById(h.id)
        if (!el) continue
        // 标题相对滚动容器的偏移
        if (el.offsetTop - 80 <= scrollTop) {
          current = h.id
        } else {
          break
        }
      }
      setActiveHeadingId(current)
    }

    scrollEl.addEventListener('scroll', handleScroll, { passive: true })
    return () => scrollEl.removeEventListener('scroll', handleScroll)
  }, [headings])

  // 点击 TOC 项：滚动到对应标题
  const handleTocClick = (id: string) => {
    const el = document.getElementById(id)
    const scrollEl = scrollRef.current
    if (el && scrollEl) {
      // 用相对滚动容器的偏移定位，留出 16px 顶部间距
      scrollEl.scrollTo({
        top: el.offsetTop - 16,
        behavior: 'smooth',
      })
      setActiveHeadingId(id)
    }
  }

  /**
   * 关闭标注评论编辑弹窗，并清空临时输入状态。
   */
  const closeAnnotationEditor = () => {
    setPendingAnnotationDraft(null)
    setEditingAnnotation(null)
    setCommentText('')
  }

  /**
   * 点击已有高亮时打开评论编辑弹窗。
   * @param annotation - 被点击的标注记录。
   */
  const handleAnnotationClick = useCallback((annotation: ArticleAnnotation) => {
    setAnnotationToolbar(null)
    setPendingAnnotationDraft(null)
    setEditingAnnotation(annotation)
    setCommentText(annotation.comment)
  }, [])

  /**
   * 将恢复后的新偏移轻量写回持久化文件，减少文章改动后的漂移。
   * @param renderedAnnotations - 已成功渲染的标注列表。
   * @param fullText - 包裹标注前读取到的正文纯文本。
   */
  const persistRecoveredAnnotationPositions = useCallback(
    (renderedAnnotations: ArticleAnnotation[], fullText: string) => {
      for (const annotation of renderedAnnotations) {
        // position 存储当前文章中重新定位到的标注位置。
        const position = resolveAnnotationPosition(fullText, annotation)
        if (!position) continue
        if (
          position.startOffset === annotation.startOffset &&
          position.endOffset === annotation.endOffset
        ) {
          continue
        }

        // updatedPayload 存储需要回写的新偏移和上下文。
        const updatedPayload = {
          filePath: annotation.filePath,
          id: annotation.id,
          startOffset: position.startOffset,
          endOffset: position.endOffset,
          prefix: fullText.slice(
            Math.max(0, position.startOffset - 80),
            position.startOffset
          ),
          suffix: fullText.slice(position.endOffset, position.endOffset + 80),
          timestamp: Date.now(),
        }

        appApi
          .updateAnnotation(updatedPayload)
          .then((updatedAnnotation) => {
            setAnnotations((prev) =>
              prev.map((item) =>
                item.id === updatedAnnotation.id ? updatedAnnotation : item
              )
            )
          })
          .catch((error) => {
            console.error('回写标注恢复位置失败:', error)
          })
      }
    },
    []
  )

  /**
   * 保存一个新标注草稿。
   * @param draft - 选区生成的标注草稿。
   * @param comment - 用户填写的评论内容。
   */
  const saveAnnotationDraft = async (
    draft: AnnotationDraft,
    comment: string
  ) => {
    try {
      setAnnotationSaving(true)
      // createdAnnotation 存储后端返回的新标注记录。
      const createdAnnotation = await appApi.createAnnotation({
        ...draft,
        comment,
        timestamp: Date.now(),
      })
      setAnnotations((prev) => [...prev, createdAnnotation])
      setAnnotationToolbar(null)
      closeAnnotationEditor()
      window.getSelection()?.removeAllRanges()
      message.success(comment.trim() ? '已添加评论标注' : '已添加高亮标注')
    } catch (error) {
      console.error('保存标注失败:', error)
      message.error('标注保存失败')
    } finally {
      setAnnotationSaving(false)
    }
  }

  /**
   * 直接把当前选区保存为高亮标注。
   */
  const handleCreateHighlight = () => {
    if (!annotationToolbar) return
    saveAnnotationDraft(annotationToolbar.draft, '')
  }

  /**
   * 打开当前选区的评论输入弹窗。
   */
  const handleOpenDraftComment = () => {
    if (!annotationToolbar) return
    setPendingAnnotationDraft(annotationToolbar.draft)
    setEditingAnnotation(null)
    setCommentText('')
  }

  /**
   * 保存评论弹窗中的内容，新标注走创建，已有标注走更新。
   */
  const handleSaveAnnotationComment = async () => {
    if (pendingAnnotationDraft) {
      await saveAnnotationDraft(pendingAnnotationDraft, commentText)
      return
    }
    if (!editingAnnotation) return

    try {
      setAnnotationSaving(true)
      // updatedAnnotation 存储后端返回的更新后标注记录。
      const updatedAnnotation = await appApi.updateAnnotation({
        filePath: editingAnnotation.filePath,
        id: editingAnnotation.id,
        comment: commentText,
        timestamp: Date.now(),
      })
      setAnnotations((prev) =>
        prev.map((annotation) =>
          annotation.id === updatedAnnotation.id
            ? updatedAnnotation
            : annotation
        )
      )
      closeAnnotationEditor()
      message.success('已更新标注评论')
    } catch (error) {
      console.error('更新标注失败:', error)
      message.error('标注更新失败')
    } finally {
      setAnnotationSaving(false)
    }
  }

  /**
   * 删除当前正在编辑的已有标注。
   */
  const handleDeleteAnnotation = async () => {
    if (!editingAnnotation) return

    try {
      setAnnotationSaving(true)
      await appApi.deleteAnnotation(
        editingAnnotation.filePath,
        editingAnnotation.id
      )
      setAnnotations((prev) =>
        prev.filter((annotation) => annotation.id !== editingAnnotation.id)
      )
      closeAnnotationEditor()
      message.success('已删除标注')
    } catch (error) {
      console.error('删除标注失败:', error)
      message.error('标注删除失败')
    } finally {
      setAnnotationSaving(false)
    }
  }

  /**
   * 打开文章总总结编辑弹窗，并带入当前已有总结内容。
   */
  const handleOpenSummaryEditor = () => {
    setSummaryText(activeSummary?.content || '')
    setSummaryModalOpen(true)
  }

  /**
   * 关闭文章总总结编辑弹窗，并清空临时输入状态。
   */
  const closeSummaryEditor = () => {
    setSummaryModalOpen(false)
    setSummaryText('')
  }

  /**
   * 保存当前文章的总总结；输入为空时清空该文章总结。
   */
  const handleSaveArticleSummary = async () => {
    if (!activeItem) return

    // content 存储用户输入并去掉首尾空白后的总结正文。
    const content = summaryText.trim()
    try {
      setSummarySaving(true)
      // savedSummary 存储后端保存后的文章总总结；清空内容时为 null。
      const savedSummary = await appApi.setArticleSummary(
        activeItem.path,
        content,
        Date.now()
      )
      setActiveSummary(savedSummary)
      setArticleSummaries((prev) => {
        // next 存储更新当前文章后的总结索引。
        const next = { ...prev }
        if (savedSummary) {
          next[activeItem.path] = savedSummary
        } else {
          delete next[activeItem.path]
        }
        return next
      })
      closeSummaryEditor()
      message.success(savedSummary ? '已保存文章总结' : '已清空文章总结')
    } catch (error) {
      console.error('保存文章总结失败:', error)
      message.error('文章总结保存失败')
    } finally {
      setSummarySaving(false)
    }
  }

  // 监听正文选区：用户选中文本后生成标注草稿，并在选区附近显示操作浮层
  useEffect(() => {
    // container 存储 Markdown 正文容器。
    const container = markdownRef.current
    // scrollEl 存储阅读滚动容器。
    const scrollEl = scrollRef.current
    if (!container || !scrollEl || !activeItem || mdLoading) return

    /**
     * 根据当前浏览器选区更新标注浮层状态。
     */
    const updateToolbarFromSelection = () => {
      window.setTimeout(() => {
        // selection 存储当前浏览器文本选区。
        const selection = window.getSelection()
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
          setAnnotationToolbar(null)
          return
        }

        // range 存储当前选区的 DOM Range。
        const range = selection.getRangeAt(0)
        if (!container.contains(range.commonAncestorContainer)) {
          setAnnotationToolbar(null)
          return
        }

        // draft 存储由当前选区生成的标注草稿。
        const draft = createAnnotationDraft(
          container,
          range,
          activeItem.path,
          Date.now()
        )
        if (!draft) {
          setAnnotationToolbar(null)
          return
        }

        // rangeRect 存储选区在视口中的位置。
        const rangeRect = range.getBoundingClientRect()
        // scrollRect 存储阅读滚动容器在视口中的位置。
        const scrollRect = scrollEl.getBoundingClientRect()
        // rawLeft 存储浮层未经边界修正的左侧距离。
        const rawLeft = rangeRect.left - scrollRect.left + scrollEl.scrollLeft
        // maxLeft 存储浮层允许的最大左侧距离。
        const maxLeft = Math.max(12, scrollEl.clientWidth - 180)
        // left 存储浮层最终左侧距离。
        const left = Math.min(Math.max(rawLeft, 12), maxLeft)
        // rawTop 存储浮层未经边界修正的顶部距离。
        const rawTop = rangeRect.top - scrollRect.top + scrollEl.scrollTop - 44
        // top 存储浮层最终顶部距离。
        const top = Math.max(scrollEl.scrollTop + 8, rawTop)

        setAnnotationToolbar({ left, top, draft })
      }, 0)
    }

    container.addEventListener('mouseup', updateToolbarFromSelection)
    container.addEventListener('keyup', updateToolbarFromSelection)
    return () => {
      container.removeEventListener('mouseup', updateToolbarFromSelection)
      container.removeEventListener('keyup', updateToolbarFromSelection)
    }
  }, [activeItem, mdContent, mdLoading])

  // Markdown 渲染完成后，将当前文章标注包裹成正文高亮
  useEffect(() => {
    if (!mdContent || mdLoading) return

    // timer 存储等待 Markdown DOM 完成渲染的定时器。
    const timer = window.setTimeout(() => {
      // container 存储 Markdown 正文容器。
      const container = markdownRef.current
      if (!container) return

      // fullText 存储包裹高亮前的正文纯文本。
      const fullText = getAnnotatableText(container)
      // renderedAnnotations 存储本次成功渲染到 DOM 的标注列表。
      const renderedAnnotations = applyAnnotationHighlights(
        container,
        annotations,
        handleAnnotationClick
      )
      persistRecoveredAnnotationPositions(renderedAnnotations, fullText)
    }, 80)

    return () => window.clearTimeout(timer)
  }, [
    annotations,
    handleAnnotationClick,
    mdContent,
    mdLoading,
    persistRecoveredAnnotationPositions,
  ])

  // 切换学习单元的完成状态
  const toggleProgress = useCallback(
    async (item: StudyItem, e: CheckboxChangeEvent) => {
      e.stopPropagation?.()
      const completed = e.target.checked
      try {
        await appApi.setProgress(item.path, completed, Date.now())
        setProgress((prev) => ({ ...prev, [item.path]: completed }))
      } catch (error) {
        console.error('更新进度失败:', error)
        message.error('更新进度失败')
      }
    },
    [message]
  )

  // 用 VSCode 打开学习单元对应的代码目录
  const openItemCodeInVSCode = useCallback(
    async (item: StudyItem, e: React.MouseEvent) => {
      e.stopPropagation()
      if (!item.demoPath) {
        message.warning('该学习项没有对应的代码目录')
        return
      }
      try {
        await appApi.openInVscode(item.demoPath)
        message.success('已用 VSCode 打开对应代码目录')
      } catch (error) {
        console.error('VSCode 打开失败:', error)
        message.error('VSCode 打开失败: ' + error)
      }
    },
    [message]
  )

  // 用 VSCode 打开整个学习项目
  const openProjectInVSCode = async () => {
    try {
      // vscodeRoot 存储当前配置的 VSCode 打开根目录
      const vscodeRoot = await appApi.getVscodePath()
      await appApi.openInVscode(vscodeRoot)
      message.success('已用 VSCode 打开配置目录')
    } catch (error) {
      message.error('VSCode 打开失败: ' + error)
    }
  }

  // antd Tree 使用的数据源，负责承接原手写三级导航结构。
  const navTreeData = useMemo<NavTreeNode[]>(() => {
    return navTree.map((grp) => ({
      key: makeGroupKey(grp.group),
      className: 'nav-tree-node nav-tree-node--group',
      title: (
        <span className="nav-tree-title nav-tree-title--group">
          <FolderOutlined className="nav-tree-heading-icon" />
          <span className="nav-tree-name">{grp.group}</span>
          <span className="nav-count">
            {grp.done}/{grp.total}
          </span>
        </span>
      ),
      children: grp.categories.map((cat) => ({
        key: makeCategoryKey(grp.group, cat.name),
        className: 'nav-tree-node nav-tree-node--category',
        title: (
          <span className="nav-tree-title nav-tree-title--category">
            <BookOutlined className="nav-tree-heading-icon nav-tree-heading-icon--category" />
            <span className="nav-tree-name">{cat.name}</span>
            <Tag
              color={cat.percent === 100 ? 'success' : 'default'}
              className="nav-progress-tag"
            >
              {cat.done}/{cat.total}
            </Tag>
          </span>
        ),
        children: cat.items.map((item) => {
          // isCompleted 存储该学习项是否已完成。
          const isCompleted = !!progress[item.path]
          // isSummarized 存储该学习项是否已经写过文章总总结。
          const isSummarized = !!articleSummaries[item.path]?.content
          // itemName 存储去掉 .md 后缀后的展示标题。
          const itemName = item.name.replace(/\.md$/, '')

          return {
            key: makeItemKey(item.path),
            className: 'nav-tree-node nav-tree-node--item',
            isLeaf: true,
            item,
            title: (
              <span
                className={`nav-tree-title nav-tree-title--item${item.demoPath ? ' nav-tree-title--with-demo' : ''}`}
              >
                <Checkbox
                  checked={isCompleted}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => toggleProgress(item, e)}
                />
                <span
                  className={`nav-item-name${isCompleted ? ' nav-item-name--completed' : ''}`}
                  title={itemName}
                >
                  {itemName}
                </span>
                {isSummarized && (
                  <Tooltip title="已写文章总结">
                    <FormOutlined className="nav-item-summary-icon" />
                  </Tooltip>
                )}
                {item.demoPath && (
                  <Tooltip title="新窗口打开对应代码目录">
                    <Button
                      type="text"
                      size="small"
                      className="nav-item-demo"
                      icon={<CodeOutlined />}
                      onClick={(e) => openItemCodeInVSCode(item, e)}
                    />
                  </Tooltip>
                )}
              </span>
            ),
          }
        }),
      })),
    }))
  }, [
    articleSummaries,
    navTree,
    openItemCodeInVSCode,
    progress,
    toggleProgress,
  ])

  /**
   * 处理 antd Tree 节点展开状态变化。
   * @param keys - 当前已展开的 Tree 节点 key 列表。
   */
  const handleTreeExpand: TreeProps['onExpand'] = (keys) => {
    setExpandedTreeKeys(keys)
  }

  /**
   * 处理 antd Tree 节点选中，只有学习项叶子节点会触发文章加载。
   * @param _selectedKeys - antd Tree 返回的选中 key 列表，本组件通过 info.node 取业务数据。
   * @param info - antd Tree 当前选中节点的上下文信息。
   */
  const handleTreeSelect: TreeProps['onSelect'] = (_selectedKeys, info) => {
    // node 存储当前点击的导航树节点。
    const node = info.node as NavTreeNode
    if (!node.item) {
      // nodeKey 存储被点击目录节点的 Tree key，用于让目录标题也能切换展开态。
      const nodeKey = node.key
      setExpandedTreeKeys((previousKeys) =>
        previousKeys.includes(nodeKey)
          ? previousKeys.filter((key) => key !== nodeKey)
          : [...previousKeys, nodeKey]
      )
      return
    }
    handleSelectItem(node.item)
  }

  // 左侧三级导航树（沉浸模式下不渲染）
  const renderNavTree = () => (
    <div className="notes-nav-panel" ref={navPanelRef}>
      <Search
        placeholder="搜索学习项..."
        allowClear
        size="small"
        prefix={<SearchOutlined />}
        className="notes-nav-search"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
      />

      {navTree.length === 0 ? (
        <Empty
          description={searchText ? '没有匹配的学习项' : '暂无学习内容'}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <Tree
          blockNode
          className="notes-nav-tree"
          expandedKeys={expandedTreeKeys}
          selectedKeys={activeItem ? [makeItemKey(activeItem.path)] : []}
          treeData={navTreeData}
          switcherIcon={({ expanded, isLeaf }) =>
            isLeaf ? null : expanded ? (
              <CaretDownOutlined />
            ) : (
              <CaretRightOutlined />
            )
          }
          onExpand={handleTreeExpand}
          onSelect={handleTreeSelect}
        />
      )}
    </div>
  )

  // 文章底部的上一章 / 下一章切换条
  const renderChapterNav = () => {
    const { prev, next } = chapterNav
    if (!prev && !next) return null
    return (
      <div className="chapter-nav">
        {prev ? (
          <Button
            className="chapter-nav-btn prev"
            onClick={() => goToChapter(prev)}
          >
            <LeftOutlined />
            <span className="chapter-nav-label">
              <span className="chapter-nav-hint">上一篇</span>
              <span className="chapter-nav-title">
                {prev.name.replace(/\.md$/, '')}
              </span>
            </span>
          </Button>
        ) : (
          <span className="chapter-nav-placeholder" />
        )}
        {next ? (
          <Button
            className="chapter-nav-btn next"
            onClick={() => goToChapter(next)}
          >
            <span className="chapter-nav-label">
              <span className="chapter-nav-hint">下一篇</span>
              <span className="chapter-nav-title">
                {next.name.replace(/\.md$/, '')}
              </span>
            </span>
            <RightOutlined />
          </Button>
        ) : (
          <span className="chapter-nav-placeholder" />
        )}
      </div>
    )
  }

  return (
    <div className={`notes-library ${immersive ? 'immersive' : ''}`}>
      {/* 顶部工具栏（沉浸模式下隐藏） */}
      {!immersive && (
        <div className="notes-toolbar">
          <Tooltip title={listCollapsed ? '展开目录' : '折叠目录'}>
            <Button
              size="small"
              icon={
                listCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />
              }
              onClick={() => setListCollapsed((v) => !v)}
            />
          </Tooltip>

          <Space size={6}>
            {activeItem && (
              <Tooltip title="沉浸式阅读（隐藏目录，专注正文）">
                <Button
                  size="small"
                  icon={<FullscreenOutlined />}
                  onClick={() => setImmersive(true)}
                >
                  沉浸阅读
                </Button>
              </Tooltip>
            )}
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={loadData}
              loading={loading}
            >
              刷新
            </Button>
            <Button
              size="small"
              type="primary"
              icon={<CodeOutlined />}
              onClick={openProjectInVSCode}
            >
              打开项目
            </Button>
          </Space>
        </div>
      )}

      {/* 主体：左导航树（可折叠/沉浸隐藏） + 右文章 */}
      {loading ? (
        <LoadingState tip="扫描学习资料..." />
      ) : (
        <div className="notes-main">
          {/* 左侧三级折叠导航 */}
          {!listCollapsed && !immersive && renderNavTree()}

          {/* 右侧：文章阅读区 + TOC */}
          <div className="notes-reader">
            {!activeItem ? (
              <div className="reader-empty">
                <Empty
                  description="选择左侧一篇学习内容开始阅读"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              </div>
            ) : (
              <>
                {/* 文章滚动区 */}
                <div className="reader-scroll" ref={scrollRef}>
                  {/* reader-article 始终渲染（article-head 不跟随 mdLoading 隐藏，避免加载时抖动） */}
                  <div className="reader-article">
                    {/* 文章标题栏：固定在滚动区顶部，无论加载中/加载完都显示 */}
                    <div className="article-head">
                      <Space size={6}>
                        <FileMarkdownOutlined />
                        <span className="article-title">
                          {activeItem.name.replace(/\.md$/, '')}
                        </span>
                        {progress[activeItem.path] && (
                          <CheckCircleFilled className="article-complete-icon" />
                        )}
                      </Space>
                      <Space size={6}>
                        <Tooltip
                          title={
                            activeSummary
                              ? '查看或编辑文章总结'
                              : '写一段费曼总结'
                          }
                        >
                          <Button
                            size="small"
                            icon={<FormOutlined />}
                            onClick={handleOpenSummaryEditor}
                          >
                            {activeSummary ? '编辑总结' : '写总结'}
                          </Button>
                        </Tooltip>
                        {activeItem.demoPath && (
                          <Button
                            size="small"
                            icon={<CodeOutlined />}
                            onClick={(e) =>
                              openItemCodeInVSCode(
                                activeItem,
                                e as React.MouseEvent
                              )
                            }
                          >
                            打开代码
                          </Button>
                        )}
                        {immersive && (
                          <Tooltip title="退出沉浸阅读">
                            <Button
                              size="small"
                              icon={<FullscreenExitOutlined />}
                              onClick={() => setImmersive(false)}
                            >
                              退出
                            </Button>
                          </Tooltip>
                        )}
                      </Space>
                    </div>

                    {/* 正文区：加载中显示统一紧凑 loading，加载完显示 markdown */}
                    {mdLoading ? (
                      <LoadingState compact tip="加载文章..." />
                    ) : (
                      <>
                        {activeSummary && (
                          <div className="article-summary-panel">
                            <div className="article-summary-head">
                              <Tag color="gold" className="article-summary-tag">
                                费曼总结
                              </Tag>
                              <span className="article-summary-time">
                                更新于{' '}
                                {formatSummaryUpdatedAt(
                                  activeSummary.updatedAt
                                )}
                              </span>
                            </div>
                            <div className="article-summary-content">
                              {activeSummary.content}
                            </div>
                          </div>
                        )}
                        <div className="markdown-body" ref={markdownRef}>
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeHighlight]}
                            components={markdownComponents}
                          >
                            {mdContent}
                          </ReactMarkdown>
                        </div>
                        {renderChapterNav()}
                      </>
                    )}
                  </div>
                  {/* WHY：标注工具条位置来自用户实时选区坐标，无法用固定 CSS class 表达。 */}
                  {annotationToolbar && !mdLoading && (
                    <div
                      className="annotation-toolbar"
                      style={{
                        left: annotationToolbar.left,
                        top: annotationToolbar.top,
                      }}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <Tooltip title="标记为重点">
                        <Button
                          size="small"
                          icon={<HighlightOutlined />}
                          loading={annotationSaving}
                          onClick={handleCreateHighlight}
                        >
                          高亮
                        </Button>
                      </Tooltip>
                      <Tooltip title="添加评论">
                        <Button
                          size="small"
                          type="primary"
                          icon={<CommentOutlined />}
                          onClick={handleOpenDraftComment}
                        >
                          评论
                        </Button>
                      </Tooltip>
                    </div>
                  )}
                </div>

                {/* TOC：始终占位 220px 避免宽度变化抖动，无标题时隐藏内容 */}
                <div
                  className={`reader-toc${headings.length === 0 ? ' reader-toc--empty' : ''}`}
                >
                  <div className="toc-head">
                    <UnorderedListOutlined />
                    <span>目录</span>
                  </div>
                  <div className="toc-list">
                    {headings.map((h) => (
                      <div
                        key={h.id}
                        className={`toc-item toc-level-${h.level} ${
                          activeHeadingId === h.id ? 'active' : ''
                        }`}
                        onClick={() => handleTocClick(h.id)}
                        title={h.text}
                      >
                        {h.text}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <Modal
        title={editingAnnotation ? '编辑标注评论' : '添加评论标注'}
        open={annotationModalOpen}
        okText="保存"
        cancelText="取消"
        okButtonProps={{ loading: annotationSaving, icon: <SaveOutlined /> }}
        onCancel={closeAnnotationEditor}
        onOk={handleSaveAnnotationComment}
        destroyOnHidden
      >
        <div className="annotation-modal">
          <div className="annotation-modal-quote">
            {editingAnnotation?.quote || pendingAnnotationDraft?.quote}
          </div>
          <TextArea
            autoSize={{ minRows: 4, maxRows: 8 }}
            value={commentText}
            placeholder="写下这段内容为什么重要..."
            onChange={(e) => setCommentText(e.target.value)}
          />
          {editingAnnotation && (
            <Button
              danger
              icon={<DeleteOutlined />}
              loading={annotationSaving}
              className="annotation-delete-btn"
              onClick={handleDeleteAnnotation}
            >
              删除标注
            </Button>
          )}
        </div>
      </Modal>
      <Modal
        title={activeSummary ? '编辑文章总结' : '写文章总结'}
        open={summaryModalOpen}
        okText="保存总结"
        cancelText="取消"
        okButtonProps={{ loading: summarySaving, icon: <SaveOutlined /> }}
        onCancel={closeSummaryEditor}
        onOk={handleSaveArticleSummary}
        destroyOnHidden
      >
        <div className="article-summary-editor">
          <TextArea
            autoSize={{ minRows: 6, maxRows: 12 }}
            value={summaryText}
            placeholder="用自己的话讲给别人听：这篇文章到底在说什么？"
            onChange={(e) => setSummaryText(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  )
}

export default NotesLibrary
