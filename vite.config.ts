import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 开发端口：优先取脚本或环境变量注入的端口，缺省时回退到 Electron 默认端口 5273。
const devPort = Number(process.env.VITE_DEV_PORT || process.env.VITE_PORT) || 5273;

// https://vitejs.dev/config/
export default defineConfig({
  // Electron 生产模式通过 file:// 加载 dist，资源路径必须使用相对路径。
  base: "./",
  plugins: [react()],

  // Vite 配置项：保留终端输出，便于 Electron dev wrapper 观察启动状态。
  clearScreen: false,
  server: {
    // 监听端口由启动脚本统一探测后传入，保证 Electron 加载地址与 Vite 实际端口一致。
    port: devPort,
    // 仍保持严格端口：端口选择已在脚本层完成，此处若再被占用应直接暴露错误而非静默漂移。
    strictPort: true,
    watch: {
      // Electron 主进程文件由 Electron 自身重启处理，Vite 不需要监听。
      ignored: ["**/electron/**"],
    },
  },
  build: {
    // 桌面应用从本地磁盘加载资源，antd 生态 chunk 略大不影响网络首屏。
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        /**
         * 手动拆分第三方依赖，保持构建产物结构清晰。
         * @param id 模块路径。
         * @returns chunk 名称；返回 undefined 时交给 Rollup 默认处理。
         */
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (
            id.includes("/antd/") ||
            id.includes("/@ant-design/") ||
            id.includes("/rc-") ||
            id.includes("/@rc-component/") ||
            id.includes("/dayjs/")
          ) {
            return "antd";
          }
          if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("/scheduler/")) {
            return "react";
          }
          return "vendor";
        },
      },
    },
  },
});
