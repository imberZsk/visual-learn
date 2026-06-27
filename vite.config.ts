import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // Vite 配置项，防止 Tauri 应用程序在开发环境中清除屏幕
  clearScreen: false,
  // Tauri 默认使用的端口
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // 告诉 vite 忽略监视 `src-tauri` 目录
      ignored: ["**/src-tauri/**"],
    },
  },
});
