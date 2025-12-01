#!/bin/bash

# Docker Compose 启动脚本

set -e

echo "🚀 启动 Team Chat 应用..."
echo ""

# 生成随机密钥的函数
generate_secret() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# 检查 .env 文件是否存在
if [ ! -f .env ]; then
    echo "⚠️  未找到 .env 文件"
    
    if [ -f .env.template ]; then
        echo "📋 正在从 .env.template 创建 .env 文件..."
        cp .env.template .env
        
        # 生成随机密钥
        echo "🔐 生成安全密钥..."
        JWT_SECRET=$(generate_secret)
        COOKIE_SECRET=$(generate_secret)
        
        # 添加到 .env 文件
        echo "" >> .env
        echo "# Auto-generated Security Secrets (Generated at $(date))" >> .env
        echo "JWT_SECRET=$JWT_SECRET" >> .env
        echo "COOKIE_SECRET=$COOKIE_SECRET" >> .env
        
        echo "✅ 已从 .env.template 创建 .env 文件"
        echo "🔑 已自动生成 JWT_SECRET 和 COOKIE_SECRET"
        echo ""
    else
        echo "❌ 未找到 .env.template 文件"
        echo "ℹ️  将使用 docker-compose.yml 中的默认配置"
        echo ""
    fi
else
    # 检查现有 .env 文件是否包含必要的密钥
    if ! grep -q "^JWT_SECRET=" .env 2>/dev/null; then
        echo "⚠️  .env 文件中未找到 JWT_SECRET，正在生成..."
        JWT_SECRET=$(generate_secret)
        echo "" >> .env
        echo "# Auto-generated JWT Secret (Generated at $(date))" >> .env
        echo "JWT_SECRET=$JWT_SECRET" >> .env
        echo "🔑 已生成 JWT_SECRET"
    fi
    
    if ! grep -q "^COOKIE_SECRET=" .env 2>/dev/null; then
        echo "⚠️  .env 文件中未找到 COOKIE_SECRET，正在生成..."
        COOKIE_SECRET=$(generate_secret)
        echo "COOKIE_SECRET=$COOKIE_SECRET" >> .env
        echo "🔑 已生成 COOKIE_SECRET"
    fi
fi

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker 未运行，请先启动 Docker"
    exit 1
fi

# 检查是否需要构建
if [ "$1" = "--build" ] || [ "$1" = "-b" ]; then
    echo "📦 构建并启动容器..."
    docker compose up -d --build
else
    echo "📦 启动容器..."
    docker compose up -d
fi

echo ""
echo "⏳ 等待服务启动..."
sleep 5

# 检查服务状态
echo ""
echo "📊 服务状态："
docker compose ps

echo ""
echo "✅ 启动完成！"
echo ""
echo "📝 有用的命令："
echo "  查看日志:        docker compose logs -f"
echo "  查看应用日志:    docker compose logs -f app"
echo "  查看数据库日志:  docker compose logs -f postgres"
echo "  停止服务:        docker compose down"
echo "  重启服务:        docker compose restart"
echo "  重新构建启动:    ./scripts/docker-start.sh --build"
echo "  查看 PM2 状态:   docker compose exec app pm2 list"
echo ""
echo "🌐 应用访问地址: http://localhost:${PORT:-3000}"
echo ""

