import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Row, Col, Statistic, Progress, Typography, Tag, Space, Empty } from 'antd'
import {
  BookOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  ReadOutlined,
  FolderOutlined,
  CheckCircleFilled,
} from '@ant-design/icons'
import { invoke } from '@tauri-apps/api/tauri'
import './Dashboard.css'

const { Title, Text } = Typography

/**
 * 学习单元：代表一个 .md 文件
 */
interface StudyItem {
  path: string      // 文件绝对路径，作为唯一 key
  name: string      // 文件名（无扩展名）
  category: string  // 所属学科名
  demoPath: string | null  // 对应 demo 目录路径，无则 null
  size: number      // 文件大小（字节）
  modified: number  // 最后修改时间戳
}

/**
 * 学科分类：小册目录
 */
interface StudyCategory {
  name: string        // 学科名（去掉「小册」后缀）
  group: string       // 所属顶层分组名
  items: StudyItem[]  // 该学科下的所有学习单元
}

/**
 * 根据完成率计算圆环进度条的颜色
 * 0% → 灰色，50% → 蓝色，100% → 绿色，中间线性插值
 */
function getProgressColor(percent: number): string {
  if (percent === 0) return '#d9d9d9'        // 未开始：灰色
  if (percent === 100) return '#52c41a'       // 全完成：绿色
  if (percent < 50) {
    // 0~50%：灰色 → 蓝色
    const t = percent / 50  // 插值比例 [0,1)
    const r = Math.round(217 - (217 - 24) * t)   // R 通道
    const g = Math.round(217 - (217 - 144) * t)  // G 通道
    const b = Math.round(217 - (217 - 255) * t)  // B 通道
    return `rgb(${r},${g},${b})`
  }
  // 50~100%：蓝色 → 绿色
  const t = (percent - 50) / 50  // 插值比例 [0,1]
  const r = Math.round(24 + (82 - 24) * t)    // R 通道
  const g = Math.round(144 + (196 - 144) * t) // G 通道
  const b = Math.round(255 + (26 - 255) * t)  // B 通道
  return `rgb(${r},${g},${b})`
}

/**
 * 学习概览页
 * 展示顶部统计卡片、总体圆形进度、各学科圆形进度网格
 */
