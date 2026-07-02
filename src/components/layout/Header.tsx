import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Layout, Space, Typography, theme, Tooltip, Button, Drawer, Segmented } from 'antd'
import { BookOutlined, SunOutlined, MoonFilled, SettingOutlined } from '@ant-design/icons'
import { useTheme } from '../../contexts/ThemeContext'
import Settings from '../../pages/Settings'

/** antd Layout.Header 的别名 */
const { Header: AntHeader } = Layout

/** antd Typography.Text 的别名 */
const { Text } = Typography

/**
 * 头部组件
 * 显示顶部横向导航、当前日期、主题切换按钮和设置抽屉入口
 */
const Header: React.FC = () => {
  // 路由跳转函数，用于顶部导航切换页面
  const navigate = useNavigate()
  // 当前路由位置对象，用于计算顶部导航的选中项
  const location = useLocation()

  // 读取主题 token，使头部背景与分隔线随明暗主题自适应
  const {
    token: { colorBgContainer, colorSplit, colorText, colorTextSecondary },
  } = theme.useToken()

  // 当前主题模式（'dark' | 'light'）及切换函数
  const { mode, toggleTheme } = useTheme()

  // 设置抽屉的打开状态
  const [settingsOpen, setSettingsOpen] = useState(false)

  // 顶部主导航选项，value 对应当前应用的路由路径
  const navigationItems = [
    { label: '学习概览', value: '/dashboard' },
    { label: '学习资料', value: '/notes' },
  ]

  // 当前顶部导航选中的路由；未知路由时默认高亮学习概览
  const activeNavigationPath = navigationItems.some((item) => item.value === location.pathname)
    ? location.pathname
    : '/dashboard'

  // 当前日期的中文格式字符串，如"2026年6月22日星期一"
  const currentDate = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })

  /**
   * 处理顶部导航切换
   * @param value - Segmented 选中的路由路径
   */
  const handleNavigationChange = (value: string | number) => {
    // nextPath 存储目标路由字符串；Segmented 的 value 类型包含 number，这里统一转成 string
    const nextPath = String(value)
    navigate(nextPath)
  }

  return (
    <AntHeader
      style={{
        background: colorBgContainer,
        height: 'auto',
        minHeight: 48,
        lineHeight: 'normal',
        padding: '0 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        borderBottom: `1px solid ${colorSplit}`,
        gap: 12,
      }}
    >
      {/* 左侧：产品名与主导航 */}
      <Space size={12} wrap>
        <Space size={6}>
          <BookOutlined style={{ color: colorText, fontSize: 16 }} />
          <Text strong style={{ color: colorText, fontSize: 15, whiteSpace: 'nowrap' }}>
            学习追踪
          </Text>
        </Space>
        <Segmented
          size="small"
          value={activeNavigationPath}
          options={navigationItems}
          onChange={handleNavigationChange}
        />
      </Space>

      {/* 右侧：主题切换按钮；深色模式显示太阳（切换到浅色），浅色模式显示月亮（切换到深色） */}
      <Space>
        <Text type="secondary" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{currentDate}</Text>
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

        {/* 设置入口：收敛到顶部小图标，点击后在右侧抽屉中展示设置内容 */}
        <Tooltip title="设置">
          <Button
            type="text"
            shape="circle"
            size="small"
            icon={<SettingOutlined />}
            onClick={() => setSettingsOpen(true)}
            style={{ fontSize: 16, color: colorTextSecondary }}
          />
        </Tooltip>
      </Space>

      <Drawer
        title="设置"
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        width={520}
        destroyOnClose
      >
        <Settings />
      </Drawer>
    </AntHeader>
  )
}

export default Header
