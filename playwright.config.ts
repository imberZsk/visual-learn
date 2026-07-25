import { defineConfig } from '@playwright/test'

/** 配置真实 Electron E2E 串行执行及失败诊断产物。 */
export default defineConfig({
  testDir: './e2e',
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  outputDir: 'test-results/e2e-artifacts',
  use: { screenshot: 'only-on-failure', trace: 'retain-on-failure' },
})
