// 声明 Vite 处理的全局 CSS 副作用导入，供 TypeScript 6 静态检查识别。
declare module '*.css'

// 声明 Vite 处理的 PNG 资源导入，供品牌图标在生产 file:// 环境中生成相对路径。
declare module '*.png' {
  // source 存储 Vite 构建后的资源 URL。
  const source: string
  export default source
}
