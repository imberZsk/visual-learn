import { exec } from 'node:child_process';
import { existsSync } from 'node:fs';

// VSCODE_CLI_PATHS 存储 GUI Electron 环境中常见的 VSCode CLI 绝对路径。
const VSCODE_CLI_PATHS = [
  '/usr/local/bin/code',
  '/opt/homebrew/bin/code',
  '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code',
  '/usr/bin/code',
];

/**
 * 构建 VSCode 打开命令。
 * @param {string} targetPath - 要打开的目录或文件路径。
 * @param {string} [template] - 可选命令模板，支持 {path} 占位符。
 * @returns {string} 可交给 shell 执行的命令字符串。
 */
export function buildVscodeCommand(targetPath, template = 'code {path}') {
  // quotedPath 存储带引号的目标路径，防止空格拆分命令。
  const quotedPath = JSON.stringify(targetPath);
  // commandTemplate 存储去除空白后的命令模板。
  const commandTemplate = String(template || 'code {path}').trim();
  // needsNewWindow 标记 code 命令是否需要注入新窗口参数。
  const needsNewWindow = /(^|\/|\\)code(\s|$)/.test(commandTemplate)
    && !/(^|\s)(-n|--new-window|-r|--reuse-window)(\s|$)/.test(commandTemplate);
  // injectedTemplate 存储补齐新窗口参数后的命令模板。
  const injectedTemplate = needsNewWindow
    ? commandTemplate.replace(/(^|\/|\\)code(\s|$)/, (matched) => `${matched.trimEnd()} -n `)
    : commandTemplate;

  return injectedTemplate.includes('{path}')
    ? injectedTemplate.replace('{path}', quotedPath)
    : `${injectedTemplate} ${quotedPath}`;
}

/**
 * 用 VSCode 打开目录或文件。
 * @param {string} targetPath - 要打开的目录或文件路径。
 * @param {{template?: string}} options - 可选配置，template 用于自定义命令。
 * @returns {Promise<{success: boolean, error?: string}>} 打开结果。
 */
export function openInVscode(targetPath, options = {}) {
  return new Promise((resolvePromise) => {
    // quotedPath 存储带引号的目标路径。
    const quotedPath = JSON.stringify(targetPath);
    exec(buildVscodeCommand(targetPath, options.template), (primaryError) => {
      if (!primaryError) {
        resolvePromise({ success: true });
        return;
      }

      // cliPath 存储第一个存在的 VSCode CLI 兜底路径。
      const cliPath = VSCODE_CLI_PATHS.find((candidatePath) => existsSync(candidatePath));
      if (cliPath) {
        exec(`${JSON.stringify(cliPath)} -n ${quotedPath}`, (fallbackError) => {
          if (!fallbackError) {
            resolvePromise({ success: true });
            return;
          }
          resolvePromise({ success: false, error: '未找到 VSCode，请确认已安装' });
        });
        return;
      }

      exec(`open -a "Visual Studio Code" ${quotedPath}`, (openError) => {
        resolvePromise(openError
          ? { success: false, error: '未找到 VSCode，请确认已安装' }
          : { success: true });
      });
    });
  });
}
