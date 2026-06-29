import React from 'react'
import { Layout, Menu, theme } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  DashboardOutlined,
  FolderOutlined,
} from '@ant-design/icons'

const { Sider } = Layout

/**
 * 侧边栏导航组件
 */
const Sidebar: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  // 读取主题 token，使侧边栏背景与分隔线随明暗主题自适应
  const {
    token: { colorBgContainer, colorSplit },
  } = theme.useToken()

  // 菜单项配置：设置入口已收敛到顶部栏图标，不再占用侧边栏导航
  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '学习概览',
    },
    {
      key: '/notes',
      icon: <FolderOutlined />,
      label: '学习资料',
    },
  ]

  // 处理菜单点击
  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key)
  }

  return (
    <Sider width={176} style={{ background: colorBgContainer }}>
      {/* Logo 区域 */}
      <div
        style={{
          height: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 15,
          fontWeight: 'bold',
          borderBottom: `1px solid ${colorSplit}`,
        }}
      >
        📚 学习追踪
      </div>

      {/* 导航菜单 */}
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={handleMenuClick}
        style={{ height: 'calc(100% - 48px)', borderRight: 0 }}
      />
    </Sider>
  )
}

export default Sidebar
