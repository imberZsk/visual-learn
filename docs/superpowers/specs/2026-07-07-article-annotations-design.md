# 文章高亮与评论标注设计

## 目标

在学习资料阅读页中，用户可以选中某篇 Markdown 文章的一段或多段正文，创建黄色高亮或带评论的标注。标注不写回 `.md` 文件，而是持久化到应用用户目录下的独立 JSON 文件，方便指出重点并在下次打开文章时恢复。

## 范围

- 支持在当前文章正文中选择文本后弹出操作浮层。
- 支持创建纯高亮、创建带评论高亮、查看评论、编辑评论、删除标注。
- 支持跨多个文本节点的连续选择，例如一个段落内多句话、跨段落的连续选择。
- 标注持久化到 `~/.visualLearn/annotations.json`，沿用现有 `src/core/storage.js` 的 `baseDir` 注入模式。
- 不修改用户的 Markdown 原文。
- 文章内容轻微修改后尽量恢复标注位置。

## 非目标

- 不支持多人同步、云端同步或导出。
- 不支持对图片区域进行框选标注。
- 不支持对 Markdown 源码位置进行逐字符双向编辑。
- 不新增第三方标注库。

## 推荐方案

采用“正文文本偏移 + 选中文本 + 前后文”的数据模型。

创建标注时，从 `.markdown-body` 可见文本中计算选择范围的纯文本 `startOffset` / `endOffset`，同时保存 `quote`、`prefix`、`suffix`。恢复时优先用偏移范围校验 `quote` 是否仍然一致；如果文章改动导致偏移失效，则用 `quote + prefix + suffix` 在新的正文文本中重新定位。重新定位成功后，将新的偏移用于本次渲染和下次保存。

这样做的好处是：Markdown 原文不会被污染；DOM 结构因 Markdown 渲染、代码高亮或列表变化发生小幅变动时，标注仍有机会恢复；同时实现复杂度可控。

## 数据结构

`annotations.json` 的顶层结构：

```json
{
  "entries": {
    "/absolute/path/to/note.md": [
      {
        "id": "annotation-1710000000000-ab12cd",
        "filePath": "/absolute/path/to/note.md",
        "quote": "被选中的文字",
        "startOffset": 120,
        "endOffset": 135,
        "prefix": "前文片段",
        "suffix": "后文片段",
        "comment": "我的评论",
        "color": "yellow",
        "createdAt": 1710000000000,
        "updatedAt": 1710000000000
      }
    ]
  }
}
```

字段含义：

- `id`：标注唯一 ID。
- `filePath`：文章绝对路径，作为文章维度的存储 key。
- `quote`：用户选择的原始文本。
- `startOffset` / `endOffset`：标注在当前文章纯文本中的起止偏移。
- `prefix` / `suffix`：选择文本前后最多 80 个字符的上下文，用于文章修改后的恢复。
- `comment`：评论内容；空字符串表示纯高亮。
- `color`：当前固定为 `yellow`，为以后多颜色预留。
- `createdAt` / `updatedAt`：创建和更新毫秒时间戳。

## 后端与 IPC

新增 `src/core/annotations.js`：

- `getAnnotations(filePath, options)`：读取指定文章的标注列表。
- `createAnnotation(payload, options)`：写入新标注。
- `updateAnnotation(payload, options)`：更新评论、颜色、恢复后的偏移与上下文。
- `deleteAnnotation(payload, options)`：删除指定文章的指定标注。

新增 IPC 通道：

- `visual-learn:get-annotations`
- `visual-learn:create-annotation`
- `visual-learn:update-annotation`
- `visual-learn:delete-annotation`

前端 `src/api.ts` 与 `src/global.d.ts` 同步暴露这些 API。

## 前端交互

阅读页加载文章时，并行加载文章内容与标注。Markdown 渲染完成后：

1. 扫描 `.markdown-body` 下可标注的文本节点。
2. 用标注恢复算法确认每条标注的新位置。
3. 将命中的文本范围包裹为 `.annotation-highlight`。
4. 点击高亮时打开编辑弹层，展示原文片段、评论输入、保存和删除按钮。

用户创建标注时：

1. 在正文内选中文本。
2. 页面计算选区偏移、选中文本和上下文。
3. 在选区附近显示浮层，提供“高亮”和“评论”两个按钮。
4. 点击“高亮”直接保存；点击“评论”打开评论输入弹层，保存后持久化。

为了避免干扰代码块复制和 Markdown 渲染，不对 `pre`、`code`、`button`、`input`、`textarea` 内文本创建标注。

## 文章修改后的恢复策略

恢复顺序：

1. 若 `startOffset/endOffset` 对应的新正文文本仍等于 `quote`，直接使用该位置。
2. 若偏移不一致，先在全文中查找所有 `quote`。
3. 如果只有一个候选，使用该候选。
4. 如果有多个候选，给每个候选计算上下文匹配分数：前文命中加分、后文命中加分、距离旧偏移更近加分。
5. 使用最高分候选；若所有候选都没有上下文命中，则保留数据但本次不渲染，避免错误高亮。

当恢复得到新偏移时，前端会调用 `updateAnnotation` 轻量保存新偏移和上下文，减少后续加载时的漂移。

## 错误处理

- 标注文件不存在或损坏时，返回空标注列表并在下次写入时重建。
- 保存失败时保留当前选择并用 antd message 提示“标注保存失败”。
- 文章未选中、选区为空、选区不在正文内时不显示浮层。
- 恢复失败的标注不删除，后续文章内容改回或算法优化后仍可恢复。

## 测试策略

- 核心存储测试：创建、读取、更新、删除标注；损坏数据标准化为空。
- 定位算法测试：偏移精确命中、偏移失效后通过唯一 quote 恢复、重复 quote 时通过上下文恢复、无法确定时不渲染。
- IPC 测试：注册并调用四个标注通道。
- UI 测试：阅读页加载标注 API，Markdown 区具备标注相关类名和交互入口的样式约束。

## 验收标准

- 选中文章正文后能创建高亮或评论标注。
- 重新打开同一文章后，高亮和评论能恢复。
- 点击已有高亮能查看、编辑评论或删除。
- 标注数据写入 `~/.visualLearn/annotations.json`，Markdown 原文不发生变化。
- 文章轻微修改后，标注能优先按上下文恢复；不能确定时不误标。
- `npm test` 与 `npm run build` 通过。