const Dashboard: React.FC = () => {
  const navigate = useNavigate()

  const [categories, setCategories] = useState<StudyCategory[]>([])  // 所有学科分类数据
  const [progress, setProgress] = useState<Record<string, boolean>>({})  // 各学习单元完成状态
  const [loading, setLoading] = useState(true)  // 数据加载状态
  const [studyPath, setStudyPath] = useState('')  // 当前配置的学习目录路径

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
   * 从 Tauri 后端加载学科分类与学习进度
   * 先获取 studyRoot 路径，再传入 scan_study_notes
   */
  const loadData = async () => {
    try {
      setLoading(true)
      const root = await invoke<string>('get_study_path')  // 学习笔记根目录路径
      setStudyPath(root)
      const [cats, prog] = await Promise.all([
        invoke<StudyCategory[]>('scan_study_notes', { studyRoot: root }),
        invoke<Record<string, boolean>>('get_progress'),
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
    const allItems = categories.flatMap(c => c.items)  // 展平所有学习单元
    const total = allItems.length                        // 总篇数
    const completed = allItems.filter(item => progress[item.path]).length  // 已完成篇数
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0  // 总完成率
    const activeCategoryCount = categories.filter(c => c.items.length > 0).length  // 有内容的学科数
    return { total, completed, percent, activeCategoryCount }
  }, [categories, progress])

  // 按 group 分组后的进度数据，每组含各学科的进度
  const groupedProgress = useMemo(() => {
    const activeCats = categories.filter(c => c.items.length > 0)  // 过滤空学科

    // 以 group 为 key 归拢学科
    const groupMap = new Map<
      string,
      { name: string; done: number; total: number; percent: number }[]
    >()
    for (const cat of activeCats) {
      const total = cat.items.length  // 该学科总篇数
      const done = cat.items.filter(item => progress[item.path]).length  // 已完成篇数
      const percent = total > 0 ? Math.round((done / total) * 100) : 0  // 该学科完成率
      const groupName = cat.group || '其他'  // 无 group 时归入「其他」
      if (!groupMap.has(groupName)) groupMap.set(groupName, [])
      groupMap.get(groupName)!.push({ name: cat.name, done, total, percent })
    }

    // 转为数组，计算每个 group 的汇总数据
    return Array.from(groupMap.entries()).map(([group, cats]) => {
      const total = cats.reduce((sum, c) => sum + c.total, 0)  // group 总篇数
      const done = cats.reduce((sum, c) => sum + c.done, 0)    // group 已完成篇数
      const percent = total > 0 ? Math.round((done / total) * 100) : 0  // group 完成率
      const sortedCats = [...cats].sort((a, b) => b.percent - a.percent)  // 按完成率降序排列
      return { group, total, done, percent, categories: sortedCats }
    })
  }, [categories, progress])

  return (
    <div className="dashboard-page">
      <div className="compact-page-head">
        <Title level={4} className="compact-page-title">📊 学习概览</Title>
        <Text type="secondary" className="compact-page-subtitle">{studyPath}</Text>
      </div>

      {/* 顶部统计卡片：4 个横向等宽 */}
      <Row gutter={[12, 12]}>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic title="学科分类" value={stats.activeCategoryCount} prefix={<BookOutlined />} suffix="个" />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic title="学习总篇数" value={stats.total} prefix={<FileTextOutlined />} suffix="篇" />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic title="已完成" value={stats.completed} prefix={<CheckCircleOutlined />}
              suffix={`/ ${stats.total}`} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic title="完成率" value={stats.percent} prefix={<ReadOutlined />}
              suffix="%" valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
      </Row>

      {/* 总体进度：大号圆形进度 + 文字说明，居中展示 */}
      <Card className="compact-section-card" loading={loading}>
        <div className="overall-progress-wrap">
          <Progress
            type="circle"
            percent={stats.percent}
            size={96}
            strokeColor={getProgressColor(stats.percent)}
          />
          <div className="overall-progress-text">
            <Text strong style={{ fontSize: 16 }}>总体学习进度</Text>
            <Text type="secondary" style={{ fontSize: 14, marginTop: 4 }}>
              已完成 <Text strong style={{ color: '#52c41a' }}>{stats.completed}</Text>
              {' / 总计 '}
              <Text strong>{stats.total}</Text>
            </Text>
          </div>
        </div>
      </Card>

      {/* 各学科进度：每个 group 一张卡片，内部用网格展示圆形进度 */}
      {loading ? (
        <Card className="compact-section-card" loading />
      ) : groupedProgress.length === 0 ? (
        <Card className="compact-section-card">
          <Empty description="暂无学习数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </Card>
      ) : (
        groupedProgress.map((grp) => (
          <Card
            key={grp.group}
            className="compact-section-card"
            title={
              <Space>
                <FolderOutlined style={{ color: '#1890ff' }} />
                <span>{grp.group}</span>
                <Tag>{grp.categories.length} 个学科</Tag>
                {grp.percent === 100 && <Tag color="success">已完成</Tag>}
                <Text type="secondary" style={{ fontWeight: 400, fontSize: 13 }}>
                  {grp.done} / {grp.total} · {grp.percent}%
                </Text>
              </Space>
            }
          >
            <Row gutter={[12, 16]}>
              {grp.categories.map((cat) => (
                <Col span={6} key={cat.name}>
                  {/* 学科圆形进度卡片，点击跳转 */}
                  <div
                    className={`subject-card${cat.percent === 100 ? ' subject-card--done' : ''}`}
                    onClick={() => goToCategory(grp.group, cat.name)}
                    title={`查看 ${cat.name} 的学习内容`}
                  >
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <Progress
                        type="circle"
                        percent={cat.percent}
                        size={64}
                        strokeColor={getProgressColor(cat.percent)}
                        showInfo={cat.percent !== 100}  // 100% 时隐藏数字，改用对号图标
                      />
                      {/* 100% 完成时在圆环中心叠加绿色对号 */}
                      {cat.percent === 100 && (
                        <CheckCircleFilled className="subject-done-icon" />
                      )}
                    </div>
                    <Text className="subject-name" ellipsis title={cat.name}>
                      {cat.name}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {cat.done}/{cat.total}
                    </Text>
                  </div>
                </Col>
              ))}
            </Row>
          </Card>
        ))
      )}
    </div>
  )
}

export default Dashboard
