import net from "node:net";

// DEFAULT_DEV_HOST 存储 Vite/Electron 开发服务器默认监听地址。
export const DEFAULT_DEV_HOST = "127.0.0.1";
// DEFAULT_DEV_PORT 存储 Electron/Vite 开发服务器默认起始端口。
export const DEFAULT_DEV_PORT = 5273;
// DEFAULT_MAX_TRIES 存储最多顺延探测的端口数量，避免极端情况下无限循环。
export const DEFAULT_MAX_TRIES = 100;
// CLI_VALUE_OPTIONS 存储后面带值的 Vite 参数名，用于重写 host/port 时跳过旧值。
const CLI_VALUE_OPTIONS = new Set(["--host", "--port"]);

// buildDevServerUrl 根据 host 与 port 生成开发服务器地址。
// host 参数存储开发服务器主机名；port 参数存储开发服务器端口。
export function buildDevServerUrl(host, port) {
  return `http://${host}:${port}`;
}

// isTcpPortInUse 检查指定端口是否已有进程监听。
// host 参数存储目标主机名；port 参数存储目标端口。
export async function isTcpPortInUse(host, port) {
  return new Promise((resolve) => {
    // settled 标记当前检测 Promise 是否已经返回结果，避免 connect/error 重复触发。
    let settled = false;
    // socket 存储用于探测端口连通性的 TCP 连接。
    const socket = net.createConnection({ host, port });

    // finish 统一关闭 socket 并返回检测结果。
    // result 参数存储端口是否处于占用状态。
    function finish(result) {
      if (settled) {
        return;
      }

      settled = true;
      socket.destroy();
      resolve(result);
    }

    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.setTimeout(500, () => finish(false));
  });
}

// findAvailablePort 从起始端口开始寻找第一个未被占用的端口。
// options 参数存储 host、startPort、maxTries 以及测试可注入的端口检测函数。
export async function findAvailablePort(options) {
  // host 存储本次端口探测使用的主机名。
  const host = options.host;
  // startPort 存储本次端口探测的起始端口。
  const startPort = options.startPort;
  // maxTries 存储本次端口探测最多尝试的次数。
  const maxTries = options.maxTries ?? DEFAULT_MAX_TRIES;
  // checkPortInUse 存储端口占用检测函数，测试中可替换为假实现。
  const checkPortInUse = options.isPortInUse ?? isTcpPortInUse;

  for (let offset = 0; offset < maxTries; offset += 1) {
    // port 存储当前候选端口。
    const port = startPort + offset;
    // portInUse 标记当前候选端口是否已被监听。
    const portInUse = await checkPortInUse(host, port);
    if (!portInUse) {
      return port;
    }
  }

  throw new Error(`从 ${startPort} 起连续 ${maxTries} 个端口均被占用，无法启动`);
}

// removeViteHostPortArgs 移除旧的 host/port/strictPort 参数，避免追加动态端口后发生冲突。
// args 参数存储原始 Vite CLI 参数。
function removeViteHostPortArgs(args) {
  // result 存储清理后的 Vite CLI 参数。
  const result = [];

  for (let index = 0; index < args.length; index += 1) {
    // arg 存储当前正在检查的命令行参数。
    const arg = args[index];
    if (CLI_VALUE_OPTIONS.has(arg)) {
      index += 1;
      continue;
    }
    if (arg === "--strictPort") {
      continue;
    }
    result.push(arg);
  }

  return result;
}

// buildViteArgs 构造传给 Vite CLI 的最终参数。
// args 参数存储用户原始参数；host 与 port 存储最终选中的监听地址。
export function buildViteArgs(args, host, port) {
  // cleanedArgs 存储移除旧 host/port 后的参数。
  const cleanedArgs = removeViteHostPortArgs(args);
  return [...cleanedArgs, "--host", host, "--port", String(port), "--strictPort"];
}

// buildElectronEnv 构造传给 Electron 子进程的环境变量。
// env 参数存储父进程环境变量；rendererUrl 存储 Vite dev server 地址。
export function buildElectronEnv(env, rendererUrl) {
  return {
    ...env,
    NODE_ENV: "development",
    ELECTRON_RENDERER_URL: rendererUrl,
  };
}
