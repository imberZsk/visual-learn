import React, { useState, useEffect } from 'react'
import { App as AntdApp, Space, Button, Input } from 'antd'
import {
  FolderOutlined,
  CodeOutlined,
  SaveOutlined,
  ReadOutlined,
} from '@ant-design/icons'
import { appApi } from '../api'
import packageInfo from '../../package.json'
import './Settings.css'

// PathField 标识当前正在打开目录选择器的配置项。
type PathField = 'study' | 'vscode'

/**
 * 设置内容组件
 * 支持学习目录可配置和应用信息展示，供顶部设置抽屉复用
 */
const Settings: React.FC = () => {
  // message 存储 antd App 上下文消息 API，确保提示跟随当前主题。
  const { message } = AntdApp.useApp()
  // 当前输入框中的文章内容目录路径
  const [studyPath, setStudyPath] = useState('')
  // 当前输入框中的 VSCode 打开目录路径
  const [vscodePath, setVscodePath] = useState('')
  // 保存按钮加载状态
  const [saving, setSaving] = useState(false)
  // 当前正在打开目录选择器的字段，用于给对应按钮显示 loading。
  const [pickingPathField, setPickingPathField] = useState<PathField | null>(
    null
  )

  // 页面加载时从后端获取当前配置的文章目录与 VSCode 目录
  useEffect(() => {
    Promise.all([appApi.getStudyPath(), appApi.getVscodePath()])
      .then(([nextStudyPath, nextVscodePath]) => {
        setStudyPath(nextStudyPath)
        setVscodePath(nextVscodePath)
      })
      .catch(() => message.error('获取学习目录失败'))
  }, [message])

  /**
   * 弹出系统目录选择器，并把选中路径交给指定状态更新函数。
   *
   * @param field 当前选择的配置项字段
   * @param setter 选中目录后的状态更新函数
   * @param defaultPath 目录选择器默认打开路径
   */
  const handleSelectDir = async (
    field: PathField,
    setter: (path: string) => void,
    defaultPath?: string
  ) => {
    try {
      setPickingPathField(field)
      // selected 存储 Electron 目录选择器返回结果。
      const selected = await appApi.selectDirectory({ defaultPath })
      if (!selected.canceled && selected.path) {
        setter(selected.path)
      }
    } catch (error) {
      message.error('打开目录选择器失败: ' + error)
    } finally {
      setPickingPathField(null)
    }
  }

  /**
   * 保存文章目录和 VSCode 打开目录到后端持久化配置。
   */
  const handleSave = async () => {
    try {
      setSaving(true)
      await appApi.setStudyPath(studyPath)
      await appApi.setVscodePath(vscodePath)
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
  const handleOpenInVSCode = async (
    targetPath: string,
    successText: string
  ) => {
    try {
      await appApi.openInVscode(targetPath)
      message.success(successText)
    } catch (error) {
      message.error('VSCode 打开失败: ' + error)
    }
  }

  return (
    <div className="settings-container">
      <section
        className="settings-section"
        aria-labelledby="learning-directory-title"
      >
        <div className="settings-section__header">
          <h2 id="learning-directory-title">学习目录</h2>
          <p>
            应用会扫描文章内容目录下的 chapter.md 和普通 .md 文档；文章旁的 lab
            或 demo 目录会作为“打开代码”的目标。
          </p>
        </div>

        <div className="settings-field-list">
          <div className="settings-field">
            <label htmlFor="settings-study-path">文章内容目录</label>
            <Space.Compact className="settings-path-control">
              <Input
                id="settings-study-path"
                value={studyPath}
                onChange={(e) => setStudyPath(e.target.value)}
                placeholder="请输入或选择文章内容目录路径"
                title={studyPath}
              />
              <Button
                icon={<FolderOutlined />}
                loading={pickingPathField === 'study'}
                onClick={() =>
                  handleSelectDir('study', setStudyPath, studyPath)
                }
              >
                选择目录
              </Button>
            </Space.Compact>
          </div>

          <div className="settings-field">
            <label htmlFor="settings-vscode-path">VSCode 打开目录</label>
            <Space.Compact className="settings-path-control">
              <Input
                id="settings-vscode-path"
                value={vscodePath}
                onChange={(e) => setVscodePath(e.target.value)}
                placeholder="请输入或选择 VSCode 打开目录路径"
                title={vscodePath}
              />
              <Button
                icon={<FolderOutlined />}
                loading={pickingPathField === 'vscode'}
                onClick={() =>
                  handleSelectDir('vscode', setVscodePath, vscodePath)
                }
              >
                选择目录
              </Button>
            </Space.Compact>
          </div>
        </div>

        {/* 保存与 VSCode 操作按钮 */}
        <div className="settings-actions">
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saving}
          >
            保存
          </Button>
          <Button
            icon={<ReadOutlined />}
            onClick={() =>
              handleOpenInVSCode(studyPath, '已用 VSCode 打开文章目录')
            }
          >
            打开文章目录
          </Button>
          <Button
            icon={<CodeOutlined />}
            onClick={() =>
              handleOpenInVSCode(vscodePath, '已用 VSCode 打开配置目录')
            }
          >
            打开 VSCode 目录
          </Button>
        </div>
      </section>

      <section
        className="settings-section"
        aria-labelledby="application-info-title"
      >
        <div className="settings-section__header settings-section__header--compact">
          <h2 id="application-info-title">应用信息</h2>
        </div>
        <dl className="application-info">
          <div>
            <dt>应用名称</dt>
            <dd>Visual Learn</dd>
          </div>
          <div>
            <dt>版本</dt>
            <dd>{packageInfo.version}</dd>
          </div>
          <div>
            <dt>技术栈</dt>
            <dd>Electron + React + TypeScript</dd>
          </div>
        </dl>
      </section>
    </div>
  )
}

export default Settings
