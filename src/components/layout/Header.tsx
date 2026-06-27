import React from 'react'
import { Layout, Space, Typography, theme, Tooltip, Button } from 'antd'
import { SunOutlined, MoonFilled } from '@ant-design/icons'
import { useTheme } from '../../contexts/ThemeContext'

/** antd Layout.Header 的别名 */
const { Header: AntHeader } = Layout

/** antd Typography.Text 的别名 */
const { Text } = Typography

/**
 * 头部组件
 * 显示当前日期（左侧）和主题切换按钮（右侧）
 */
const Header: React.FC = () => {
  // 读取主题 token，使头部背景与分隔线随明暗主题自适应
  const {
    token: { colorBgContainer, colorSplit, colorTextSecondary },
  } = theme.useToken()

  // 当前主题模式（'dark' | 'light'）及切换函数
  const { mode, toggleTheme } = useTheme()

  // 当前日期的中文格式字符串，如"2026年6月22日星期一"
  const currentDate = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })

  return (
    <AntHeader
      style={{
        background: colorBgContainer,
        height: 48,
        lineHeight: '48px',
        padding: '0 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${colorSplit}`,
      }}
    >
      {/* 左侧：当前日期 */}
      <Text type="secondary" style={{ fontSize: 13 }}>{currentDate}</Text>

      {/* 右侧：主题切换按钮；深色模式显示太阳（切换到浅色），浅色模式显示月亮（切换到深色） */}
      <Space>
        <Tooltip title={mode === 'dark' ? '切换到浅色模式' : '切换到深色模式'}>
          <Button
            type="text"
            shape="circle"
            size="small"
            icon={mode === 'dark' ? <SunOutlined /> : <MoonFilled />}
            onClick={toggleTheme}
            style={{ fontSize: 16, color: colorTextSecondary }}
          />
        </Tooltip>
      </Space>
    </AntHeader>
  )
}

export default Header
