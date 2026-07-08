// CONTEXT_LENGTH 存储用于恢复标注位置的前后文最大长度。
const CONTEXT_LENGTH = 80

// SKIP_SELECTOR 存储不参与正文标注的交互或代码区域选择器。
const SKIP_SELECTOR = 'pre, code, button, input, textarea, .annotation-toolbar, .annotation-highlight'

/** 文章标注记录。 */
export interface ArticleAnnotation {
  /** 标注唯一 ID。 */
  id: string
  /** 标注关联的文章绝对路径。 */
  filePath: string
  /** 用户选中的原文片段。 */
  quote: string
  /** 标注在文章纯文本中的起始偏移。 */
  startOffset: number
  /** 标注在文章纯文本中的结束偏移。 */
  endOffset: number
  /** 选中文本前方上下文。 */
  prefix: string
  /** 选中文本后方上下文。 */
  suffix: string
  /** 评论内容，空字符串表示纯高亮。 */
  comment: string
  /** 高亮颜色名称。 */
  color: string
  /** 创建时间戳。 */
  createdAt: number
  /** 更新时间戳。 */
  updatedAt: number
}

/** 新建标注时生成的草稿数据。 */
export type AnnotationDraft = Omit<ArticleAnnotation, 'id'>

/** 纯文本偏移范围。 */
export interface AnnotationPosition {
  /** 范围起始偏移。 */
  startOffset: number
  /** 范围结束偏移。 */
  endOffset: number
}

/** 带全文偏移信息的 DOM 文本节点。 */
interface TextNodeSlice {
  /** DOM 文本节点。 */
  node: Text
  /** 文本节点在文章纯文本中的起始偏移。 */
  startOffset: number
  /** 文本节点在文章纯文本中的结束偏移。 */
  endOffset: number
}

/** 待渲染的标注范围。 */
interface RenderableAnnotation {
  /** 原始标注记录。 */
  annotation: ArticleAnnotation
  /** 恢复后的文本范围。 */
  position: AnnotationPosition
}

/**
 * 判断文本节点是否应该跳过。
 * @param node - 需要判断的 DOM 文本节点。
 * @returns 位于代码块、表单控件或已有高亮内时返回 true。
 */
function shouldSkipTextNode(node: Text): boolean {
  // parent 存储文本节点的父元素。
  const parent = node.parentElement
  if (!parent) return true

  return Boolean(parent.closest(SKIP_SELECTOR))
}

/**
 * 收集正文中可标注的文本节点，并记录每个节点在纯文本中的偏移范围。
 * @param root - Markdown 正文根容器。
 * @returns 带偏移信息的文本节点列表。
 */
export function collectTextNodes(root: HTMLElement): TextNodeSlice[] {
  // walker 存储遍历正文文本节点的 TreeWalker。
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    /**
     * 过滤不应参与标注的文本节点。
     * @param node - TreeWalker 当前访问的节点。
     * @returns TreeWalker 过滤结果。
     */
    acceptNode(node) {
      return shouldSkipTextNode(node as Text)
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT
    },
  })
  // slices 存储带全文偏移的文本节点列表。
  const slices: TextNodeSlice[] = []
  // offset 存储遍历到当前节点前的累计文本长度。
  let offset = 0
  // current 存储 TreeWalker 当前文本节点。
  let current = walker.nextNode() as Text | null

  while (current) {
    // text 存储当前文本节点内容。
    const text = current.nodeValue || ''
    // startOffset 存储当前节点在全文中的起始偏移。
    const startOffset = offset
    // endOffset 存储当前节点在全文中的结束偏移。
    const endOffset = startOffset + text.length
    if (text.length > 0) {
      slices.push({ node: current, startOffset, endOffset })
    }
    offset = endOffset
    current = walker.nextNode() as Text | null
  }

  return slices
}

/**
 * 从文本节点切片中拼出文章纯文本。
 * @param slices - 带全文偏移的文本节点列表。
 * @returns 当前文章正文纯文本。
 */
