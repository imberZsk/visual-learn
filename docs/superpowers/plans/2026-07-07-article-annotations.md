# 文章高亮与评论标注 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在阅读页支持选中文本创建高亮或评论标注，并将标注持久化到 `~/.visualLearn/annotations.json`。

**Architecture:** 后端新增独立 `annotations` 核心模块，沿用现有 storage 注入模式读写 JSON。前端新增标注定位工具，用纯文本偏移、选中文本和上下文恢复文章修改后的标注位置，阅读页只负责交互、弹层和状态同步。

**Tech Stack:** React 18、TypeScript、antd 5、Electron IPC、Vitest、happy-dom。

## Global Constraints

- 与用户交流、代码注释、文档统一使用中文。
- 不修改 Markdown 原文，标注只写入 `~/.visualLearn/annotations.json`。
- 开发优先使用 antd 组件。
- 所有函数/方法、变量、复杂分支和 workaround 都需要中文注释。
- 容易阻塞的异步任务需要 loading 或清晰反馈。
- 新行为先写失败测试，再写实现。

---

### Task 1: 核心标注存储

**Files:**
- Create: `src/core/annotations.js`
- Modify: `test/core/storageConfigProgress.test.js`

**Interfaces:**
- Produces: `getAnnotations(filePath, options)`, `createAnnotation(payload, options)`, `updateAnnotation(payload, options)`, `deleteAnnotation(payload, options)`
- Consumes: `getStorageFilePath`, `readFirstValidJsonWithSource`, `writeJsonFile`

- [ ] **Step 1: Write the failing test**

在 `test/core/storageConfigProgress.test.js` 添加测试：

```js
import { getAnnotations, createAnnotation, updateAnnotation, deleteAnnotation } from '../../src/core/annotations.js';

test('annotations 支持创建、读取、更新和删除', async () => {
  const dataDir = await makeTempDir('annotations-data');
  try {
    const filePath = '/tmp/visual-learn-note.md';
    const created = await createAnnotation({
      filePath,
      quote: '重点内容',
      startOffset: 2,
      endOffset: 6,
      prefix: '这是',
      suffix: '之后',
      comment: '这里要复习',
      color: 'yellow',
      timestamp: 100,
    }, { baseDir: dataDir });

    expect(await getAnnotations(filePath, { baseDir: dataDir })).toEqual([created]);

    const updated = await updateAnnotation({
      filePath,
      id: created.id,
      comment: '已经理解',
      startOffset: 3,
      endOffset: 7,
      prefix: '新的前文',
      suffix: '新的后文',
      timestamp: 200,
    }, { baseDir: dataDir });

    expect(updated.comment).toBe('已经理解');
    expect(updated.updatedAt).toBe(200);
    expect(await getAnnotations(filePath, { baseDir: dataDir })).toEqual([updated]);

    await deleteAnnotation({ filePath, id: created.id }, { baseDir: dataDir });
    expect(await getAnnotations(filePath, { baseDir: dataDir })).toEqual([]);
  } finally {
    await removeTempDir(dataDir);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/core/storageConfigProgress.test.js`
Expected: FAIL with missing `src/core/annotations.js` export.

- [ ] **Step 3: Write minimal implementation**

Create `src/core/annotations.js` with JSON normalization, ID generation, CRUD functions, and Chinese comments matching repository rules.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- test/core/storageConfigProgress.test.js`
Expected: PASS.

### Task 2: 标注定位与恢复算法

**Files:**
- Create: `src/utils/annotations.ts`
- Create: `test/ui/annotationUtils.test.ts`

**Interfaces:**
- Produces: `collectTextNodes(root)`, `createAnnotationDraft(root, range, filePath, timestamp)`, `resolveAnnotationPosition(fullText, annotation)`, `applyAnnotationHighlights(root, annotations, onClick)`
- Consumes: DOM Range API and annotation objects from Task 1/API.

- [ ] **Step 1: Write failing tests**

测试四类恢复场景：原偏移仍准确、唯一 quote 恢复、重复 quote 用上下文恢复、上下文不匹配时返回 `null`。

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/ui/annotationUtils.test.ts`
Expected: FAIL with missing utility exports.

