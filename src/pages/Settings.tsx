import React, { useState, useEffect } from 'react'
import { Card, Typography, Space, Button, Input, message, Divider } from 'antd'
import { FolderOutlined, CodeOutlined, SaveOutlined, ReadOutlined } from '@ant-design/icons'
import { invoke } from '@tauri-apps/api/tauri'
import { open } from '@tauri-apps/api/dialog'
import './Settings.css'

const { Text } = Typography

/**
 * 设置内容组件
 * 支持学习目录可配置和应用信息展示，供顶部设置抽屉复用
 */
const Settings: React.FC = () => {
  // 当前输入框中的文章内容目录路径
  const [studyPath, setStudyPath] = useState('')
  // 当前输入框中的 VSCode 打开目录路径
  const [vscodePath, setVscodePath] = useState('')
  // 保存按钮加载状态
  const [saving, setSaving] = useState(false)

  // 页面加载时从后端获取当前配置的文章目录与 VSCode 目录
  useEffect(() => {
    Promise.all([
      invoke<string>('get_study_path'),
      invoke<string>('get_vscode_path'),
    ])
      .then(([nextStudyPath, nextVscodePath]) => {
        setStudyPath(nextStudyPath)
        setVscodePath(nextVscodePath)
      })
      .catch(() => message.error('获取学习目录失败'))
  }, [])

  /**
   * 弹出系统目录选择器，并把选中路径交给指定状态更新函数。
   *
   * @param setter 选中目录后的状态更新函数
   */
  const handleSelectDir = async (setter: (path: string) => void) => {
    try {
      const selected = await open({ directory: true, multiple: false })
      // open 返回 null 表示用户取消，string 表示选中路径
      if (typeof selected === 'string') {
        setter(selected)
      }
    } catch (error) {
      message.error('打开目录选择器失败: ' + error)
    }
  }

  /**
   * 保存文章目录和 VSCode 打开目录到后端持久化配置。
   */
  const handleSave = async () => {
    try {
      setSaving(true)
      await invoke('set_study_path', { path: studyPath })
      await invoke('set_vscode_path', { path: vscodePath })
      message.success('保存成功')
    } catch (error) {
      message.error('保存失败: ' + error)
    } finally {
      setSaving(false)
    }
  }

  /**
   * 用 VSCode 打开当前配置目录。
   *
   * @param targetPath 要打开的目录路径
   * @param successText 打开成功后的提示文案
   */
  const handleOpenInVSCode = async (targetPath: string, successText: string) => {
    try {
      await invoke('open_in_vscode', { targetPath })
      message.success(successText)
    } catch (error) {
      message.error('VSCode 打开失败: ' + error)
    }
  }

  return (
    <div className="settings-container">
      <Card title="学习目录" className="settings-card">
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          <Text type="secondary">
            应用会扫描文章内容目录下的 chapter.md 和普通 .md 文档；
            文章旁的 lab 或 demo 目录会作为“打开代码”的目标。
          </Text>

          <Divider style={{ margin: '4px 0' }} />

          <Text strong>文章内容目录</Text>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              value={studyPath}
              onChange={e => setStudyPath(e.target.value)}
              placeholder="请输入或选择文章内容目录路径"
            />
            <Button icon={<FolderOutlined />} onClick={() => handleSelectDir(setStudyPath)}>
              选择目录
            </Button>
          </Space.Compact>

          <Text strong>VSCode 打开目录</Text>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              value={vscodePath}
              onChange={e => setVscodePath(e.target.value)}
              placeholder="请输入或选择 VSCode 打开目录路径"
            />
            <Button icon={<FolderOutlined />} onClick={() => handleSelectDir(setVscodePath)}>
              选择目录
            </Button>
          </Space.Compact>

          {/* 保存与 VSCode 操作按钮 */}
          <Space wrap>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
              保存
            </Button>
            <Button
              icon={<ReadOutlined />}
              onClick={() => handleOpenInVSCode(studyPath, '已用 VSCode 打开文章目录')}
            >
              打开文章目录
            </Button>
            <Button
              icon={<CodeOutlined />}
              onClick={() => handleOpenInVSCode(vscodePath, '已用 VSCode 打开配置目录')}
            >
              打开 VSCode 目录
            </Button>
          </Space>
        </Space>
      </Card>

      <Card title="应用信息" className="settings-card">
        <Space direction="vertical" size="small">
          <Text>应用名称: 学习进度追踪器</Text>
          <Text>版本: 0.0.1</Text>
          <Text>技术栈: Tauri + React + TypeScript</Text>
        </Space>
      </Card>
    </div>
  )
}

export default Settings