function getFullText(slices: TextNodeSlice[]): string {
  return slices.map((slice) => slice.node.nodeValue || '').join('')
}

/**
 * 获取正文中可标注文本节点拼出的纯文本。
 * @param root - Markdown 正文根容器。
 * @returns 当前正文纯文本。
 */
export function getAnnotatableText(root: HTMLElement): string {
  // slices 存储正文可标注文本节点和偏移。
  const slices = collectTextNodes(root)
  return getFullText(slices)
}

/**
 * 判断 Range 是否完整落在正文容器内。
 * @param root - Markdown 正文根容器。
 * @param range - 用户选择的 DOM Range。
 * @returns 选区属于正文时返回 true。
 */
function isRangeInsideRoot(root: HTMLElement, range: Range): boolean {
  return root.contains(range.startContainer) && root.contains(range.endContainer)
}

/**
 * 根据 DOM 节点和节点内偏移计算全文偏移。
 * @param slices - 带全文偏移的文本节点列表。
 * @param node - Range 边界所在 DOM 节点。
 * @param localOffset - Range 边界在节点内的偏移。
 * @returns 全文偏移，无法计算时返回 null。
 */
function findGlobalOffset(slices: TextNodeSlice[], node: Node, localOffset: number): number | null {
  if (node.nodeType === Node.TEXT_NODE) {
    // textNode 存储 Range 边界所在文本节点。
    const textNode = node as Text
    // slice 存储文本节点对应的全文偏移切片。
    const slice = slices.find((item) => item.node === textNode)
    if (!slice) return null

    return slice.startOffset + localOffset
  }

  // childNodes 存储元素节点下参与 Range 边界计算的子节点列表。
  const childNodes = Array.from(node.childNodes)
  // boundaryNode 存储 Range 边界后方的第一个子节点。
  const boundaryNode = childNodes[localOffset]
  // firstAfterBoundary 存储边界后第一个文本切片。
  const firstAfterBoundary = boundaryNode
    ? slices.find((item) => boundaryNode === item.node || boundaryNode.contains(item.node))
    : null
  if (firstAfterBoundary) return firstAfterBoundary.startOffset

  // previousSlices 存储位于当前元素内部的文本切片。
  const previousSlices = slices.filter((item) => node.contains(item.node))
  // lastSlice 存储当前元素最后一个文本切片，用于元素末尾边界。
  const lastSlice = previousSlices[previousSlices.length - 1]
  return lastSlice ? lastSlice.endOffset : null
}

/**
 * 创建包含前后文的标注草稿。
 * @param root - Markdown 正文根容器。
 * @param range - 用户选择的 DOM Range。
 * @param filePath - 当前文章路径。
 * @param timestamp - 创建时间戳。
 * @returns 可保存的标注草稿；选区无效时返回 null。
 */
