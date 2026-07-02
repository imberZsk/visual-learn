import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  App as AntdApp,
  Tag,
  Space,
  Input,
  Button,
  Checkbox,
  Empty,
  Tooltip,
} from 'antd'
import {
  SearchOutlined,
  CodeOutlined,
  ReloadOutlined,
  FileMarkdownOutlined,
  CheckCircleTwoTone,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UnorderedListOutlined,
  CaretRightOutlined,
  CaretDownOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  BookOutlined,
  LeftOutlined,
  RightOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
} from '@ant-design/icons'
import type { CheckboxChangeEvent } from 'antd/es/checkbox'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { appApi } from '../api'
import CodeBlock from '../components/CodeBlock'
import LoadingState from '../components/LoadingState'
import './NotesLibrary.css'

const { Search } = Input

// 后端偏好存储 key：记录上次打开的学习项路径，用于再次进入页面时恢复
const LAST_ITEM_KEY = 'lastItemPath'

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
    ) as React.ReactElement<{ className?: string; children?: React.ReactNode }> | undefined

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
  // 已展开的第一层级（group）集合
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  // 已展开的学科集合
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())
  // 文章标题列表（TOC）
  const [headings, setHeadings] = useState<Heading[]>([])
  // 当前高亮的标题 id
  const [activeHeadingId, setActiveHeadingId] = useState<string>('')

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
    // 缓存当前打开的学习项路径，便于下次进入页面时恢复
    appApi.setPreference(LAST_ITEM_KEY, item.path).catch((error) => {
      console.error('保存上次打开学习项失败:', error)
    })
    try {
      // 先取配置的学习目录，后端安全校验需要此参数
      const studyRoot = await appApi.getStudyPath()
      const content = await appApi.readMdContent(item.path, studyRoot)
      setMdContent(content)
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
      const [cats, prog] = await Promise.all([
        appApi.scanStudyNotes(studyRoot) as Promise<StudyCategory[]>,
        appApi.getProgress(),
      ])
      setCategories(cats)
      setProgress(prog)

      // 决定初始要打开的学习项，优先级：
      //   1. 概览页跳转指定的学科 -> 打开该学科第一篇
      //   2. 后端偏好文件缓存的上次打开项（任务3）
      //   3. 都没有则不自动打开（保持空状态）
      const navState = location.state as
        | { group?: string; category?: string }
        | null

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
          setExpandedGroups((prev) => new Set(prev).add(owningCat.group || '其他'))
          setExpandedCats((prev) => new Set(prev).add(owningCat.name))
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
      return { group, categories: catNodes, total: gTotal, done: gDone, percent: gPercent }
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
    if (!activeItem) return { index: -1, prev: null as StudyItem | null, next: null as StudyItem | null }
    const idx = orderedItems.findIndex((it) => it.path === activeItem.path)
    return {
      index: idx,
      prev: idx > 0 ? orderedItems[idx - 1] : null,
      next: idx >= 0 && idx < orderedItems.length - 1 ? orderedItems[idx + 1] : null,
    }
  }, [activeItem, orderedItems])

  // 搜索时自动展开所有含匹配项的层级和学科
  useEffect(() => {
    if (!searchText.trim()) return
    const groups = new Set<string>()
    const cats = new Set<string>()
    for (const g of navTree) {
      groups.add(g.group)
      for (const c of g.categories) cats.add(c.name)
    }
    setExpandedGroups(groups)
    setExpandedCats(cats)
  }, [searchText, navTree])

  // 切换层级展开/收起
  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      next.has(group) ? next.delete(group) : next.add(group)
      return next
    })
  }

  // 切换学科展开/收起
  const toggleCat = (name: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

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
      setExpandedGroups((prev) => new Set(prev).add(owningCat.group || '其他'))
      setExpandedCats((prev) => new Set(prev).add(owningCat.name))
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
      const activeEl = panel.querySelector('.nav-item.active') as HTMLElement | null
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

  // 切换学习单元的完成状态
  const toggleProgress = async (item: StudyItem, e: CheckboxChangeEvent) => {
    e.stopPropagation?.()
    const completed = e.target.checked
    try {
      await appApi.setProgress(item.path, completed, Date.now())
      setProgress((prev) => ({ ...prev, [item.path]: completed }))
    } catch (error) {
      console.error('更新进度失败:', error)
      message.error('更新进度失败')
    }
  }

  // 用 VSCode 打开学习单元对应的代码目录
  const openItemCodeInVSCode = async (item: StudyItem, e: React.MouseEvent) => {
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
  }

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

  // 左侧三级导航树（沉浸模式下不渲染）
  const renderNavTree = () => (
    <div className="notes-nav-panel" ref={navPanelRef}>
      <Search
        placeholder="搜索学习项..."
        allowClear
        size="small"
        prefix={<SearchOutlined />}
        style={{ marginBottom: 8 }}
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
      />

      {navTree.length === 0 ? (
        <Empty
          description={searchText ? '没有匹配的学习项' : '暂无学习内容'}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <div className="nav-tree">
          {navTree.map((grp) => {
            const groupExpanded = expandedGroups.has(grp.group)
            return (
              <div className="nav-group" key={grp.group}>
                {/* 第一层级：归类（后端/AI编程...） */}
                <div className="nav-group-header" onClick={() => toggleGroup(grp.group)}>
                  {groupExpanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
                  {groupExpanded ? <FolderOpenOutlined /> : <FolderOutlined />}
                  <span className="nav-group-name">{grp.group}</span>
                  <span className="nav-count">
                    {grp.done}/{grp.total}
                  </span>
                </div>

                {/* 第二层级：学科 */}
                {groupExpanded &&
                  grp.categories.map((cat) => {
                    const catExpanded = expandedCats.has(cat.name)
                    return (
                      <div className="nav-cat" key={cat.name}>
                        <div className="nav-cat-header" onClick={() => toggleCat(cat.name)}>
                          {catExpanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
                          <BookOutlined style={{ color: '#1890ff', fontSize: 13 }} />
                          <span className="nav-cat-name">{cat.name}</span>
                          <Tag
                            color={cat.percent === 100 ? 'success' : 'default'}
                            style={{ marginInlineEnd: 0, fontSize: 11 }}
                          >
                            {cat.done}/{cat.total}
                          </Tag>
                        </div>

                        {/* 第三层级：学习项 */}
                        {catExpanded && (
                          <div className="nav-items">
                            {cat.items.map((item) => {
                              const isCompleted = !!progress[item.path]
                              const isActive = activeItem?.path === item.path
                              return (
                                <div
                                  key={item.path}
                                  className={`nav-item ${isActive ? 'active' : ''}`}
                                  onClick={() => handleSelectItem(item)}
                                >
                                  <Checkbox
                                    checked={isCompleted}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => toggleProgress(item, e)}
                                  />
                                  <span
                                    className="nav-item-name"
                                    style={{
                                      textDecoration: isCompleted ? 'line-through' : 'none',
                                      color: isCompleted ? '#999' : 'inherit',
                                    }}
                                    title={item.name.replace(/\.md$/, '')}
                                  >
                                    {item.name.replace(/\.md$/, '')}
                                  </span>
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
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>
            )
          })}
        </div>
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
          <button className="chapter-nav-btn prev" onClick={() => goToChapter(prev)}>
            <LeftOutlined />
            <span className="chapter-nav-label">
              <span className="chapter-nav-hint">上一篇</span>
              <span className="chapter-nav-title">{prev.name.replace(/\.md$/, '')}</span>
            </span>
          </button>
        ) : (
          <span className="chapter-nav-placeholder" />
        )}
        {next ? (
          <button className="chapter-nav-btn next" onClick={() => goToChapter(next)}>
            <span className="chapter-nav-label">
              <span className="chapter-nav-hint">下一篇</span>
              <span className="chapter-nav-title">{next.name.replace(/\.md$/, '')}</span>
            </span>
            <RightOutlined />
          </button>
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
              icon={listCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setListCollapsed((v) => !v)}
            />
          </Tooltip>

          <Space size={6}>
            {activeItem && (
              <Tooltip title="沉浸式阅读（隐藏目录，专注正文）">
                <Button size="small" icon={<FullscreenOutlined />} onClick={() => setImmersive(true)}>
                  沉浸阅读
                </Button>
              </Tooltip>
            )}
            <Button size="small" icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
              刷新
            </Button>
            <Button size="small" type="primary" icon={<CodeOutlined />} onClick={openProjectInVSCode}>
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
                        <CheckCircleTwoTone twoToneColor="#52c41a" />
                      )}
                    </Space>
                    <Space size={6}>
                      {activeItem.demoPath && (
                        <Button
                          size="small"
                          icon={<CodeOutlined />}
                          onClick={(e) =>
                            openItemCodeInVSCode(activeItem, e as React.MouseEvent)
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
              </div>

              {/* TOC：始终占位 220px 避免宽度变化抖动，无标题时隐藏内容 */}
              <div className={`reader-toc${headings.length === 0 ? ' reader-toc--empty' : ''}`}>
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
    </div>
  )
}

export default NotesLibrary
