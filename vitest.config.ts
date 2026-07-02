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
      reporter: ['text', 'html'],
    },
    environmentMatchGlobs: [['test/ui/**', 'happy-dom']],
  },
})
