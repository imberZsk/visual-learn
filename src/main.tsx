import React from 'react'
import ReactDOM from 'react-dom/client'
import { App as AntdApp, ConfigProvider, theme as antdTheme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import App from './App.tsx'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import './index.css'
import './theme-dark.css'

/**
 * 主题化的 ConfigProvider 包装：根据当前主题模式动态选用
 * antd 的深色 / 浅色算法，并微调深色下 Layout 各容器的背景层级
 */
const ThemedApp: React.FC = () => {
  // 读取当前主题模式
  const { mode } = useTheme()
  // 是否深色模式
  const isDark = mode === 'dark'

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        // 深色模式用 darkAlgorithm，浅色用默认算法
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
        },
        components: {
          // 深色下让 Layout 各容器使用统一的暗背景，避免纯黑
          Layout: isDark
            ? {
                bodyBg: '#141414',
                headerBg: '#1f1f1f',
                siderBg: '#1f1f1f',
              }
            : {},
        },
      }}
    >
      <AntdApp>
        <App />
      </AntdApp>
    </ConfigProvider>
  )
}

// 应用入口,将 App 组件挂载到 root 节点
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  </React.StrictMode>,
)
