import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout, Result, theme } from 'antd'
import Header from './components/layout/Header'
import Dashboard from './pages/Dashboard'
import NotesLibrary from './pages/NotesLibrary'
import './App.css'

const { Content } = Layout

/**
 * 应用根组件
 * 配置整体布局和路由
 */
function App() {
  // 读取当前主题 token，使内容区背景随明暗主题自适应
  const {
    token: { colorBgContainer },
  } = theme.useToken()

  return (
    <HashRouter>
      <Layout style={{ minHeight: '100vh' }}>
        {/* 头部 */}
        <Header />

        {/* 主内容区 */}
        <Content className="app-content" style={{ background: colorBgContainer }}>
          <Routes>
            {/* 根路径重定向到学习概览 */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* 学习概览 */}
            <Route path="/dashboard" element={<Dashboard />} />

            {/* 学习资料 */}
            <Route path="/notes" element={<NotesLibrary />} />

            {/* 404 路由 */}
            <Route
              path="*"
              element={
                <Result
                  status="404"
                  title="404"
                  subTitle="页面不存在"
                />
              }
            />
          </Routes>
        </Content>
      </Layout>
    </HashRouter>
  )
}

export default App
