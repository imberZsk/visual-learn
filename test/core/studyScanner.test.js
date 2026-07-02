import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { makeTempDir, removeTempDir, writeTextFile } from '../helpers.js';
import { scanStudyNotes } from '../../src/core/studyScanner.js';

describe('scanStudyNotes', () => {
  /**
   * 验证新版 knowledge 结构下的 chapter.md 会被识别为文章，同级 lab 会作为打开代码目录。
   */
  test('识别 chapter.md 章节目录，并返回同级 lab 作为 demoPath', async () => {
    // root 存储测试学习目录根路径。
    const root = await makeTempDir('scanner-chapter');
    try {
      // chapterDir 存储一篇新结构文章所在目录。
      const chapterDir = join(root, 'AI编程', 'codex', '01-Codex是什么');
      // labDir 存储该文章配套代码目录。
      const labDir = join(chapterDir, 'lab');
      await mkdir(labDir, { recursive: true });
      await writeTextFile(join(chapterDir, 'chapter.md'), '# Codex 是什么\n');
      await writeTextFile(join(labDir, 'README.md'), '# lab\n');

      // categories 存储扫描得到的分类列表。
      const categories = await scanStudyNotes(root);
      // category 存储 AI 编程/codex 分类。
      const category = categories.find((item) => item.group === 'AI编程' && item.name === 'codex');
      // note 存储该分类下的第一篇文章。
      const note = category?.items[0];

      expect(category).toBeTruthy();
      expect(note?.name).toBe('01-Codex是什么.md');
      expect(note?.path).toBe(join(chapterDir, 'chapter.md'));
      expect(note?.demoPath).toBe(labDir);
    } finally {
      await removeTempDir(root);
    }
  });

  /**
   * 验证旧版小册结构会匹配三类 demo 目录命名，并跳过 README 等说明文档。
   */
  test('识别小册 markdown，并按精确名、-demo 后缀、章节编号匹配 demo 子目录', async () => {
    // root 存储测试学习目录根路径。
    const root = await makeTempDir('scanner-booklet');
    try {
      // subjectDir 存储小册和 demo 的共同父目录。
      const subjectDir = join(root, '后端', 'python');
      // bookletDir 存储小册目录。
      const bookletDir = join(subjectDir, 'python小册');
      // demoDir 存储 demo 根目录。
      const demoDir = join(subjectDir, 'python-demo');
      await writeTextFile(join(bookletDir, '01-环境配置.md'), '# 01\n');
      await writeTextFile(join(bookletDir, '02-语法基础.md'), '# 02\n');
      await writeTextFile(join(bookletDir, '03-异步任务.md'), '# 03\n');
      await writeTextFile(join(bookletDir, 'README.md'), '# 不展示\n');
      await mkdir(join(demoDir, '01-环境配置'), { recursive: true });
      await mkdir(join(demoDir, '02-语法基础-demo'), { recursive: true });
      await mkdir(join(demoDir, '03-async-jobs'), { recursive: true });

      // categories 存储扫描得到的分类列表。
      const categories = await scanStudyNotes(root);
      // category 存储后端/python 分类。
      const category = categories.find((item) => item.group === '后端' && item.name === 'python');
      // demoPaths 存储每篇文章名到 demoPath 的映射。
      const demoPaths = Object.fromEntries((category?.items || []).map((item) => [item.name, item.demoPath]));

      expect(category?.items.map((item) => item.name)).toEqual(['01-环境配置.md', '02-语法基础.md', '03-异步任务.md']);
      expect(demoPaths['01-环境配置.md']).toBe(join(demoDir, '01-环境配置'));
      expect(demoPaths['02-语法基础.md']).toBe(join(demoDir, '02-语法基础-demo'));
      expect(demoPaths['03-异步任务.md']).toBe(join(demoDir, '03-async-jobs'));
    } finally {
      await removeTempDir(root);
    }
  });

  /**
   * 验证没有 chapter.md 约定时，普通 Markdown 会按目录层级兜底归类。
   */
  test('递归展示普通 Markdown，并按前两层目录生成 group 与 category', async () => {
    // root 存储测试学习目录根路径。
    const root = await makeTempDir('scanner-plain');
    try {
      // guideDir 存储普通 Markdown 所在目录。
      const guideDir = join(root, '指南', '入门');
      await writeTextFile(join(guideDir, '快速开始.md'), '# 快速开始\n');

      // categories 存储扫描得到的分类列表。
      const categories = await scanStudyNotes(root);
      // category 存储指南/入门分类。
      const category = categories.find((item) => item.group === '指南' && item.name === '入门');

      expect(category?.items).toHaveLength(1);
      expect(category?.items[0].name).toBe('快速开始.md');
      expect(category?.items[0].demoPath).toBe(guideDir);
    } finally {
      await removeTempDir(root);
    }
  });
});
