import assert from "node:assert/strict";
import test from "node:test";
import {
  buildElectronEnv,
  buildViteArgs,
  findAvailablePort,
} from "./dev-port.mjs";

test("findAvailablePort skips occupied ports from 5273 upward", async () => {
  // checkedPorts 存储测试过程中被探测过的端口。
  const checkedPorts = [];

  // port 存储从 5273 起跳过占用端口后得到的第一个可用端口。
  const port = await findAvailablePort({
    host: "127.0.0.1",
    startPort: 5273,
    isPortInUse: async (_host, candidatePort) => {
      checkedPorts.push(candidatePort);
      return candidatePort === 5273;
    },
  });

  assert.equal(port, 5274);
  assert.deepEqual(checkedPorts, [5273, 5274]);
});

test("buildViteArgs injects the selected dynamic port", () => {
  // args 存储传给 Vite CLI 的最终参数。
  const args = buildViteArgs(["--port", "3000", "--strictPort", "--open"], "127.0.0.1", 5274);

  assert.deepEqual(args, ["--open", "--host", "127.0.0.1", "--port", "5274", "--strictPort"]);
});

test("buildElectronEnv points Electron at the selected renderer URL", () => {
  // env 存储传给 Electron 子进程的环境变量。
  const env = buildElectronEnv({ NODE_ENV: "test", FOO: "bar" }, "http://127.0.0.1:5274");

  assert.equal(env.NODE_ENV, "development");
  assert.equal(env.ELECTRON_RENDERER_URL, "http://127.0.0.1:5274");
  assert.equal(env.FOO, "bar");
});
