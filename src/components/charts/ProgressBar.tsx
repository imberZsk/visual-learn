import React from 'react'
import { Progress, Space, Tag, Typography } from 'antd'
import './Charts.css'

/** antd Typography.Text 的别名。 */
const { Text } = Typography

/**
 * 进度条组件的属性接口
 */
interface ProgressBarProps {
  // 当前进度值
  current: number
  // 目标值
  target: number
  // 进度条标签
  label?: string
  // 显示颜色，兼容旧 Tailwind 类名或直接传入 CSS 色值
  color?: string
  // 是否显示百分比
  showPercentage?: boolean
  // 是否显示数值
  showValues?: boolean
}

/**
 * 进度条组件
 * 用于可视化展示学习进度和目标完成情况
 */
const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  target,
  label,
  color = 'bg-blue-500',
  showPercentage = true,
  showValues = true,
}) => {
  /**
   * 计算完成百分比
   * @returns 百分比数值 (0-100)
   */
  const calculatePercentage = (): number => {
    // 避免除以零的情况
    if (target === 0) return 0

    // 计算百分比,最大不超过 100%
    const percentage = (current / target) * 100
    return Math.min(Math.round(percentage), 100)
  }

  // 完成百分比
  const percentage = calculatePercentage()

  /**
   * 根据完成度返回状态文本和 antd Tag 色值
   * @returns 状态对象
   */
  const getStatus = (): { text: string; color: string } => {
    if (percentage >= 100) {
      return { text: '已完成', color: 'success' }
    } else if (percentage >= 75) {
      return { text: '接近完成', color: 'processing' }
    } else if (percentage >= 50) {
      return { text: '进行中', color: 'warning' }
    } else {
      return { text: '刚开始', color: 'default' }
    }
  }

  /**
   * 将旧 Tailwind 颜色类映射为 antd Progress 可用色值。
   * @param value - 调用方传入的颜色配置。
   * @returns antd Progress 的 strokeColor。
   */
  const resolveStrokeColor = (value: string): string => {
    // colorMap 存储旧 Tailwind 类名到实际 CSS 颜色的兼容映射。
    const colorMap: Record<string, string> = {
      'bg-blue-500': 'rgb(var(--vl-accent))',
      'bg-green-500': 'rgb(var(--vl-success))',
      'bg-yellow-500': 'rgb(var(--vl-warning))',
      'bg-red-500': 'rgb(var(--vl-danger))',
      'bg-purple-500': 'rgb(var(--vl-accent))',
    }

    return colorMap[value] || value
  }

  // status 存储当前完成度对应的状态文案和 Tag 色值。
  const status = getStatus()
  // strokeColor 存储 antd Progress 使用的进度条颜色。
  const strokeColor = resolveStrokeColor(color)

  return (
    <div className="progress-bar">
      {/* 顶部信息行 */}
      <div className="progress-bar__header">
        <Space size={8} wrap>
          {/* 进度条标签 */}
          {label && <Text strong>{label}</Text>}
          {/* 状态标签 */}
          <Tag color={status.color}>{status.text}</Tag>
        </Space>

        {/* 数值显示 */}
        <Space size={12}>
          {showValues && (
            <Text type="secondary">
              {current} / {target}
            </Text>
          )}
          {showPercentage && <Text strong>{percentage}%</Text>}
        </Space>
      </div>

      {/* antd 进度条 */}
      <Progress
        percent={percentage}
        showInfo={false}
        strokeColor={strokeColor}
      />

      {/* 里程碑标记 (可选) */}
      {target > 0 && (
        <div className="progress-bar__milestones">
          <Text type="secondary">0</Text>
          <Text type="secondary">{target / 2}</Text>
          <Text type="secondary">{target}</Text>
        </div>
      )}
    </div>
  )
}

export default ProgressBar
