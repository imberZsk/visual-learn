import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Vitest 配置：核心模块与 Electron IPC 使用 node 环境，后续 UI 组件可按需切到 happy-dom。
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['test/**/*.{test,spec}.{js,jsx,mjs,ts,tsx}'],
    testTimeout: 20000,
    coverage: {
      provider: 'v8',
      include: ['src/core/**/*.js', 'electron/**/*.js', 'scripts/**/*.mjs'],
      // exclude 排除并非源码的测试文件：scripts 下遗留的 *.test.mjs 会被 include 的 glob 命中，
      // 若不排除会被当成 0% 覆盖的源码，从而错误拉低整体覆盖率。
      exclude: ['**/*.test.mjs'],
      reporter: ['text', 'html'],
    },
    environmentMatchGlobs: [['test/ui/**', 'happy-dom']],
  },
})
