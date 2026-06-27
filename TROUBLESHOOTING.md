# 🔧 故障排除指南

## 常见问题和解决方案

---

## 问题 1: `cargo: command not found`

### 症状
```bash
npm run tauri:dev
Error: failed to get cargo metadata: No such file or directory (os error 2)
```

### 原因
Rust 未安装或环境变量未生效

### 解决方案

#### 方案 A: 运行自动安装脚本
```bash
cd /Users/imber/Desktop/ai/visual-learn
./install-rust.sh
```

#### 方案 B: 手动安装 Rust
```bash
# 1. 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 2. 刷新环境变量
source $HOME/.cargo/env

# 3. 验证安装
cargo --version
rustc --version

# 4. 重新运行
npm run tauri:dev
```

#### 方案 C: 重启终端
如果刚安装完 Rust，可能需要重启终端窗口使环境变量生效。

---

## 问题 2: `Port 1420 is already in use`

### 症状
```bash
npm run dev
Error: Port 1420 is already in use
```

### 原因
端口 1420 被其他进程占用

### 解决方案

#### 方案 A: 清理端口
```bash
# 杀死占用端口的进程
lsof -ti:1420 | xargs kill -9

# 重新运行
npm run tauri:dev
```

#### 方案 B: 更改端口
编辑 `vite.config.ts`:
```typescript
export default defineConfig({
  server: {
    port: 1421, // 改为其他端口
  },
})
```

然后编辑 `src-tauri/tauri.conf.json`:
```json
{
  "build": {
    "devPath": "http://localhost:1421" // 同步修改
  }
}
```

---

## 问题 3: Rust 编译错误

### 症状
```bash
error: linking with `cc` failed
error: could not compile `visual-learn`
```

### 解决方案

#### 方案 A: 清理并重新编译
```bash
cd /Users/imber/Desktop/ai/visual-learn/src-tauri
cargo clean
cd ..
npm run tauri:dev
```

#### 方案 B: 检查 Xcode Command Line Tools
```bash
# 安装 Xcode Command Line Tools
xcode-select --install

# 验证安装
xcode-select -p
# 应该输出: /Library/Developer/CommandLineTools
```

#### 方案 C: 更新 Rust
```bash
rustup update
cargo --version
```

---

## 问题 4: npm 依赖问题

### 症状
```bash
Module not found: Can't resolve 'antd'
Module not found: Can't resolve 'zustand'
```

### 解决方案

#### 重新安装依赖
```bash
cd /Users/imber/Desktop/ai/visual-learn

# 删除旧的依赖
rm -rf node_modules package-lock.json

# 重新安装
npm install

# 验证关键依赖
npm list antd react zustand
```

---

## 问题 5: 首次编译时间过长

### 症状
编译 Rust 代码超过 15 分钟

### 这是正常的！

首次编译 Rust 项目需要下载和编译所有依赖，通常需要 **5-15 分钟**。

### 加速方法

#### 1. 使用国内镜像 (可选)
编辑 `~/.cargo/config`:
```toml
[source.crates-io]
replace-with = 'ustc'

[source.ustc]
registry = "https://mirrors.ustc.edu.cn/crates.io-index"
```

#### 2. 后续编译很快
首次编译后，再次运行只需 **2-5 秒**:
```bash
npm run tauri:dev
# Finished dev [unoptimized + debuginfo] target(s) in 2.3s
```

---

## 问题 6: 文件读取权限错误

### 症状
```bash
Error: Permission denied (os error 13)
Failed to read /Users/imber/Desktop/imber
```

### 解决方案

#### 检查 Tauri 权限配置
确认 `src-tauri/tauri.conf.json` 包含文件系统权限:
```json
{
  "tauri": {
    "allowlist": {
      "fs": {
        "all": true,
        "scope": [
          "$HOME/Desktop/imber/**",
          "$APPDATA/visual-learn/**"
        ]
      }
    }
  }
}
```

#### 给予应用文件访问权限
macOS 可能需要在 **系统偏好设置 > 安全性与隐私 > 文件和文件夹** 中授权。

---

## 问题 7: 应用窗口不显示

### 症状
编译成功但窗口没有打开

### 解决方案

#### 检查进程是否在运行
```bash
ps aux | grep visual-learn
```

#### 查看日志
```bash
# Tauri 会在终端输出日志
# 查看是否有错误信息
```

#### 重新编译
```bash
cd src-tauri
cargo clean
cd ..
npm run tauri:dev
```

---

## 问题 8: TypeScript 类型错误

### 症状
```bash
error TS2307: Cannot find module 'antd' or its corresponding type declarations
```

### 解决方案

#### 安装类型定义
```bash
npm install --save-dev @types/node
npm install --save-dev @types/react
npm install --save-dev @types/react-dom
```

#### 检查 tsconfig.json
确保配置正确:
```json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

---

## 问题 9: 热重载不工作

### 症状
修改代码后，应用没有自动刷新

### 解决方案

#### 前端热重载
前端修改应该自动刷新。如果不工作:
```bash
# 重启开发服务器
# Ctrl+C 停止
npm run tauri:dev
```

#### Rust 后端修改
Rust 代码修改需要手动重启:
```bash
# Ctrl+C 停止
npm run tauri:dev
# 会自动重新编译
```

---

## 问题 10: Markdown 文件读取失败

### 症状
```bash
Error: 学习记录不存在: ./data/daily/2026/06/2026-06-12.md
```

### 解决方案

#### 检查文件路径
```bash
cd /Users/imber/Desktop/ai/visual-learn
ls -la data/daily/2026/06/
```

#### 检查工作目录
Rust 代码中的相对路径基于应用的工作目录。确保:
1. 从项目根目录启动应用
2. `data/` 目录在项目根目录下

---

## 🆘 仍然无法解决?

### 1. 查看详细日志
```bash
# 启用详细日志
RUST_LOG=debug npm run tauri:dev
```

### 2. 检查系统要求
- macOS 10.15+
- Node.js 16+
- Rust 1.70+
- 至少 4GB RAM
- 至少 2GB 可用磁盘空间

### 3. 重新开始
```bash
cd /Users/imber/Desktop/ai/visual-learn

# 清理所有构建产物
rm -rf node_modules
rm -rf src-tauri/target
rm package-lock.json

# 重新安装
npm install
./install-rust.sh
```

### 4. 查看文档
- `START_HERE.md` - 快速开始
- `INSTALL_RUST.md` - Rust 安装指南
- `PROJECT_REPORT.md` - 完整项目报告

---

## 💡 预防性建议

### 定期更新
```bash
# 更新 Rust
rustup update

# 更新 npm 依赖
npm update
```

### 备份数据
```bash
# 备份学习记录
cp -r data/ data_backup_$(date +%Y%m%d)/
```

### 使用稳定版本
避免使用 beta 或 nightly 版本的工具链。

---

## 📊 诊断检查清单

运行此命令诊断环境:

```bash
echo "=== 环境诊断 ==="
echo "Node: $(node --version)"
echo "npm: $(npm --version)"
echo "Rust: $(rustc --version 2>&1 || echo '未安装')"
echo "Cargo: $(cargo --version 2>&1 || echo '未安装')"
echo "Xcode: $(xcode-select -p 2>&1 || echo '未安装')"
echo "端口 1420: $(lsof -ti:1420 2>&1 || echo '未占用')"
echo "项目依赖: $([ -d node_modules ] && echo '已安装' || echo '未安装')"
echo "数据目录: $([ -d data ] && echo '存在' || echo '不存在')"
```

---

**遇到其他问题? 查看 GitHub Issues 或联系技术支持。**
