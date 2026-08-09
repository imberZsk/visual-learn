import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Layout,
  Space,
  Typography,
  Tooltip,
  Button,
  Drawer,
  Segmented,
} from 'antd'
import { SunOutlined, MoonFilled, SettingOutlined } from '@ant-design/icons'
import { useTheme } from '../../contexts/ThemeContext'
import Settings from '../../pages/Settings'
import { appApi } from '../../api'
import './Header.css'

/** antd Layout.Header 的别名 */
const { Header: AntHeader } = Layout

/** antd Typography.Text 的别名 */
const { Text } = Typography

/**
 * 头部组件
 * 显示顶部横向导航、当前日期、主题切换按钮和设置抽屉入口
 */
const Header: React.FC = () => {
  // updateVersion 存储检测到的 GitHub Release 新版本号。
  const [updateVersion, setUpdateVersion] = useState<string | null>(null)
  // updateLoading 标记安装包是否正在异步下载。
  const [updateLoading, setUpdateLoading] = useState(false)
  // updateDownloaded 标记安装包是否已完整下载。
  const [updateDownloaded, setUpdateDownloaded] = useState(false)
  // 路由跳转函数，用于顶部导航切换页面
  const navigate = useNavigate()
  // 当前路由位置对象，用于计算顶部导航的选中项
  const location = useLocation()

  // 当前主题模式（'dark' | 'light'）及切换函数
  const { mode, toggleTheme } = useTheme()

  // 设置抽屉的打开状态
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    // mounted 标记组件是否仍挂载，避免异步检查结束后更新已卸载组件。
    let mounted = true
    void appApi
      .checkAppUpdate()
      .then((result) => {
        if (mounted && result.available && result.version) {
          setUpdateVersion(result.version)
          setUpdateDownloaded(Boolean(result.downloaded))
        }
      })
      .catch(() => undefined)
    /** 清理更新检查副作用。 */
    return () => {
      mounted = false
    }
  }, [])

  /** 下载更新，下载完成后才开放安装入口。 */
  const handleAppUpdate = async () => {
    if (updateDownloaded) {
      await appApi.installAppUpdate()
      return
    }
    setUpdateLoading(true)
    try {
      await appApi.downloadAppUpdate()
      setUpdateDownloaded(true)
    } finally {
      setUpdateLoading(false)
    }
  }

  // 顶部主导航选项，value 对应当前应用的路由路径
  const navigationItems = [
    { label: '学习概览', value: '/dashboard' },
    { label: '学习资料', value: '/notes' },
  ]

  // 当前顶部导航选中的路由；未知路由时默认高亮学习概览
  const activeNavigationPath = navigationItems.some(
    (item) => item.value === location.pathname
  )
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
    <AntHeader className="app-header">
      {/* 左侧：产品名与主导航 */}
      <div className="app-header__primary">
        <div className="app-brand">
          <div className="app-brand__text">
            <Text strong className="app-brand__name">
              Visual Learn
            </Text>
            <span className="app-brand__subtitle">学习追踪工作台</span>
          </div>
        </div>
        <nav aria-label="主导航">
          <Segmented
            className="app-primary-nav"
            value={activeNavigationPath}
            options={navigationItems}
            onChange={handleNavigationChange}
          />
        </nav>
      </div>

      {/* 右侧：主题切换按钮；深色模式显示太阳（切换到浅色），浅色模式显示月亮（切换到深色） */}
      <Space className="app-header__actions" size={8}>
        {updateVersion && (
          <Tooltip title={`新版本 v${updateVersion}`}>
            <Button
              size="small"
              type="primary"
              loading={updateLoading}
              onClick={() => void handleAppUpdate()}
            >
              {updateDownloaded ? '安装并重启' : '下载更新'}
            </Button>
          </Tooltip>
        )}
        <Text type="secondary" className="app-header__date">
          {currentDate}
        </Text>
        <Tooltip title={mode === 'dark' ? '切换到浅色模式' : '切换到深色模式'}>
          <Button
            type="text"
            shape="circle"
            size="small"
            icon={mode === 'dark' ? <SunOutlined /> : <MoonFilled />}
            onClick={toggleTheme}
            className="app-header__icon-button"
            aria-label={mode === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
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
            className="app-header__icon-button"
            aria-label="设置"
          />
        </Tooltip>
      </Space>

      <Drawer
        title="设置"
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        rootClassName="settings-drawer"
        size={560}
        destroyOnHidden
      >
        <Settings />
      </Drawer>
    </AntHeader>
  )
}

export default Header
