import React, { useState } from 'react'
import { App as AntdApp, Button } from 'antd'
import { CopyOutlined, CheckOutlined } from '@ant-design/icons'

// 组件入参：语言标识 + 原始代码文本 + 已高亮的子节点
interface CodeBlockProps {
  language: string // 代码语言（如 ts、python），空串表示未标注
  rawCode: string // 用于复制的纯文本代码
  children: React.ReactNode // rehype-highlight 处理后的高亮节点
}

/**
 * 优雅的代码块组件
 * 顶部栏显示语言标签 + 一键复制按钮，下方为高亮代码区
 */
const CodeBlock: React.FC<CodeBlockProps> = ({ language, rawCode, children }) => {
  // message 存储 antd App 上下文消息 API，确保提示跟随当前主题。
  const { message } = AntdApp.useApp()
  // 是否处于"已复制"短暂反馈状态
  const [copied, setCopied] = useState(false)

  // 复制代码到剪贴板，并给出按钮态 + 全局提示反馈
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rawCode)
      setCopied(true)
      message.success('已复制到剪贴板')
      // 1.5s 后恢复复制图标
      setTimeout(() => setCopied(false), 1500)
    } catch (e) {
      message.error('复制失败')
    }
  }

  return (
    <div className="code-block">
      {/* 顶部栏：语言标签 + 复制按钮 */}
      <div className="code-block-header">
        <span className="code-block-lang">{language || 'code'}</span>
        <Button
          type="text"
          size="small"
          className="code-block-copy"
          icon={copied ? <CheckOutlined /> : <CopyOutlined />}
          onClick={handleCopy}
        >
          {copied ? '已复制' : '复制'}
        </Button>
      </div>

      {/* 代码内容区（保留 rehype-highlight 的高亮节点） */}
      <pre className="code-block-pre">{children}</pre>
    </div>
  )
}

export default CodeBlock
