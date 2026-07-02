import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// __dirname 存储当前脚本所在目录。
const __dirname = dirname(fileURLToPath(import.meta.url));
// root 存储项目根目录。
const root = join(__dirname, '..');
// distIndex 存储生产构建入口文件路径。
const distIndex = join(root, 'dist', 'index.html');

if (!existsSync(distIndex)) {
  console.error('[verify-boot] 缺少 dist/index.html，请先运行 npm run build:ui');
  process.exit(2);
}

// electronBin 存储本地安装的 Electron 可执行文件路径。
const electronBin = join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'electron.cmd' : 'electron');
// child 存储 Electron 冒烟自检子进程。
const child = spawn(electronBin, ['.'], {
  cwd: root,
  env: {
    ...process.env,
    NODE_ENV: 'production',
    VL_SMOKE: '1',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
// output 存储 Electron 子进程输出，用于判断自检标记。
let output = '';

child.stdout.on('data', (chunk) => {
  // text 存储 stdout 本次输出文本。
  const text = chunk.toString();
  output += text;
  process.stdout.write(text);
});

child.stderr.on('data', (chunk) => {
  // text 存储 stderr 本次输出文本。
  const text = chunk.toString();
  output += text;
  process.stderr.write(text);
});

// timer 存储冒烟自检超时保护计时器。
const timer = setTimeout(() => {
  console.error('[verify-boot] 超时：30s 内未收到自检成功标记');
  child.kill('SIGKILL');
  process.exit(3);
}, 30000);

child.on('exit', (code) => {
  clearTimeout(timer);
  if (output.includes('SMOKE_OK')) {
    console.log('[verify-boot] Electron 启动自检通过');
    process.exit(0);
  }

  console.error(`[verify-boot] 启动自检未通过（exit=${code})`);
  process.exit(code || 1);
});
