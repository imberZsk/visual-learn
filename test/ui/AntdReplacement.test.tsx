// @vitest-environment happy-dom
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { App as AntdApp } from 'antd'
import { MemoryRouter } from 'react-router-dom'
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import CodeBlock from '../../src/components/CodeBlock'
import HeatmapCalendar from '../../src/components/charts/HeatmapCalendar'
import ProgressBar from '../../src/components/charts/ProgressBar'
import Dashboard from '../../src/pages/Dashboard'
import NotesLibrary from '../../src/pages/NotesLibrary'

// appApiMock 存储页面测试可控的后端 API 替身。
const appApiMock = vi.hoisted(() => ({
  getStudyPath: vi.fn(),
  setStudyPath: vi.fn(),
  getVscodePath: vi.fn(),
  setVscodePath: vi.fn(),
  scanStudyNotes: vi.fn(),
  readMdContent: vi.fn(),
  getProgress: vi.fn(),
  setProgress: vi.fn(),
  getAnnotations: vi.fn(),
  createAnnotation: vi.fn(),
  updateAnnotation: vi.fn(),
  deleteAnnotation: vi.fn(),
  getArticleSummaries: vi.fn(),
  getArticleSummary: vi.fn(),
  setArticleSummary: vi.fn(),
  getPreference: vi.fn(),
  setPreference: vi.fn(),
  openInVscode: vi.fn(),
  selectDirectory: vi.fn(),
}))

vi.mock('../../src/api', () => ({
  appApi: appApiMock,
}))

/**
 * ResizeObserver 测试替身，用于满足 antd 在 happy-dom 中的布局监听依赖。
 */
class ResizeObserverMock {
  /**
   * 注册尺寸监听；测试环境不需要真实监听。
   */
  observe() {}

  /**
   * 取消单个尺寸监听；测试环境不需要真实监听。
   */
  unobserve() {}

  /**
   * 清空尺寸监听；测试环境不需要真实监听。
   */
  disconnect() {}
}

/**
 * 渲染需要 antd App 消息上下文的页面组件。
 * @param children - 需要渲染的 React 节点。
 * @param initialEntry - MemoryRouter 初始路由对象。
 */