- [ ] **Step 3: Write minimal implementation**

实现文本节点扫描、选区偏移计算、上下文截取、候选评分与 DOM 包裹。跳过 `pre/code/button/input/textarea` 内文本。

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- test/ui/annotationUtils.test.ts`
Expected: PASS.

### Task 3: Electron IPC 与前端 API 桥接

**Files:**
- Modify: `electron/ipcChannels.js`
- Modify: `electron/ipcHandlers.js`
- Modify: `electron/preload.cjs`
- Modify: `src/api.ts`
- Modify: `src/global.d.ts`
- Modify: `test/electron/ipcHandlers.test.js`
- Modify: `test/ui/AntdReplacement.test.tsx`

**Interfaces:**
- Produces bridge methods: `getAnnotations`, `createAnnotation`, `updateAnnotation`, `deleteAnnotation`
- Consumes core methods from `src/core/annotations.js`

- [ ] **Step 1: Write failing IPC/API tests**

在 IPC 测试中调用创建、读取、更新、删除通道；在 UI API mock 中补齐四个新方法，保证页面测试能显式覆盖桥接形状。

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- test/electron/ipcHandlers.test.js test/ui/AntdReplacement.test.tsx`
Expected: FAIL with missing IPC constants or missing API methods.

- [ ] **Step 3: Implement bridge**

新增 IPC 常量、handler、preload 方法、`appApi` 方法和全局 TypeScript 类型。

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test -- test/electron/ipcHandlers.test.js test/ui/AntdReplacement.test.tsx`
Expected: PASS.

### Task 4: 阅读页标注交互

**Files:**
- Modify: `src/pages/NotesLibrary.tsx`
- Modify: `src/pages/NotesLibrary.css`
- Modify: `src/theme-dark.css`
- Modify: `test/ui/AntdReplacement.test.tsx`
- Modify: `test/ui/NotesLibraryLayout.test.ts`

**Interfaces:**
- Consumes: `appApi.getAnnotations`, `appApi.createAnnotation`, `appApi.updateAnnotation`, `appApi.deleteAnnotation`
- Consumes: utilities from `src/utils/annotations.ts`
- Produces: 选区浮层、评论 Modal、点击高亮编辑/删除

- [ ] **Step 1: Write failing UI/style tests**

添加测试确认阅读页会请求 `getAnnotations`，并检查 CSS 中存在 `.annotation-highlight`、`.annotation-toolbar`、`.annotation-comment-dot` 等关键类名。

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- test/ui/AntdReplacement.test.tsx test/ui/NotesLibraryLayout.test.ts`
Expected: FAIL because annotation API and styles are unused/missing.

- [ ] **Step 3: Implement UI**

在 `NotesLibrary.tsx` 中增加标注状态、加载逻辑、选区监听、浮层、评论 Modal、点击高亮编辑/删除。用 antd `Button`、`Tooltip`、`Modal`、`Input.TextArea` 承接交互。

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test -- test/ui/AntdReplacement.test.tsx test/ui/NotesLibraryLayout.test.ts`
Expected: PASS.

### Task 5: 全量验证

**Files:**
- No additional files.

**Interfaces:**
- Consumes all previous tasks.
- Produces verified feature.

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Review git diff**

Run: `git diff -- src/core/annotations.js src/utils/annotations.ts src/pages/NotesLibrary.tsx src/pages/NotesLibrary.css src/theme-dark.css electron/ipcChannels.js electron/ipcHandlers.js electron/preload.cjs src/api.ts src/global.d.ts test/core/storageConfigProgress.test.js test/electron/ipcHandlers.test.js test/ui/AntdReplacement.test.tsx test/ui/NotesLibraryLayout.test.ts test/ui/annotationUtils.test.ts docs/superpowers/specs/2026-07-07-article-annotations-design.md docs/superpowers/plans/2026-07-07-article-annotations.md`
Expected: Diff only contains annotation-related changes.
