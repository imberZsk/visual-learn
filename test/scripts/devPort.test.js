import { describe, expect, test } from 'vitest';
import { buildDevServerUrl, buildElectronEnv, buildViteArgs, findAvailablePort } from '../../scripts/dev-port.mjs';

describe('Electron dev port helpers', () => {
  /**
   * 验证端口探测会从指定端口向后跳过已占用端口。
   */
  test('findAvailablePort 会跳过占用端口', async () => {
    // checkedPorts 存储测试过程中被探测的端口。
    const checkedPorts = [];
    // port 存储最终得到的可用端口。
    const port = await findAvailablePort({
      host: '127.0.0.1',
      startPort: 5273,
      isPortInUse: async (_host, candidatePort) => {
        checkedPorts.push(candidatePort);
        return candidatePort === 5273;
      },
    });

    expect(port).toBe(5274);
    expect(checkedPorts).toEqual([5273, 5274]);
  });

  /**
   * 验证 Vite 参数会注入 Electron 默认开发端口并移除旧端口参数。
   */
  test('buildViteArgs 注入选中的开发端口', () => {
    // args 存储传给 Vite CLI 的最终参数。
    const args = buildViteArgs(['--port', '3000', '--strictPort', '--open'], '127.0.0.1', 5274);

    expect(args).toEqual(['--open', '--host', '127.0.0.1', '--port', '5274', '--strictPort']);
  });

  /**
   * 验证 Electron 子进程环境会显式携带渲染进程地址。
   */
  test('buildElectronEnv 注入开发模式和渲染进程 URL', () => {
    // rendererUrl 存储 Vite dev server 地址。
    const rendererUrl = buildDevServerUrl('127.0.0.1', 5274);
    // env 存储传给 Electron 子进程的环境变量。
    const env = buildElectronEnv({ NODE_ENV: 'test', FOO: 'bar' }, rendererUrl);

    expect(env.NODE_ENV).toBe('development');
    expect(env.ELECTRON_RENDERER_URL).toBe(rendererUrl);
    expect(env.FOO).toBe('bar');
  });
});
