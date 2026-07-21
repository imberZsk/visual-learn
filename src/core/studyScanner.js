import { readdir, stat } from 'node:fs/promises';
import { basename, dirname, extname, join, relative } from 'node:path';

/**
 * 判断目录名是否是小册目录。
 * @param {string} name - 目录名。
 * @returns {boolean} 以“小册”结尾时返回 true。
 */
function isBookletDir(name) {
  return name.endsWith('小册');
}

/**
 * 从小册目录名提取分类名。
 * @param {string} bookletName - 小册目录名。
 * @returns {string} 去掉“小册”后缀后的分类名。
 */
function categoryFromBooklet(bookletName) {
  return bookletName.endsWith('小册') ? bookletName.slice(0, -2) : bookletName;
}

/**
 * 判断目录是否应从文章扫描中跳过。
 * @param {string} name - 目录名。
 * @returns {boolean} 应跳过时返回 true。
 */
function shouldSkipDir(name) {
  // lowerName 存储小写目录名，用于大小写不敏感匹配。
  const lowerName = name.toLowerCase();
  return name.startsWith('.')
    || lowerName === 'lab'
    || lowerName === 'labs'
    || lowerName === 'demo'
    || lowerName === 'demos'
    || lowerName === 'assets'
    || lowerName === 'asset'
    || lowerName === 'raw'
    || lowerName === 'node_modules'
    || lowerName === 'target'
    || lowerName === 'dist'
    || lowerName === 'build'
    || lowerName.includes('demo');
}

/**
 * 判断 Markdown 文件是否应作为文章展示。
 * @param {string} filePath - Markdown 文件路径。
 * @returns {boolean} 应展示时返回 true。
 */
function isDisplayableMarkdown(filePath) {
  if (extname(filePath) !== '.md') {
    return false;
  }

  // fileName 存储文件名，用于排除工具文档和说明文档。
  const fileName = basename(filePath).toUpperCase();
  return fileName !== 'README.MD'
    && fileName !== 'AGENTS.MD'
    && fileName !== 'CLAUDE.MD'
    && fileName !== 'GEMINI.MD'
    && fileName !== 'SKILL.MD';
}

/**
 * 安全读取目录条目，失败时返回空数组。
 * @param {string} dirPath - 需要读取的目录路径。
 * @returns {Promise<import('node:fs').Dirent[]>} 目录条目列表。
 */
async function readDirEntries(dirPath) {
  try {
    return await readdir(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }
}

/**
 * 从文件元数据构造学习单元。
 * @param {string} filePath - Markdown 文件路径。
 * @param {string} name - 前端展示名称。
 * @param {string} category - 所属分类名称。
 * @param {string|null} demoPath - 对应代码目录路径。
 * @returns {Promise<object|null>} 学习单元数据。
 */
async function buildStudyItem(filePath, name, category, demoPath) {
  try {
    // metadata 存储文件元数据。
    const metadata = await stat(filePath);
    return {
      path: filePath,
      name,
      category,
      demoPath,
      size: metadata.size,
      modified: Math.round(metadata.mtimeMs),
    };
  } catch {
    return null;
  }
}

/**
 * 在小册父目录下查找 demo 目录。
 * @param {string} parentDir - 小册目录的父目录。
 * @returns {Promise<string|null>} 命中的 demo 目录路径。
 */
async function findDemoDir(parentDir) {
  // entries 存储父目录下的文件系统条目。
  const entries = await readDirEntries(parentDir);
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    // name 存储当前目录名的小写形式。
    const name = entry.name.toLowerCase();
    if (name.includes('demo')) {
      return join(parentDir, entry.name);
    }
  }

  return null;
}

/**
 * 提取名称开头的章节编号。
 * @param {string} name - 文件名或目录名。
 * @returns {string|null} 开头编号；没有编号时返回 null。
 */
function leadingChapterNumber(name) {
  // matched 存储“数字 + 分隔符或结尾”的匹配结果。
  const matched = /^(\d+)(?:[-_ ]|$)/.exec(name);
  return matched ? matched[1] : null;
}

