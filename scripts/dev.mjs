import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import {
  buildDevServerUrl,
  buildElectronEnv,
  buildViteArgs,
  DEFAULT_DEV_HOST,
  DEFAULT_DEV_PORT,
  findAvailablePort,
  isTcpPortInUse,
} from "./dev-port.mjs";

/**
 * 启动子进程并继承当前终端输出。
 * @param {string} command - 要执行的命令。
 * @param {string[]} args - 命令参数列表。
 * @param {object} options - spawn 选项。
 * @returns {import('node:child_process').ChildProcess} 子进程实例。
 */
function startProcess(command, args, options = {}) {
  return spawn(command, args, {
    stdio: "inherit",
    ...options,
  });
}

/**
 * 等待 Vite dev server 端口开始监听。
 * @param {string} host - dev server 主机。
 * @param {number} port - dev server 端口。
 * @returns {Promise<void>} 端口可用后 resolve。
 */
async function waitForVite(host, port) {
  // maxAttempts 存储最多探测次数，避免启动失败时无限等待。
  const maxAttempts = 100;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    // portReady 标记当前端口是否已经开始监听。
    const portReady = await isTcpPortInUse(host, port);
    if (portReady) {
      return;
    }

    await new Promise((resolvePromise) => {
      setTimeout(resolvePromise, 150);
    });
  }

  throw new Error(`Vite dev server 未在 ${buildDevServerUrl(host, port)} 就绪`);
}

/**
 * 启动 Vite 开发服务器。
 * @param {string} host - dev server 主机。
 * @param {number} port - dev server 端口。
 * @returns {import('node:child_process').ChildProcess} Vite 子进程。
 */
export function startViteDev(host, port) {
  // viteCommand 存储跨平台 Vite 可执行文件名。
  const viteCommand = process.platform === "win32" ? "vite.cmd" : "vite";
  return startProcess(viteCommand, buildViteArgs([], host, port), {
    env: process.env,
  });
}

/**
 * 启动 Electron 开发进程。
 * @param {string} rendererUrl - Vite dev server 地址。
 * @returns {import('node:child_process').ChildProcess} Electron 子进程。
 */
export function startElectronDev(rendererUrl) {
  // electronCommand 存储跨平台 Electron 可执行文件名。
  const electronCommand = process.platform === "win32" ? "electron.cmd" : "electron";
  return startProcess(electronCommand, ["."], {
    env: buildElectronEnv(process.env, rendererUrl),
  });
}

/**
 * 执行 Electron + Vite 开发启动流程。
 * @returns {Promise<number>} Electron 退出码。
 */
export async function main() {
  // host 存储本次开发服务器使用的主机名。
  const host = process.env.VITE_HOST || DEFAULT_DEV_HOST;
  // startPort 存储动态端口探测起点。
  const startPort = Number(process.env.VITE_PORT || DEFAULT_DEV_PORT);
  // port 存储最终选中的可用端口。
  const port = await findAvailablePort({ host, startPort });
  // rendererUrl 存储传给 Electron 的渲染进程地址。
  const rendererUrl = buildDevServerUrl(host, port);

  if (port !== startPort) {
    console.log(`端口 ${startPort} 被占用，已顺延到 ${port}`);
  }
  console.log(`Electron renderer dev server will use ${rendererUrl}.`);

  // viteChild 存储 Vite 开发服务器子进程。
  const viteChild = startViteDev(host, port);
  try {
    await waitForVite(host, port);
    // electronChild 存储 Electron 桌面应用子进程。
    const electronChild = startElectronDev(rendererUrl);
    return await new Promise((resolvePromise, rejectPromise) => {
      electronChild.once("error", rejectPromise);
      electronChild.once("exit", (code, signal) => {
        // exitCode 存储 Electron 子进程退出码；被信号终止时按 1 处理。
        const exitCode = code ?? (signal ? 1 : 0);
        resolvePromise(exitCode);
      });
    });
  } finally {
    viteChild.kill("SIGTERM");
  }
}

// isDirectRun 标记当前模块是否作为 CLI 脚本直接执行。
const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main()
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
