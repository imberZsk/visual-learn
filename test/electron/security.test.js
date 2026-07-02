import { describe, expect, test } from 'vitest';
import { buildCspPolicy } from '../../electron/security.js';

describe('buildCspPolicy', () => {
  /**
   * 验证开发环境 CSP 会跟随动态 Vite 端口，避免 HMR websocket 被拦截。
   */
  test('开发环境允许当前 rendererUrl 的 http 与 websocket 源', () => {
    // policy 存储开发环境 CSP 字符串。
    const policy = buildCspPolicy({ isDev: true, rendererUrl: 'http://127.0.0.1:5274' });

    expect(policy).toContain('http://127.0.0.1:5274');
    expect(policy).toContain('ws://127.0.0.1:5274');
  });

  /**
   * 验证生产环境 CSP 不放开 eval，减少桌面应用脚本注入面。
   */
  test('生产环境不允许 unsafe-eval', () => {
    // policy 存储生产环境 CSP 字符串。
    const policy = buildCspPolicy({ isDev: false });

    expect(policy).not.toContain('unsafe-eval');
    expect(policy).toContain("default-src 'self'");
  });
});