/**
 * 为小册文章解析对应 demo 子目录。
 * @param {string|null} demoDir - demo 根目录路径。
 * @param {string} itemStem - Markdown 去后缀后的名称。
 * @returns {Promise<string|null>} 命中的 demo 子目录路径。
 */
async function resolveDemoPath(demoDir, itemStem) {
  if (!demoDir) {
    return null;
  }

  // entries 存储 demo 根目录下的条目。
  const entries = await readDirEntries(demoDir);
  // subDirs 存储 demo 子目录名称与路径。
  const subDirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({ name: entry.name, path: join(demoDir, entry.name) }));

  // exactMatch 存储精确同名命中的 demo 子目录。
  const exactMatch = subDirs.find((entry) => entry.name === itemStem);
  if (exactMatch) {
    return exactMatch.path;
  }

  // suffixName 存储 “md 名称 + -demo” 的候选目录名。
  const suffixName = `${itemStem}-demo`;
  // suffixMatch 存储 -demo 后缀命中的子目录。
  const suffixMatch = subDirs.find((entry) => entry.name === suffixName);
  if (suffixMatch) {
    return suffixMatch.path;
  }

  // itemNumber 存储 Markdown 名称开头的章节编号。
  const itemNumber = leadingChapterNumber(itemStem);
  if (!itemNumber) {
    return null;
  }

  // numberMatches 存储与 Markdown 章节编号一致的 demo 子目录。
  const numberMatches = subDirs.filter((entry) => leadingChapterNumber(entry.name) === itemNumber);
  return numberMatches.length === 1 ? numberMatches[0].path : null;
}

/**
 * 从小册目录收集学习单元。
 * @param {string} bookletDir - 小册目录路径。
 * @param {string} category - 分类名称。
 * @param {string|null} demoDir - demo 根目录路径。
 * @param {object[]} items - 收集结果数组。
 * @returns {Promise<void>} 收集完成后 resolve。
 */
async function collectItemsFromBooklet(bookletDir, category, demoDir, items) {
  // entries 存储小册目录下的文件系统条目。
  const entries = await readDirEntries(bookletDir);
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    // filePath 存储当前 Markdown 文件路径。
    const filePath = join(bookletDir, entry.name);
    if (!isDisplayableMarkdown(filePath)) {
      continue;
    }

    // stem 存储去掉 .md 后缀后的文章名称。
    const stem = entry.name.slice(0, -extname(entry.name).length);
    // demoPath 存储该文章对应的 demo 子目录。
    const demoPath = await resolveDemoPath(demoDir, stem);
    // item 存储构造出的学习单元。
    const item = await buildStudyItem(filePath, entry.name, category, demoPath);
    if (item) {
      items.push(item);
    }
  }
}

/**
 * 获取路径相对学习根目录的目录层级。
 * @param {string} studyRoot - 学习目录根路径。
 * @param {string} targetPath - 目标路径。
 * @returns {string[]} 从根目录下一级开始的目录名列表。
 */
function relativeComponents(studyRoot, targetPath) {
  // relativePath 存储 targetPath 相对学习根目录的路径。
  const relativePath = relative(studyRoot, targetPath);
  if (!relativePath || relativePath.startsWith('..')) {
    return [];
  }

  return relativePath.split(/[\\/]/).filter(Boolean);
}

/**
 * 从章节目录名生成展示文件名。
 * @param {string} chapterDir - 包含 chapter.md 的章节目录路径。
 * @returns {string} 前端展示文件名。
 */
function displayNameFromChapterDir(chapterDir) {
  return `${basename(chapterDir)}.md`;
}

/**
 * 判断路径是否是目录。
 * @param {string} dirPath - 待检查路径。
 * @returns {Promise<boolean>} 是目录时返回 true。
 */
async function isDirectory(dirPath) {
  try {
    // metadata 存储文件系统元数据。
    const metadata = await stat(dirPath);
    return metadata.isDirectory();
  } catch {
    return false;
  }
}

/**
 * 获取新版章节目录对应的打开代码路径。
 * @param {string} chapterDir - 包含 chapter.md 的章节目录路径。
 * @returns {Promise<string>} lab 存在时返回 lab，否则返回章节目录。
 */
