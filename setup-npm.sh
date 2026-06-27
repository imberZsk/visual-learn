#!/bin/bash

# 快速安装 Rust 并启动应用
# 适合喜欢用 npm 命令的开发者

echo "============================================"
echo "  快速配置：让 npm run tauri:dev 工作"
echo "============================================"
echo ""

# 检查 Rust 是否已安装
if command -v cargo &> /dev/null; then
    echo "✅ Rust 已安装"
    cargo --version
    echo ""
    echo "现在可以直接运行："
    echo "  npm run tauri:dev"
    exit 0
fi

# 安装 Rust
echo "正在安装 Rust..."
echo "这将需要 5-10 分钟，请耐心等待"
echo ""

curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

# 刷新环境
source $HOME/.cargo/env

echo ""
echo "============================================"
echo "  ✅ 安装完成！"
echo "============================================"
echo ""
echo "现在可以使用 npm 命令了："
echo ""
echo "  cd /Users/imber/Desktop/ai/visual-learn"
echo "  npm run tauri:dev"
echo ""
echo "⚠️  重要："
echo "  如果命令找不到 cargo，请重启终端"
echo "  或执行: source \$HOME/.cargo/env"
echo ""
