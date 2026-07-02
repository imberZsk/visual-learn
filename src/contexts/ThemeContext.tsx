import React, { createContext, useContext, useEffect, useState } from 'react'
import { appApi } from '../api'

// 主题模式类型：深色 / 浅色
export type ThemeMode = 'dark' | 'light'

// 主题上下文数据结构
interface ThemeContextValue {
  mode: ThemeMode // 当前主题模式
  toggleTheme: () => void // 切换明暗主题
  setMode: (mode: ThemeMode) => void // 直接设置主题模式
}

// 后端偏好存储中保存主题选择的 key
const STORAGE_KEY = 'themeMode'

// 主题上下文，默认深色
const ThemeContext = createContext<ThemeContextValue>({
  mode: 'dark',
  toggleTheme: () => {},
  setMode: () => {},
})

/**
 * 读取初始主题：后端偏好加载前默认深色
 */
function getInitialMode(): ThemeMode {
  return 'dark'
}

/**
 * 主题 Provider：管理明暗模式状态，持久化到后端统一偏好文件，
 * 并在根元素 <html> 上写入 data-theme 属性供 CSS 覆盖使用
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 当前主题模式状态
  const [mode, setModeState] = useState<ThemeMode>(getInitialMode)
  // 后端偏好是否已经完成首次读取
  const [preferenceLoaded, setPreferenceLoaded] = useState(false)

  // 组件挂载后从后端统一持久化目录读取主题偏好
  useEffect(() => {
    appApi.getPreference(STORAGE_KEY)
      .then((saved) => {
        // saved 存储后端返回的主题偏好值，只有合法主题才应用
        if (saved === 'light' || saved === 'dark') {
          setModeState(saved)
        }
      })
      .finally(() => setPreferenceLoaded(true))
  }, [])

  // 主题变化时同步到 <html> 的 data-theme 属性与后端偏好文件
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode)
    if (!preferenceLoaded) return
    appApi.setPreference(STORAGE_KEY, mode).catch((error) => {
      console.error('保存主题偏好失败:', error)
    })
  }, [mode, preferenceLoaded])

  // 设置指定主题模式
  const setMode = (next: ThemeMode) => setModeState(next)

  // 在深色 / 浅色之间切换
  const toggleTheme = () => setModeState((prev) => (prev === 'dark' ? 'light' : 'dark'))

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

/**
 * 读取主题上下文的 hook
 */
export const useTheme = (): ThemeContextValue => useContext(ThemeContext)