async function resolveChapterOpenPath(chapterDir) {
  // labDir 存储新结构章节配套代码目录。
  const labDir = join(chapterDir, 'lab');
  return (await isDirectory(labDir)) ? labDir : chapterDir;
}

/**
 * 根据章节目录层级推断 group 与 category。
 * @param {string[]} components - 章节目录相对学习根目录的层级。
 * @returns {{group: string, category: string}|null} 分组与分类。
 */
function groupAndCategoryFromComponents(components) {
  if (components.length === 0) {
    return null;
  }

  // group 存储前端第一层归类。
  const group = components[0];
  // category 存储前端第二层分类；两层课程结构下用顶层名聚合。
  const category = components.length >= 3 ? components[1] : group;
  return { group, category };
}

/**
 * 根据普通 Markdown 所在目录层级推断 group 与 category。
 * @param {string[]} components - 普通 Markdown 所在目录相对学习根目录的层级。
 * @returns {{group: string, category: string}|null} 分组与分类。
 */
function groupAndCategoryFromPlainComponents(components) {
  if (components.length === 0) {
    return null;
  }

  // group 存储前端第一层归类。
  const group = components[0];
  // category 存储普通 Markdown 所在目录分类。
  const category = components[1] || '其他';
  return { group, category };
}

/**
 * 把学习单元插入分类映射。
 * @param {Map<string, object>} categoryMap - 分类 key 到分类数据的映射。
 * @param {string} group - 顶层分组名称。
 * @param {string} category - 分类名称。
 * @param {object} item - 学习单元。
 * @returns {void}
 */
function pushItemToCategory(categoryMap, group, category, item) {
  // key 存储分类唯一键。
  const key = `${group}\u0000${category}`;
  if (!categoryMap.has(key)) {
    categoryMap.set(key, { name: category, group, items: [] });
  }

  categoryMap.get(key).items.push(item);
}

/**
 * 递归扫描新版目录结构中的 chapter.md 与普通 Markdown。
 * @param {string} dir - 当前扫描目录。
 * @param {string} studyRoot - 学习根目录。
 * @param {Map<string, object>} categoryMap - 分类结果映射。
 * @returns {Promise<void>} 扫描完成后 resolve。
 */
async function scanMarkdownTree(dir, studyRoot, categoryMap) {
  // entries 存储当前目录下的条目。
  const entries = await readDirEntries(dir);
  // childDirs 存储需要递归扫描的子目录。
  const childDirs = [];
  // plainMarkdowns 存储当前目录下可展示的普通 Markdown。
  const plainMarkdowns = [];
  // chapterFile 存储当前目录的 chapter.md 文件路径。
  let chapterFile = null;

  for (const entry of entries) {
    // entryPath 存储当前条目的绝对路径。
    const entryPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!shouldSkipDir(entry.name)) {
        childDirs.push(entryPath);
      }
      continue;
    }

    if (!entry.isFile() || !isDisplayableMarkdown(entryPath)) {
      continue;
    }

    if (entry.name === 'chapter.md') {
      chapterFile = entryPath;
    } else {
      plainMarkdowns.push(entryPath);
    }
  }

  if (chapterFile) {
    // components 存储章节目录相对根目录的层级。
    const components = relativeComponents(studyRoot, dir);
    // groupCategory 存储推断出的分组和分类。
    const groupCategory = groupAndCategoryFromComponents(components);
    if (groupCategory) {
      // displayName 存储前端展示的文章名。
      const displayName = displayNameFromChapterDir(dir);
      // demoPath 存储章节对应的代码目录。
      const demoPath = await resolveChapterOpenPath(dir);
      // item 存储构造出的学习单元。
      const item = await buildStudyItem(chapterFile, displayName, groupCategory.category, demoPath);
      if (item) {
        pushItemToCategory(categoryMap, groupCategory.group, groupCategory.category, item);
      }
    }
  } else {
    for (const markdownPath of plainMarkdowns) {
      // parentDir 存储普通 Markdown 的所在目录。
      const parentDir = dirname(markdownPath);
      // components 存储普通文档目录相对根目录的层级。
      const components = relativeComponents(studyRoot, parentDir);
      // groupCategory 存储推断出的分组和分类。
      const groupCategory = groupAndCategoryFromPlainComponents(components);
      if (!groupCategory) {
        continue;
      }

      // item 存储构造出的学习单元。
      const item = await buildStudyItem(markdownPath, basename(markdownPath), groupCategory.category, parentDir);
      if (item) {
        pushItemToCategory(categoryMap, groupCategory.group, groupCategory.category, item);
      }
    }
  }

  for (const childDir of childDirs) {
    await scanMarkdownTree(childDir, studyRoot, categoryMap);
  }
}

