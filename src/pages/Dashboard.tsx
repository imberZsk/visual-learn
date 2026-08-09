import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Statistic,
  Progress,
  Typography,
  Tag,
  Space,
  Empty,
} from 'antd'
import {
  BookOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  ReadOutlined,
  FolderOutlined,
  CheckCircleFilled,
} from '@ant-design/icons'
import { appApi } from '../api'
import LoadingState from '../components/LoadingState'
import './Dashboard.css'

const { Title, Text } = Typography

/**
 * 学习单元：代表一个 .md 文件
 */
interface StudyItem {
  path: string // 文件绝对路径，作为唯一 key
  name: string // 文件名（无扩展名）
  category: string // 所属学科名
  demoPath: string | null // 对应 demo 目录路径，无则 null
  size: number // 文件大小（字节）
  modified: number // 最后修改时间戳
}

/**
 * 学科分类：小册目录
 */
interface StudyCategory {
  name: string // 学科名（去掉「小册」后缀）
  group: string // 所属顶层分组名
  items: StudyItem[] // 该学科下的所有学习单元
}

/**
 * 根据完成率返回语义进度色。
 * @param percent 当前完成百分比。
 * @returns 未开始、进行中或已完成对应的 CSS 语义变量。
 */
function getProgressColor(percent: number): string {
  if (percent <= 0) {
    return 'rgb(var(--vl-border-strong))'
  }

  if (percent >= 100) {
    return 'rgb(var(--vl-success))'
  }

  return 'rgb(var(--vl-accent))'
}

/**
 * 学习概览页
 * 展示顶部统计卡片、总体圆形进度、各学科圆形进度网格
 */
