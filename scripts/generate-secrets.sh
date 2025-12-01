#!/bin/bash

# 生成安全密钥脚本
# 用于为 Team Chat 应用生成 JWT_SECRET 和 COOKIE_SECRET

set -e

echo "🔐 生成安全密钥工具"
echo "===================="
echo ""

# 生成随机密钥的函数
generate_secret() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# 检查是否提供了参数
if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    echo "用法："
    echo "  ./generate-secrets.sh              # 生成并显示密钥"
    echo "  ./generate-secrets.sh --append     # 生成并追加到 .env 文件"
    echo "  ./generate-secrets.sh --replace    # 生成并替换 .env 中的现有密钥"
    echo ""
    exit 0
fi

# 生成密钥
JWT_SECRET=$(generate_secret)
COOKIE_SECRET=$(generate_secret)

echo "生成的密钥："
echo "-------------"
echo "JWT_SECRET=$JWT_SECRET"
echo "COOKIE_SECRET=$COOKIE_SECRET"
echo ""

# 根据参数决定操作
if [ "$1" == "--append" ]; then
    if [ ! -f .env ]; then
        echo "❌ 错误：.env 文件不存在"
        echo "💡 请先运行 'cp env.template .env' 创建 .env 文件"
        exit 1
    fi
    
    # 检查是否已存在
    if grep -q "^JWT_SECRET=" .env 2>/dev/null; then
        echo "⚠️  警告：.env 中已存在 JWT_SECRET，使用 --replace 来替换"
        exit 1
    fi
    
    if grep -q "^COOKIE_SECRET=" .env 2>/dev/null; then
        echo "⚠️  警告：.env 中已存在 COOKIE_SECRET，使用 --replace 来替换"
        exit 1
    fi
    
    echo "" >> .env
    echo "# Security Secrets (Generated at $(date))" >> .env
    echo "JWT_SECRET=$JWT_SECRET" >> .env
    echo "COOKIE_SECRET=$COOKIE_SECRET" >> .env
    
    echo "✅ 密钥已追加到 .env 文件"
    
elif [ "$1" == "--replace" ]; then
    if [ ! -f .env ]; then
        echo "❌ 错误：.env 文件不存在"
        echo "💡 请先运行 'cp env.template .env' 创建 .env 文件"
        exit 1
    fi
    
    # 备份原文件
    cp .env .env.backup
    echo "📋 已备份原 .env 文件到 .env.backup"
    
    # 替换或添加密钥
    if grep -q "^JWT_SECRET=" .env; then
        sed -i.tmp "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
        rm -f .env.tmp
        echo "🔄 已替换 JWT_SECRET"
    else
        echo "JWT_SECRET=$JWT_SECRET" >> .env
        echo "➕ 已添加 JWT_SECRET"
    fi
    
    if grep -q "^COOKIE_SECRET=" .env; then
        sed -i.tmp "s|^COOKIE_SECRET=.*|COOKIE_SECRET=$COOKIE_SECRET|" .env
        rm -f .env.tmp
        echo "🔄 已替换 COOKIE_SECRET"
    else
        echo "COOKIE_SECRET=$COOKIE_SECRET" >> .env
        echo "➕ 已添加 COOKIE_SECRET"
    fi
    
    echo "✅ 密钥已更新到 .env 文件"
    
else
    echo "💡 提示："
    echo "  - 复制上面的密钥到你的 .env 文件"
    echo "  - 或运行 './generate-secrets.sh --append' 自动追加到 .env"
    echo "  - 或运行 './generate-secrets.sh --replace' 替换现有密钥"
    echo "  - 运行 './generate-secrets.sh --help' 查看帮助"
fi

echo ""

