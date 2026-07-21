import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import {
  buildDevServerUrl,
  buildViteArgs,
  DEFAULT_DEV_HOST,
  DEFAULT_DEV_PORT,
  findAvailablePort,
} from "./dev-port.mjs";

// startVite 启动真实 Vite 进程，并继承当前终端输出。
// args 参数存储透传给 Vite CLI 的命令行参数。
export async function startVite(args) {
  // viteCommand 存储跨平台 Vite 可执行文件名。
  const viteCommand = process.platform === "win32" ? "vite.cmd" : "vite";
  // child 存储正在运行的 Vite 子进程。
  const child = spawn(viteCommand, args, {
    env: process.env,
    stdio: "inherit",
  });

  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      // exitCode 存储 Vite 子进程退出码；被信号终止时按 1 处理。
      const exitCode = code ?? (signal ? 1 : 0);
      resolve(exitCode);
    });
  });
}

// readCliOption 读取命令行参数中指定选项的值。
// args 参数存储命令行参数；name 参数存储选项名，如 --host。
function readCliOption(args, name) {
  // optionIndex 存储目标选项在参数数组中的位置。
  const optionIndex = args.indexOf(name);
  if (optionIndex === -1) {
    return "";
  }
  // optionValue 存储目标选项后面的参数值。
  const optionValue = args[optionIndex + 1];
  return optionValue && !optionValue.startsWith("--") ? optionValue : "";
}

// hasCliFlag 检查命令行参数中是否包含指定布尔开关。
// args 参数存储命令行参数；name 参数存储开关名，如 --strictPort。
function hasCliFlag(args, name) {
  return args.includes(name);
}

// main 执行 Vite dev 动态端口 wrapper 的命令行入口。
export async function main() {
  // rawArgs 存储透传给 Vite CLI 的原始命令行参数。
  const rawArgs = process.argv.slice(2);
  // cliHost 存储命令行显式指定的 host。
  const cliHost = readCliOption(rawArgs, "--host");
  // cliPort 存储命令行显式指定的 port。
  const cliPort = readCliOption(rawArgs, "--port");
  // host 存储本次脚本使用的开发服务器主机。
  const host = cliHost || process.env.VITE_HOST || DEFAULT_DEV_HOST;
  // rawPort 存储命令行或环境变量中的起始端口文本。
  const rawPort = cliPort || process.env.VITE_PORT || String(DEFAULT_DEV_PORT);
  // startPort 存储解析后的起始开发服务器端口。
  const startPort = Number(rawPort);
  // exactPort 标记调用方是否要求使用显式端口，Electron wrapper 需要保持加载 URL 与 Vite 端口一致。
  const exactPort = Boolean(cliPort) && hasCliFlag(rawArgs, "--strictPort");
  // port 存储最终要传给 Vite 的端口；直接运行时会从 5273 起向后寻找空闲端口。
  const port = exactPort
    ? startPort
    : await findAvailablePort({ host, startPort });

  if (port !== startPort) {
    console.log(`端口 ${startPort} 被占用，已顺延到 ${port}`);
  }

  console.log(`Vite dev server will use ${buildDevServerUrl(host, port)}.`);
  return startVite(buildViteArgs(rawArgs, host, port));
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
