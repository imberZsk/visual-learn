/**
 * 把 http(s) renderer URL 转成 websocket 源。
 * @param {string} rendererUrl - Vite dev server 地址。
 * @returns {string} 对应的 websocket 源。
 */
function toWebsocketOrigin(rendererUrl) {
  // url 存储解析后的 renderer URL。
  const url = new URL(rendererUrl);
  // protocol 存储 websocket 协议。
  const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${url.host}`;
}

/**
 * 构建 Electron 渲染进程 Content-Security-Policy。
 * @param {{isDev: boolean, rendererUrl?: string}} options - CSP 构建选项。
 * @returns {string} CSP 字符串。
 */
export function buildCspPolicy(options) {
  if (options.isDev) {
    // rendererUrl 存储当前 Vite dev server 地址，动态端口时必须同步到 CSP。
    const rendererUrl = options.rendererUrl || 'http://127.0.0.1:5273';
    // websocketOrigin 存储 Vite HMR websocket 源。
    const websocketOrigin = toWebsocketOrigin(rendererUrl);
    return [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      `connect-src 'self' ${rendererUrl} ${websocketOrigin}`,
      "img-src 'self' data: file:",
      "font-src 'self' data:",
    ].join('; ');
  }

  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: file:",
    "font-src 'self' data:",
    "connect-src 'self'",
  ].join('; ');
}