const Dashboard: React.FC = () => {
  const navigate = useNavigate()

  const [categories, setCategories] = useState<StudyCategory[]>([]) // 所有学科分类数据
  const [progress, setProgress] = useState<Record<string, boolean>>({}) // 各学习单元完成状态
  const [loading, setLoading] = useState(true) // 数据加载状态
  const [studyPath, setStudyPath] = useState('') // 当前配置的学习目录路径

  /**
   * 点击学科卡片，跳转到 /notes 并定位到对应学科
   */
  const goToCategory = (group: string, category: string) => {
    navigate('/notes', { state: { group, category } })
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    /**
     * 键盘快捷键处理：Cmd/Ctrl+R 或 F5 触发刷新
     */
    const handleKeyDown = (e: KeyboardEvent) => {
      if (((e.metaKey || e.ctrlKey) && e.key === 'r') || e.key === 'F5') {
        e.preventDefault()
        loadData()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    // 组件卸载时移除监听，防止内存泄漏
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  /**
   * 从 Electron 后端加载学科分类与学习进度
   * 先获取 studyRoot 路径，再传入扫描接口
   */
  const loadData = async () => {
    try {
      setLoading(true)
      const root = await appApi.getStudyPath() // 学习笔记根目录路径
      setStudyPath(root)
      const [cats, prog] = await Promise.all([
        appApi.scanStudyNotes(root) as Promise<StudyCategory[]>,
        appApi.getProgress(),
      ])
      setCategories(cats)
      setProgress(prog)
    } catch (error) {
      console.error('加载概览数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 汇总统计：总篇数、已完成数、完成率、有效分类数
  const stats = useMemo(() => {
    const allItems = categories.flatMap((c) => c.items) // 展平所有学习单元
    const total = allItems.length // 总篇数
    const completed = allItems.filter((item) => progress[item.path]).length // 已完成篇数
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0 // 总完成率
    const activeCategoryCount = categories.filter(
      (c) => c.items.length > 0
    ).length // 有内容的学科数
    return { total, completed, percent, activeCategoryCount }
  }, [categories, progress])

  // 按 group 分组后的进度数据，每组含各学科的进度
  const groupedProgress = useMemo(() => {
    const activeCats = categories.filter((c) => c.items.length > 0) // 过滤空学科

    // 以 group 为 key 归拢学科
    const groupMap = new Map<
      string,
      { name: string; done: number; total: number; percent: number }[]
    >()
    for (const cat of activeCats) {
      const total = cat.items.length // 该学科总篇数
      const done = cat.items.filter((item) => progress[item.path]).length // 已完成篇数
      const percent = total > 0 ? Math.round((done / total) * 100) : 0 // 该学科完成率
      const groupName = cat.group || '其他' // 无 group 时归入「其他」
      if (!groupMap.has(groupName)) groupMap.set(groupName, [])
      groupMap.get(groupName)!.push({ name: cat.name, done, total, percent })
    }

    // 转为数组，计算每个 group 的汇总数据
    return Array.from(groupMap.entries()).map(([group, cats]) => {
      const total = cats.reduce((sum, c) => sum + c.total, 0) // group 总篇数
      const done = cats.reduce((sum, c) => sum + c.done, 0) // group 已完成篇数
      const percent = total > 0 ? Math.round((done / total) * 100) : 0 // group 完成率
      const sortedCats = [...cats].sort((a, b) => b.percent - a.percent) // 按完成率降序排列
      return { group, total, done, percent, categories: sortedCats }
    })
  }, [categories, progress])

  return (
    <div className="dashboard-page">
      <div className="compact-page-head">
        <Title level={4} className="compact-page-title">
          <Space size={8}>
            <ReadOutlined />
            <span>学习概览</span>
          </Space>
        </Title>
        <Text type="secondary" className="compact-page-subtitle">
          {studyPath}
        </Text>
      </div>

      {loading ? (
        <LoadingState tip="加载学习概览..." />
      ) : (
        <>
          {/* 统计概要：单一水平面板内用分隔线组织四项指标。 */}
          <section className="dashboard-summary" aria-label="学习统计">
            <div className="dashboard-summary__item">
              <Statistic
                title="学科分类"
                value={stats.activeCategoryCount}
                prefix={<BookOutlined />}
                suffix="个"
              />
            </div>
            <div className="dashboard-summary__item">
              <Statistic
                title="学习总篇数"
                value={stats.total}
                prefix={<FileTextOutlined />}
                suffix="篇"
              />
            </div>
            <div
              className={
                stats.completed > 0
                  ? 'dashboard-summary__item dashboard-summary__item--success'
                  : 'dashboard-summary__item'
              }
            >
              <Statistic
                title="已完成"
                value={stats.completed}
                prefix={<CheckCircleOutlined />}
                suffix={`/ ${stats.total}`}
              />
            </div>
            <div className="dashboard-summary__item">
              <Statistic
                title="完成率"
                value={stats.percent}
                prefix={<ReadOutlined />}
                suffix="%"
              />
            </div>
          </section>

          <div className="dashboard-workspace">
            {/* 总体进度：独立摘要面板和学科列表并列，减少横向空白。 */}
            <section className="overall-progress-panel">
              <div className="dashboard-section-label">总体学习进度</div>
              <div className="overall-progress-wrap">
                <Progress
                  type="circle"
                  percent={stats.percent}
                  size={88}
                  strokeColor={getProgressColor(stats.percent)}
                />
                <div className="overall-progress-text">
                  <span className="overall-progress-caption">
                    已完成{' '}
                    <strong
                      className={
                        stats.completed > 0
                          ? 'overall-progress-completed--success'
                          : undefined
                      }
                    >
                      {stats.completed}
                    </strong>{' '}
                    / 总计 {stats.total}
                  </span>
                </div>
              </div>
            </section>

            {/* 各学科进度：使用可扫描的线性进度列表，避免圆环卡片堆积。 */}
            <section className="subject-progress-panel">
              {groupedProgress.length === 0 ? (
                <div className="dashboard-empty">
                  <Empty
                    description="暂无学习数据"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                </div>
              ) : (
                groupedProgress.map((grp) => (
                  <div key={grp.group} className="subject-group">
                    <div className="subject-group__header">
                      <div className="subject-group__title">
                        <FolderOutlined className="subject-group__icon" />
                        <span>{grp.group}</span>
                        <Tag>{grp.categories.length} 个学科</Tag>
                        {grp.percent === 100 && (
                          <Tag color="success">已完成</Tag>
                        )}
                      </div>
                      <span className="subject-group__summary">
                        {grp.done} / {grp.total} · {grp.percent}%
                      </span>
                    </div>
                    <div className="subject-grid">
                      {grp.categories.map((cat) => (
                        <Button
                          key={cat.name}
                          type="text"
                          className={`subject-card${cat.percent === 100 ? ' subject-card--done' : ''}`}
                          onClick={() => goToCategory(grp.group, cat.name)}
                          title={`查看 ${cat.name} 的学习内容`}
                        >
                          <span className="subject-card-content">
                            <span className="subject-card__topline">
                              <Text
                                className="subject-name"
                                ellipsis
                                title={cat.name}
                              >
                                {cat.name}
                              </Text>
                              <span className="subject-card__count">
                                {cat.done}/{cat.total}
                              </span>
                            </span>
                            <Progress
                              className="subject-card__progress"
                              percent={cat.percent}
                              strokeColor={getProgressColor(cat.percent)}
                              showInfo={false}
                            />
                            <span className="subject-card__status">
                              {cat.percent === 100 ? (
                                <CheckCircleFilled className="subject-done-icon" />
                              ) : (
                                `${cat.percent}%`
                              )}
                            </span>
                          </span>
                        </Button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </section>
          </div>
        </>
      )}
    </div>
  )
}

export default Dashboard