function renderWithProviders(
  children: React.ReactNode,
  initialEntry: NonNullable<
    Parameters<typeof MemoryRouter>[0]['initialEntries']
  >[number] = '/dashboard'
) {
  return render(
    <AntdApp>
      <MemoryRouter
        initialEntries={[initialEntry]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        {children}
      </MemoryRouter>
    </AntdApp>
  )
}

/**
 * 构造一组含完成进度与 demo 目录的学习资料数据。
 * @returns 学习资料分类数据。
 */
function createStudyCategories() {
  return [
    {
      name: 'React',
      group: 'AI编程',
      items: [
        {
          path: '/study/react/01-入门.md',
          name: '01-入门.md',
          category: 'React',
          demoPath: '/study/react/demo',
          size: 120,
          modified: 1,
        },
      ],
    },
  ]
}

/**
 * 重置页面依赖的后端 API mock，并写入默认成功返回。
 */
function resetAppApiMock() {
  // categories 存储默认扫描出的学习资料分类。
  const categories = createStudyCategories()

  appApiMock.getStudyPath.mockResolvedValue('/study')
  appApiMock.setStudyPath.mockResolvedValue(true)
  appApiMock.getVscodePath.mockResolvedValue('/study')
  appApiMock.setVscodePath.mockResolvedValue(true)
  appApiMock.scanStudyNotes.mockResolvedValue(categories)
  appApiMock.readMdContent.mockResolvedValue('# 入门\n\n正文')
  appApiMock.getProgress.mockResolvedValue({ '/study/react/01-入门.md': true })
  appApiMock.setProgress.mockResolvedValue(true)
  appApiMock.getAnnotations.mockResolvedValue([])
  appApiMock.createAnnotation.mockResolvedValue({
    id: 'a1',
    filePath: '/study/react/01-入门.md',
    quote: '正文',
    startOffset: 0,
    endOffset: 2,
    prefix: '',
    suffix: '',
    comment: '',
    color: 'yellow',
    createdAt: 100,
    updatedAt: 100,
  })
  appApiMock.updateAnnotation.mockImplementation(async (payload) => ({
    id: payload.id,
    filePath: payload.filePath,
    quote: '正文',
    startOffset: payload.startOffset ?? 0,
    endOffset: payload.endOffset ?? 2,
    prefix: payload.prefix ?? '',
    suffix: payload.suffix ?? '',
    comment: payload.comment ?? '',
    color: payload.color ?? 'yellow',
    createdAt: 100,
    updatedAt: payload.timestamp,
  }))
  appApiMock.deleteAnnotation.mockResolvedValue(true)
  appApiMock.getArticleSummaries.mockResolvedValue({})
  appApiMock.getArticleSummary.mockResolvedValue(null)
  appApiMock.setArticleSummary.mockResolvedValue(null)
  appApiMock.getPreference.mockResolvedValue(null)
  appApiMock.setPreference.mockResolvedValue(true)
  appApiMock.openInVscode.mockResolvedValue(true)
  appApiMock.selectDirectory.mockResolvedValue({ canceled: true })
}

describe('antd 组件替换', () => {
  beforeAll(() => {
    // ResizeObserver 存储 antd Tree/Card 等组件需要的浏览器 API 替身。
    window.ResizeObserver = ResizeObserverMock
  })

  beforeEach(() => {
    vi.clearAllMocks()
    resetAppApiMock()
  })

  /**
   * 验证学习资料导航由 antd Tree 承接，同时保留原有层级与完成勾选展示。
   */
  test('学习资料页使用 antd Tree 展示三级导航', async () => {
    // initialEntry 存储从概览页跳转到 React 学科的路由状态。
    const initialEntry = {
      pathname: '/notes',
      state: { group: 'AI编程', category: 'React' },
    }
    // container 存储渲染后的 DOM 根节点。
    const { container } = renderWithProviders(<NotesLibrary />, initialEntry)

    expect(await screen.findByText('AI编程')).toBeTruthy()
    expect(await screen.findAllByText('01-入门')).toHaveLength(2)
    expect(container.querySelector('.notes-nav-tree.ant-tree')).toBeTruthy()
    expect(
      container.querySelector('.notes-nav-tree .ant-checkbox')
    ).toBeTruthy()
  })

  /**
   * 验证点击目录标题时也能切换展开状态，不必只点左侧小箭头。
   */
  test('点击学科目录标题会折叠已展开目录', async () => {
    // initialEntry 存储从概览页跳转到 React 学科的路由状态。
    const initialEntry = {
      pathname: '/notes',
      state: { group: 'AI编程', category: 'React' },
    }
    // container 存储渲染后的 DOM 根节点。
    const { container } = renderWithProviders(<NotesLibrary />, initialEntry)

    await waitFor(() => {
      expect(
        container.querySelector('.nav-tree-title--category .nav-tree-name')
          ?.textContent
      ).toBe('React')
    })
    expect(container.querySelector('.nav-tree-node--item')).toBeTruthy()

    // categoryTitle 存储当前用例渲染出的学科标题节点，避免整文件运行时查询到其他用例残留 DOM。
    const categoryTitle = container.querySelector(
      '.nav-tree-title--category .nav-tree-name'
    ) as HTMLElement
    fireEvent.click(categoryTitle)

    await waitFor(() => {
      expect(container.querySelector('.nav-tree-node--item')).toBeFalsy()
    })
  })

  /**
   * 验证学习资料页打开文章时会同步读取文章标注，便于渲染高亮和评论。
   */
  test('学习资料页打开文章时读取文章标注', async () => {
    // initialEntry 存储从概览页跳转到 React 学科的路由状态。
    const initialEntry = {
      pathname: '/notes',
      state: { group: 'AI编程', category: 'React' },
    }
    renderWithProviders(<NotesLibrary />, initialEntry)

    await waitFor(() => {
      expect(appApiMock.getAnnotations).toHaveBeenCalledWith(
        '/study/react/01-入门.md'
      )
    })
  })

  /**
   * 验证 Markdown 代码块复制入口使用 antd Button，统一按钮交互样式。
   */
  test('代码块复制入口使用 antd Button', () => {
    renderWithProviders(
      <CodeBlock language="ts" rawCode="const value = 1">
        <code>const value = 1</code>
      </CodeBlock>
    )

    // copyButton 存储代码块头部的复制按钮。
    const copyButton = screen.getByRole('button', { name: /复制/ })
    expect(copyButton.classList.contains('ant-btn')).toBe(true)
  })

  /**
   * 验证学科入口使用 antd Button，保留可点击跳转入口。
   */
  test('学习概览学科入口使用 antd Button', async () => {
    // container 存储渲染后的 DOM 根节点。
    const { container } = renderWithProviders(<Dashboard />)

    await waitFor(() =>
      expect(container.querySelector('.subject-card.ant-btn')).toBeTruthy()
    )
  })

  /**
   * 验证通用进度条组件使用 antd Progress 承接线性进度。
   */
  test('通用进度条使用 antd Progress', () => {
    // container 存储渲染后的 DOM 根节点。
    const { container } = render(
      <ProgressBar current={5} target={10} label="阅读进度" />
    )

    expect(screen.getByText('阅读进度')).toBeTruthy()
    expect(screen.getByText('进行中')).toBeTruthy()
    expect(container.querySelector('.ant-progress')).toBeTruthy()
  })

  /**
   * 验证热力图外层展示使用 antd Card 承接通用卡片容器。
   */
  test('热力图外层使用 antd Card', () => {
    // container 存储渲染后的 DOM 根节点。
    const { container } = render(<HeatmapCalendar data={[]} months={1} />)

    expect(screen.getByText('学习热力图')).toBeTruthy()
    expect(container.querySelector('.ant-card')).toBeTruthy()
  })
})
