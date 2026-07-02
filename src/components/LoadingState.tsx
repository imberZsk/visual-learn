import { Spin, Typography } from 'antd'
import type { FC } from 'react'

/** LoadingState 组件属性。 */
interface LoadingStateProps {
  /** 加载提示文案。 */
  tip?: string
  /** 是否使用紧凑模式，适合文章正文等局部区域。 */
  compact?: boolean
}

/**
 * 统一加载状态组件：用于页面级和局部区域的加载反馈。
 * @param props - 组件属性，tip 为提示文案，compact 控制局部加载高度。
 */
const LoadingState: FC<LoadingStateProps> = ({ tip = '加载中...', compact = false }) => {
  // className 存储加载组件根节点样式类。
  const className = compact ? 'loading-state loading-state--compact' : 'loading-state'

  return (
    <div className={className}>
      <Spin size={compact ? 'default' : 'large'} />
      <Typography.Text type="secondary" className="loading-state-tip">
        {tip}
      </Typography.Text>
    </div>
  )
}

export default LoadingState
