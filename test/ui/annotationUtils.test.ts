// @vitest-environment happy-dom
import { describe, expect, test, vi } from 'vitest'
import {
  applyAnnotationHighlights,
  createAnnotationDraft,
  resolveAnnotationPosition,
} from '../../src/utils/annotations'

describe('annotation utils', () => {
  /**
   * 验证原偏移仍然匹配 quote 时优先使用原位置。
   */
  test('resolveAnnotationPosition 优先使用仍然准确的原偏移', () => {
    // fullText 存储当前文章渲染后的纯文本。
    const fullText = '第一段重点内容第二段'
    // annotation 存储待恢复的标注数据。
    const annotation = {
      id: 'a1',
      filePath: '/tmp/a.md',
      quote: '重点内容',
      startOffset: 3,
      endOffset: 7,
      prefix: '第一段',
      suffix: '第二段',
      comment: '',
      color: 'yellow',
      createdAt: 100,
      updatedAt: 100,
    }

    expect(resolveAnnotationPosition(fullText, annotation)).toEqual({
      startOffset: 3,
      endOffset: 7,
    })
  })

  /**
   * 验证文章前文插入内容后，唯一 quote 可以恢复到新偏移。
   */
  test('resolveAnnotationPosition 在偏移失效时通过唯一 quote 恢复', () => {
    // fullText 存储插入内容后的文章纯文本。
    const fullText = '新增说明。第一段重点内容第二段'
    // annotation 存储旧偏移已经失效的标注数据。
    const annotation = {
      id: 'a1',
      filePath: '/tmp/a.md',
      quote: '重点内容',
      startOffset: 3,
      endOffset: 7,
      prefix: '第一段',
      suffix: '第二段',
      comment: '',
      color: 'yellow',
      createdAt: 100,
      updatedAt: 100,
    }

    expect(resolveAnnotationPosition(fullText, annotation)).toEqual({
      startOffset: 8,
      endOffset: 12,
    })
  })

  /**
   * 验证重复 quote 时会用前后文选择最可信的位置。
   */
  test('resolveAnnotationPosition 在重复 quote 中通过上下文恢复', () => {
    // fullText 存储包含多个相同 quote 的文章纯文本。
    const fullText = '旧章节重点内容。新增段落。目标章节重点内容结束。'
    // annotation 存储 quote 重复但上下文可区分的标注数据。
    const annotation = {
      id: 'a1',
      filePath: '/tmp/a.md',
      quote: '重点内容',
      startOffset: 3,
      endOffset: 7,
      prefix: '目标章节',
      suffix: '结束',
      comment: '',
      color: 'yellow',
      createdAt: 100,
      updatedAt: 100,
    }

    expect(resolveAnnotationPosition(fullText, annotation)).toEqual({
      startOffset: 17,
      endOffset: 21,
    })
  })

  /**
   * 验证重复 quote 且上下文无法命中时不会贸然恢复，避免错误高亮。
   */
  test('resolveAnnotationPosition 在重复 quote 且上下文不匹配时返回 null', () => {
    // fullText 存储无法通过上下文区分候选位置的文章纯文本。
    const fullText = '第一处重点内容。第二处重点内容。'
    // annotation 存储上下文已经无法匹配当前文章的标注数据。
    const annotation = {
      id: 'a1',
      filePath: '/tmp/a.md',
      quote: '重点内容',
      startOffset: 3,
      endOffset: 7,
      prefix: '不存在的前文',
      suffix: '不存在的后文',
      comment: '',
      color: 'yellow',
      createdAt: 100,
      updatedAt: 100,
    }

    expect(resolveAnnotationPosition(fullText, annotation)).toBeNull()
  })

  /**
   * 验证可从 DOM Range 生成带上下文的标注草稿。
   */
  test('createAnnotationDraft 从正文选区生成标注草稿', () => {
    // root 存储模拟 Markdown 正文容器。
    const root = document.createElement('div')
    root.innerHTML = '<p>前文<span>重点内容</span>后文</p>'
    // textNode 存储被选中文本所在的 DOM 文本节点。
    const textNode = root.querySelector('span')!.firstChild!
    // range 存储用户选择重点内容的 DOM Range。
    const range = document.createRange()
    range.setStart(textNode, 0)
    range.setEnd(textNode, 4)

    expect(createAnnotationDraft(root, range, '/tmp/a.md', 100)).toMatchObject({
      filePath: '/tmp/a.md',
      quote: '重点内容',
      startOffset: 2,
      endOffset: 6,
      prefix: '前文',
      suffix: '后文',
      comment: '',
      color: 'yellow',
      createdAt: 100,
      updatedAt: 100,
    })
  })

  /**
   * 验证 DOM 高亮包裹会生成可点击的标注节点。
   */
  test('applyAnnotationHighlights 包裹命中的正文文本', () => {
    // root 存储模拟 Markdown 正文容器。
    const root = document.createElement('div')
    root.textContent = '这是重点内容之后'
    // onClick 存储点击高亮时触发的回调替身。
    const onClick = vi.fn()
    // annotation 存储需要渲染到 DOM 上的标注数据。
    const annotation = {
      id: 'a1',
      filePath: '/tmp/a.md',
      quote: '重点内容',
      startOffset: 2,
      endOffset: 6,
      prefix: '这是',
      suffix: '之后',
      comment: '复习',
      color: 'yellow',
      createdAt: 100,
      updatedAt: 100,
    }

    expect(applyAnnotationHighlights(root, [annotation], onClick)).toHaveLength(1)
    expect(root.querySelector('.annotation-highlight')?.textContent).toBe('重点内容')

    root.querySelector<HTMLElement>('.annotation-highlight')?.click()
    expect(onClick).toHaveBeenCalledWith(annotation)
  })

  /**
   * 验证跨多个 DOM 文本节点的标注会分段包裹，避免 surroundContents 因跨元素选择失败。
   */
  test('applyAnnotationHighlights 支持跨段落和跨节点标注', () => {
    // root 存储模拟 Markdown 正文容器，包含多个段落和内联元素。
    const root = document.createElement('div')
    root.innerHTML = '<p>第一段<span>重点</span></p><p>第二段内容</p>'
    // onClick 存储点击高亮时触发的回调替身。
    const onClick = vi.fn()
    // annotation 存储跨多个文本节点的标注数据。
    const annotation = {
      id: 'a2',
      filePath: '/tmp/a.md',
      quote: '重点第二段',
      startOffset: 3,
      endOffset: 8,
      prefix: '第一段',
      suffix: '内容',
      comment: '跨段评论',
      color: 'yellow',
      createdAt: 100,
      updatedAt: 100,
    }

    expect(applyAnnotationHighlights(root, [annotation], onClick)).toHaveLength(1)
    expect(Array.from(root.querySelectorAll('.annotation-highlight')).map((el) => el.textContent).join('')).toBe('重点第二段')

    root.querySelector<HTMLElement>('.annotation-highlight')?.click()
    expect(onClick).toHaveBeenCalledWith(annotation)
  })
})
