import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout, theme } from 'antd'
import Sidebar from './components/layout/Sidebar'
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
    <BrowserRouter>
      <Layout style={{ minHeight: '100vh' }}>
        {/* 侧边栏 */}
        <Sidebar />

        <Layout>
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
                  <div style={{ textAlign: 'center', padding: '50px' }}>
                    <h1>404</h1>
                    <p>页面不存在</p>
                  </div>
                }
              />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </BrowserRouter>
  )
}

export default App