/**
 * 递归查找旧版小册目录并收集学习单元。
 * @param {string} dir - 当前扫描目录。
 * @param {string} group - 当前顶层分组名称。
 * @param {object[]} categories - 收集结果数组。
 * @param {string} studyRoot - 学习根目录。
 * @returns {Promise<void>} 扫描完成后 resolve。
 */
async function scanForBooklets(dir, group, categories, studyRoot) {
  // entries 存储当前目录下的条目。
  const entries = await readDirEntries(dir);
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    if (shouldSkipDir(entry.name)) {
      continue;
    }

    // entryPath 存储当前目录的绝对路径。
    const entryPath = join(dir, entry.name);
    if (isBookletDir(entry.name)) {
      // category 存储小册对应的分类名。
      const category = categoryFromBooklet(entry.name);
      // demoDir 存储小册父目录下的 demo 根目录。
      const demoDir = await findDemoDir(dirname(entryPath));
      // items 存储小册下的学习单元。
      const items = [];
      await collectItemsFromBooklet(entryPath, category, demoDir, items);
      items.sort((left, right) => left.name.localeCompare(right.name));
      categories.push({ name: category, group, items });
      continue;
    }

    // nextGroup 存储递归进入下一层时使用的顶层分组。
    const nextGroup = dir === studyRoot ? entry.name : group;
    await scanForBooklets(entryPath, nextGroup, categories, studyRoot);
  }
}

/**
 * 合并新版 Markdown 树扫描结果和旧版小册扫描结果。
 * @param {object[]} categories - 旧版小册扫描结果。
 * @param {string} studyRoot - 学习根目录。
 * @returns {Promise<void>} 合并完成后 resolve。
 */
async function mergeMarkdownTreeCategories(categories, studyRoot) {
  // categoryMap 存储新版 Markdown 扫描结果。
  const categoryMap = new Map();
  await scanMarkdownTree(studyRoot, studyRoot, categoryMap);

  for (const markdownCategory of categoryMap.values()) {
    // existing 存储同 group、同 category 的旧版分类。
    const existing = categories.find((category) => category.group === markdownCategory.group && category.name === markdownCategory.name);
    if (existing) {
      // existingPaths 存储旧版扫描中已经收录的文章路径。
      const existingPaths = new Set(existing.items.map((item) => item.path));
      // newItems 存储去重后的新版文章。
      const newItems = markdownCategory.items.filter((item) => !existingPaths.has(item.path));
      existing.items.push(...newItems);
      existing.items.sort((left, right) => left.name.localeCompare(right.name));
    } else {
      markdownCategory.items.sort((left, right) => left.name.localeCompare(right.name));
      categories.push(markdownCategory);
    }
  }
}

/**
 * 扫描学习目录，返回按 group/category 组织的学习单元。
 * @param {string} studyRoot - 学习目录根路径。
 * @returns {Promise<object[]>} 分类列表。
 */
export async function scanStudyNotes(studyRoot) {
  if (!(await isDirectory(studyRoot))) {
    throw new Error(`学习目录不存在或不是目录: ${studyRoot}`);
  }

  // categories 存储最终返回的分类列表。
  const categories = [];
  await scanForBooklets(studyRoot, '', categories, studyRoot);
  await mergeMarkdownTreeCategories(categories, studyRoot);
  categories.sort((left, right) => left.name.localeCompare(right.name));
  return categories;
}
