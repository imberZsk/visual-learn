import React from 'react'
import ReactDOM from 'react-dom/client'
import { App as AntdApp, ConfigProvider, theme as antdTheme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import App from './App.tsx'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import './index.css'
import './theme-dark.css'

// APP_FONT_FAMILY 存储三个桌面工作台共用的系统字体栈，确保 Ant Design 控件与业务文本一致。
const APP_FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'

/**
 * 主题化的 ConfigProvider 包装：根据当前主题模式动态选用
 * antd 的深色 / 浅色算法，并与项目语义 CSS 变量保持一致
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
        algorithm: isDark
          ? antdTheme.darkAlgorithm
          : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 6,
          controlHeight: 32,
          fontFamily: APP_FONT_FAMILY,
        },
        components: {
          // Layout 容器与页面语义背景同步，避免 CSS 和 CSS-in-JS 之间出现色彩断层。
          Layout: {
            bodyBg: isDark ? '#000000' : '#f5f5f5',
            headerBg: isDark ? '#141414' : '#ffffff',
            siderBg: isDark ? '#141414' : '#ffffff',
          },
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
  </React.StrictMode>
)
