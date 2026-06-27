#!/bin/bash

# 学习进度追踪应用 - Rust 自动安装脚本
# 用途: 一键安装 Rust 并启动应用

set -e  # 遇到错误立即退出

echo "============================================"
echo "  学习进度追踪应用 - Rust 安装脚本"
echo "============================================"
echo ""

# 检查操作系统
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ 此脚本仅支持 macOS"
    exit 1
fi

# 1. 检查 Rust 是否已安装
echo "📋 步骤 1/5: 检查 Rust 安装状态..."
if command -v cargo &> /dev/null; then
    CARGO_VERSION=$(cargo --version)
    echo "✅ Rust 已安装: $CARGO_VERSION"
    echo ""
else
    echo "⚠️  Rust 未安装，开始安装..."
    echo ""

    # 2. 安装 Rust
    echo "📦 步骤 2/5: 安装 Rust 工具链..."
    echo "这将需要 5-10 分钟，请耐心等待..."
    echo ""

    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

    # 刷新环境变量
    source $HOME/.cargo/env

    echo ""
    echo "✅ Rust 安装完成!"
    cargo --version
    rustc --version
    echo ""
fi

# 3. 检查 Xcode Command Line Tools
echo "📋 步骤 3/5: 检查 Xcode Command Line Tools..."
if xcode-select -p &> /dev/null; then
    echo "✅ Xcode Command Line Tools 已安装"
else
    echo "⚠️  Xcode Command Line Tools 未安装"
    echo "正在安装..."
    xcode-select --install
    echo "请在弹出窗口中完成安装，然后重新运行此脚本"
    exit 0
fi
echo ""

# 4. 检查 Node.js 和 npm
echo "📋 步骤 4/5: 检查 Node.js 环境..."
if command -v node &> /dev/null && command -v npm &> /dev/null; then
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    echo "✅ Node.js 已安装: $NODE_VERSION"
    echo "✅ npm 已安装: $NPM_VERSION"
else
    echo "❌ Node.js 或 npm 未安装"
    echo "请访问 https://nodejs.org/ 下载安装"
    exit 1
fi
echo ""

# 5. 检查项目依赖
echo "📋 步骤 5/5: 检查项目依赖..."
if [ ! -d "node_modules" ]; then
    echo "⚠️  npm 依赖未安装，正在安装..."
    npm install
    echo "✅ npm 依赖安装完成"
else
    echo "✅ npm 依赖已安装"
fi
echo ""

# 6. 清理可能占用的端口
echo "🧹 清理端口 1420..."
lsof -ti:1420 | xargs kill -9 2>/dev/null || true
echo "✅ 端口清理完成"
echo ""

# 7. 显示启动说明
echo "============================================"
echo "  ✅ 所有依赖已准备就绪！"
echo "============================================"
echo ""
echo "现在可以启动应用了:"
echo ""
echo "  npm run tauri:dev"
echo ""
echo "首次启动需要编译 Rust (5-10分钟)，"
echo "之后再启动只需几秒钟。"
echo ""
echo "⚠️  重要提示:"
echo "  1. 如果是首次安装 Rust，请重启终端"
echo "  2. 或者执行: source \$HOME/.cargo/env"
echo "  3. 然后运行: npm run tauri:dev"
echo ""

# 询问是否立即启动
read -p "是否立即启动应用? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🚀 正在启动应用..."
    echo "首次编译需要 5-10 分钟，请耐心等待..."
    echo ""

    # 刷新环境变量
    source $HOME/.cargo/env

    # 启动应用
    npm run tauri:dev
else
    echo ""
    echo "稍后运行以下命令启动应用:"
    echo "  cd $(pwd)"
    echo "  npm run tauri:dev"
    echo ""
fi
