import net from 'node:net'
import { afterEach, describe, expect, test } from 'vitest'
import {
  buildDevServerUrl,
  findAvailablePort,
  isTcpPortInUse,
} from '../../scripts/dev-port.mjs'

describe('dev-port 真实网络与边界', () => {
  // servers 存储测试中开启的 TCP server，用于收尾统一关闭。
  const servers = []

  afterEach(async () => {
    // 关闭所有测试期间开启的 server，避免端口泄漏。
    await Promise.all(
      servers
        .splice(0)
        .map((server) => new Promise((resolve) => server.close(resolve)))
    )
  })

  /**
   * 验证 buildDevServerUrl 生成 http 地址。
   */
  test('buildDevServerUrl 拼出 http 地址', () => {
    expect(buildDevServerUrl('127.0.0.1', 5273)).toBe('http://127.0.0.1:5273')
  })

  /**
   * 验证监听中的端口会被判定为占用，未监听端口判定为空闲。
   */
  test('isTcpPortInUse 正确区分占用与空闲端口', async () => {
    // server 存储用于占用端口的临时 TCP server。
    const server = net.createServer()
    servers.push(server)
    // listenPort 存储 server 实际监听到的端口。
    const listenPort = await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve(server.address().port))
    })

    expect(await isTcpPortInUse('127.0.0.1', listenPort)).toBe(true)

    // 关闭后同一端口应变为空闲。
    await new Promise((resolve) => server.close(resolve))
    servers.splice(servers.indexOf(server), 1)
    expect(await isTcpPortInUse('127.0.0.1', listenPort)).toBe(false)
  })

  /**
   * 验证候选端口全部被占用时抛出错误。
   */
  test('findAvailablePort 端口耗尽时抛错', async () => {
    await expect(
      findAvailablePort({
        host: '127.0.0.1',
        startPort: 5273,
        maxTries: 3,
        // 所有候选端口都返回占用，触发耗尽分支。
        isPortInUse: async () => true,
      })
    ).rejects.toThrow('连续 3 个端口均被占用')
  })

  /**
   * 验证未注入 isPortInUse 时默认使用真实 TCP 探测，能找到空闲端口。
   */
  test('findAvailablePort 默认使用真实探测找到空闲端口', async () => {
    // port 存储探测到的空闲端口。
    const port = await findAvailablePort({ host: '127.0.0.1', startPort: 5273 })
    expect(port).toBeGreaterThanOrEqual(5273)
    expect(await isTcpPortInUse('127.0.0.1', port)).toBe(false)
  })
})