export function createAnnotationDraft(
  root: HTMLElement,
  range: Range,
  filePath: string,
  timestamp: number
): AnnotationDraft | null {
  if (range.collapsed || !isRangeInsideRoot(root, range)) return null

  // slices 存储正文可标注文本节点和偏移。
  const slices = collectTextNodes(root)
  // fullText 存储当前文章正文纯文本。
  const fullText = getFullText(slices)
  // startOffset 存储选区起点的全文偏移。
  const startOffset = findGlobalOffset(slices, range.startContainer, range.startOffset)
  // endOffset 存储选区终点的全文偏移。
  const endOffset = findGlobalOffset(slices, range.endContainer, range.endOffset)

  if (startOffset === null || endOffset === null || endOffset <= startOffset) return null

  // quote 存储用户实际选中的正文片段。
  const quote = fullText.slice(startOffset, endOffset)
  if (!quote.trim()) return null

  return {
    filePath,
    quote,
    startOffset,
    endOffset,
    prefix: fullText.slice(Math.max(0, startOffset - CONTEXT_LENGTH), startOffset),
    suffix: fullText.slice(endOffset, endOffset + CONTEXT_LENGTH),
    comment: '',
    color: 'yellow',
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

/**
 * 查找 quote 在全文中的所有位置。
 * @param fullText - 当前文章正文纯文本。
 * @param quote - 标注原文片段。
 * @returns quote 的所有候选起始偏移。
 */
function findQuoteCandidates(fullText: string, quote: string): number[] {
  // candidates 存储所有候选起始偏移。
  const candidates: number[] = []
  // searchFrom 存储下一次查找开始的位置。
  let searchFrom = 0

  while (searchFrom <= fullText.length) {
    // index 存储本轮查找到的 quote 起始位置。
    const index = fullText.indexOf(quote, searchFrom)
    if (index < 0) break

    candidates.push(index)
    searchFrom = index + Math.max(quote.length, 1)
  }

  return candidates
}

/**
 * 计算候选位置与旧标注上下文的匹配分数。
 * @param fullText - 当前文章正文纯文本。
 * @param annotation - 待恢复的标注数据。
 * @param candidateStart - 候选起始偏移。
 * @returns 分数越高表示越可信。
 */
function scoreCandidate(fullText: string, annotation: ArticleAnnotation, candidateStart: number): number {
  // candidateEnd 存储候选结束偏移。
  const candidateEnd = candidateStart + annotation.quote.length
  // beforeText 存储候选前方上下文窗口。
  const beforeText = fullText.slice(Math.max(0, candidateStart - CONTEXT_LENGTH), candidateStart)
  // afterText 存储候选后方上下文窗口。
  const afterText = fullText.slice(candidateEnd, candidateEnd + CONTEXT_LENGTH)
  // score 存储候选位置累计分数。
  let score = 0

  if (annotation.prefix && beforeText.endsWith(annotation.prefix.slice(-CONTEXT_LENGTH))) {
    score += 4
  } else if (annotation.prefix && beforeText.includes(annotation.prefix.slice(-Math.min(20, annotation.prefix.length)))) {
    score += 2
  }

  if (annotation.suffix && afterText.startsWith(annotation.suffix.slice(0, CONTEXT_LENGTH))) {
    score += 4
  } else if (annotation.suffix && afterText.includes(annotation.suffix.slice(0, Math.min(20, annotation.suffix.length)))) {
    score += 2
  }

  // distance 存储候选位置与旧偏移的距离，距离近时给少量稳定性加分。
  const distance = Math.abs(candidateStart - annotation.startOffset)
  score += Math.max(0, 1 - distance / Math.max(fullText.length, 1))

  return score
}

/**
 * 在当前文章纯文本中恢复标注位置。
 * @param fullText - 当前文章正文纯文本。
 * @param annotation - 待恢复的标注数据。
 * @returns 恢复后的范围；无法确定时返回 null。
 */
export function resolveAnnotationPosition(
  fullText: string,
  annotation: ArticleAnnotation
): AnnotationPosition | null {
  // candidates 存储 quote 在当前全文中的所有候选位置。
  const candidates = findQuoteCandidates(fullText, annotation.quote)
  if (candidates.length === 0) return null

  // exactText 存储旧偏移在当前全文中对应的文本。
  const exactText = fullText.slice(annotation.startOffset, annotation.endOffset)
  if (exactText === annotation.quote && candidates.length === 1) {
    return {
      startOffset: annotation.startOffset,
      endOffset: annotation.endOffset,
    }
  }

  if (candidates.length === 1) {
    return {
      startOffset: candidates[0],
      endOffset: candidates[0] + annotation.quote.length,
    }
  }

  // scoredCandidates 存储带上下文匹配分数的候选位置。
  const scoredCandidates = candidates
    .map((candidateStart) => ({
      candidateStart,
      score: scoreCandidate(fullText, annotation, candidateStart),
    }))
    .sort((left, right) => right.score - left.score)
  // bestCandidate 存储最高分候选。
  const bestCandidate = scoredCandidates[0]
  // secondCandidate 存储第二高分候选，用于判断是否足够可区分。
  const secondCandidate = scoredCandidates[1]

  // 多个重复 quote 且上下文都不命中时，宁可不渲染，避免错误标注到相似段落。
  if (!bestCandidate || bestCandidate.score < 2 || (secondCandidate && bestCandidate.score === secondCandidate.score)) {
    return null
  }

  return {
    startOffset: bestCandidate.candidateStart,
    endOffset: bestCandidate.candidateStart + annotation.quote.length,
  }
}

/**
 * 清除当前正文中已有的标注高亮包裹。
 * @param root - Markdown 正文根容器。
 * @returns {void}
 */
export function clearAnnotationHighlights(root: HTMLElement): void {
  // highlights 存储当前正文中所有已渲染的标注节点。
  const highlights = Array.from(root.querySelectorAll<HTMLElement>('.annotation-highlight'))
  for (const highlight of highlights) {
    // dot 存储评论提示点，清理高亮时应直接移除，避免变成正文字符。
    const dot = highlight.querySelector('.annotation-comment-dot')
    dot?.remove()
    // parent 存储高亮节点的父元素。
    const parent = highlight.parentNode
    if (!parent) continue

    while (highlight.firstChild) {
      parent.insertBefore(highlight.firstChild, highlight)
    }
    parent.removeChild(highlight)
    parent.normalize()
  }
}

/**
 * 创建标注高亮元素。
 * @param annotation - 标注数据。
 * @param onClick - 点击标注时的回调。
 * @param withCommentDot - 是否在该片段末尾追加评论提示点。
 * @returns 标注高亮元素。
 */
function createHighlightWrapper(
  annotation: ArticleAnnotation,
  onClick: (annotation: ArticleAnnotation) => void,
  withCommentDot: boolean
): HTMLElement {
  // wrapper 存储标注高亮外层元素。
  const wrapper = document.createElement('span')
  wrapper.className = `annotation-highlight annotation-highlight--${annotation.color || 'yellow'}`
  wrapper.dataset.annotationId = annotation.id
  wrapper.title = annotation.comment || '高亮标注'
  wrapper.setAttribute('role', 'button')
  wrapper.tabIndex = 0
  wrapper.addEventListener('click', (event) => {
    event.stopPropagation()
    onClick(annotation)
  })

  if (withCommentDot) {
    // dot 存储有评论标注的提示点。
    const dot = document.createElement('span')
    dot.className = 'annotation-comment-dot'
    dot.setAttribute('aria-hidden', 'true')
    wrapper.appendChild(dot)
  }

  return wrapper
}

/**
 * 用 span 包裹单个文本节点内的局部范围。
 * @param node - 需要包裹的 DOM 文本节点。
 * @param startOffset - 文本节点内起始偏移。
 * @param endOffset - 文本节点内结束偏移。
 * @param annotation - 标注数据。
 * @param onClick - 点击标注时的回调。
 * @param withCommentDot - 是否在该片段末尾追加评论提示点。
 * @returns 包裹后的高亮元素；失败时返回 null。
 */
function wrapTextNodePart(
  node: Text,
  startOffset: number,
  endOffset: number,
  annotation: ArticleAnnotation,
  onClick: (annotation: ArticleAnnotation) => void,
  withCommentDot: boolean
): HTMLElement | null {
  if (endOffset <= startOffset) return null

  try {
    // range 存储当前文本节点内可安全包裹的局部范围。
    const range = document.createRange()
    range.setStart(node, startOffset)
    range.setEnd(node, endOffset)
    // wrapper 存储本段文本的标注高亮元素。
    const wrapper = createHighlightWrapper(annotation, onClick, withCommentDot)
    range.surroundContents(wrapper)
    return wrapper
  } catch {
    // 单文本节点包裹理论上稳定；仍保留兜底，避免异常破坏整篇 Markdown DOM。
    return null
  }
}

/**
 * 分段包裹一条标注命中的所有文本节点。
 * @param slices - 当前 DOM 状态下的文本节点切片。
 * @param position - 标注恢复后的全文范围。
 * @param annotation - 标注数据。
 * @param onClick - 点击标注时的回调。
 * @returns 本条标注成功包裹的高亮元素列表。
 */
function wrapAnnotationPosition(
  slices: TextNodeSlice[],
  position: AnnotationPosition,
  annotation: ArticleAnnotation,
  onClick: (annotation: ArticleAnnotation) => void
): HTMLElement[] {
  // targetSlices 存储与标注范围有交集的文本节点切片。
  const targetSlices = slices.filter(
    (slice) => slice.endOffset > position.startOffset && slice.startOffset < position.endOffset
  )
  // wrappers 存储本条标注成功包裹的所有高亮片段。
  const wrappers: HTMLElement[] = []

  for (let index = targetSlices.length - 1; index >= 0; index -= 1) {
    // slice 存储当前要包裹的文本节点切片。
    const slice = targetSlices[index]
    // localStart 存储当前文本节点内的局部起始偏移。
    const localStart = Math.max(0, position.startOffset - slice.startOffset)
    // localEnd 存储当前文本节点内的局部结束偏移。
    const localEnd = Math.min(slice.endOffset, position.endOffset) - slice.startOffset
    // withCommentDot 存储评论提示点是否应该出现在视觉上的最后一个片段。
    const withCommentDot = Boolean(annotation.comment) && index === targetSlices.length - 1
    // wrapper 存储当前文本节点包裹出的高亮片段。
    const wrapper = wrapTextNodePart(slice.node, localStart, localEnd, annotation, onClick, withCommentDot)
    if (wrapper) wrappers.unshift(wrapper)
  }

  return wrappers
}

/**
 * 将标注列表渲染成正文高亮。
 * @param root - Markdown 正文根容器。
 * @param annotations - 当前文章标注列表。
 * @param onClick - 点击标注时的回调。
 * @returns 成功渲染的标注列表。
 */
export function applyAnnotationHighlights(
  root: HTMLElement,
  annotations: ArticleAnnotation[],
  onClick: (annotation: ArticleAnnotation) => void
): ArticleAnnotation[] {
  clearAnnotationHighlights(root)

  // initialSlices 存储清理旧高亮后正文文本节点切片。
  const initialSlices = collectTextNodes(root)
  // fullText 存储当前文章正文纯文本。
  const fullText = getFullText(initialSlices)
  // renderableAnnotations 存储能定位到当前文章的标注及其恢复后位置。
  const renderableAnnotations: RenderableAnnotation[] = []

  for (const annotation of annotations) {
    // position 存储该标注在当前全文中的恢复位置。
    const position = resolveAnnotationPosition(fullText, annotation)
    if (position) {
      renderableAnnotations.push({ annotation, position })
    }
  }

  // orderedAnnotations 存储按起始偏移倒序排列的待渲染标注，减少 DOM 切分对前方范围的影响。
  const orderedAnnotations = renderableAnnotations.sort(
    (left, right) => right.position.startOffset - left.position.startOffset
  )
  // renderedAnnotations 存储成功渲染到 DOM 的标注列表。
  const renderedAnnotations: ArticleAnnotation[] = []

  for (const item of orderedAnnotations) {
    // slices 存储当前 DOM 状态下的文本节点切片。
    const slices = collectTextNodes(root)
    // wrappers 存储本条标注分段包裹得到的高亮元素列表。
    const wrappers = wrapAnnotationPosition(slices, item.position, item.annotation, onClick)
    if (wrappers.length > 0) {
      renderedAnnotations.push(item.annotation)
    }
  }

  return renderedAnnotations.reverse()
}
