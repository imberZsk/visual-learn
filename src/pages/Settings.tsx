import React, { useState, useEffect } from 'react'
import { Card, Typography, Space, Button, Input, Row, Col, message, Divider } from 'antd'
import { FolderOutlined, CodeOutlined, SaveOutlined } from '@ant-design/icons'
import { invoke } from '@tauri-apps/api/tauri'
import { open } from '@tauri-apps/api/dialog'
import './Settings.css'

const { Title, Text, Paragraph } = Typography

/**
 * 设置页面
 * 支持学习目录可配置、应用信息展示、使用说明
 */
const Settings: React.FC = () => {
  // 当前输入框中的学习目录路径
  const [studyPath, setStudyPath] = useState('')

  // 页面加载时从后端获取当前配置的学习目录
  useEffect(() => {
    invoke<string>('get_study_path')
      .then(setStudyPath)
      .catch(() => message.error('获取学习目录失败'))
  }, [])

  /**
   * 弹出系统目录选择器，将选中路径填入输入框
   */
  const handleSelectDir = async () => {
    try {
      const selected = await open({ directory: true, multiple: false })
      // open 返回 null 表示用户取消，string 表示选中路径
      if (typeof selected === 'string') {
        setStudyPath(selected)
      }
    } catch (error) {
      message.error('打开目录选择器失败: ' + error)
    }
  }

  /**
   * 保存学习目录到后端
   */
  const handleSave = async () => {
    try {
      await invoke('set_study_path', { path: studyPath })
      message.success('保存成功')
    } catch (error) {
      message.error('保存失败: ' + error)
    }
  }

  /**
   * 用 VSCode 打开当前学习目录
   */
  const handleOpenInVSCode = async () => {
    try {
      await invoke('open_in_vscode', { targetPath: studyPath })
      message.success('已用 VSCode 打开学习目录')
    } catch (error) {
      message.error('VSCode 打开失败: ' + error)
    }
  }

  return (
    <div className="settings-container">
      <Title level={4} className="page-title">⚙️ 设置</Title>

      <Row gutter={[12, 12]}>
        {/* 左列：学习目录（主要功能，占大列） */}
        <Col xs={24} sm={24} md={16}>
          <Card title="📂 学习目录" className="settings-card">
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <Text type="secondary">
                应用只扫描各「xxx小册」目录下的 .md 文档作为学习单元，
                点击 demo 按钮会用 VSCode 打开对应的「xxx-demo」示例。
              </Text>

              <Divider style={{ margin: '4px 0' }} />

              {/* 路径输入框与目录选择按钮 */}
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  value={studyPath}
                  onChange={e => setStudyPath(e.target.value)}
                  placeholder="请输入或选择学习目录路径"
                />
                <Button icon={<FolderOutlined />} onClick={handleSelectDir}>
                  选择目录
                </Button>
              </Space.Compact>

              {/* 保存与 VSCode 操作按钮 */}
              <Space>
                <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
                  保存
                </Button>
                <Button icon={<CodeOutlined />} onClick={handleOpenInVSCode}>
                  用 VSCode 打开
                </Button>
              </Space>
            </Space>
          </Card>
        </Col>

        {/* 右列：应用信息 + 使用说明堆叠 */}
        <Col xs={24} sm={24} md={8}>
          <Card title="ℹ️ 应用信息" className="settings-card">
            <Space direction="vertical" size="small">
              <Text>应用名称: 学习进度追踪器</Text>
              <Text>版本: 0.0.1</Text>
              <Text>技术栈: Tauri + React + TypeScript</Text>
            </Space>
          </Card>

          <Card title="📖 使用说明" className="settings-card">
            <Space direction="vertical" size="small">
              <Paragraph style={{ margin: 0 }}>
                <Text strong>1. 学习概览</Text>
                <br />
                查看总体学习进度和各学科的完成情况
              </Paragraph>

              <Paragraph style={{ margin: 0 }}>
                <Text strong>2. 学习资料</Text>
                <br />
                左侧选学科，中间选学习项（可勾选已学），右侧查看文档内容
              </Paragraph>

              <Paragraph style={{ margin: 0 }}>
                <Text strong>3. 打开 demo</Text>
                <br />
                点击学习项的 VSCode 按钮，直接打开对应的示例代码目录
              </Paragraph>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Settings
