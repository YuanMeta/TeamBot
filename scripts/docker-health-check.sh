#!/bin/bash

# Docker 服务快速健康检查脚本

set -e

echo "🏥 快速健康检查..."
echo ""

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker 未运行"
    exit 1
fi

# 1. 检查容器状态
echo "📦 容器状态:"
docker compose ps

echo ""

# 2. 检查 PostgreSQL 连接
echo "🗄️  PostgreSQL 状态:"
docker compose exec -T postgres pg_isready -U postgres || echo "❌ PostgreSQL 未就绪"

echo ""

# 3. 检查 PM2 进程
echo "🔧 PM2 进程状态:"
docker compose exec -T app pm2 list

echo ""

# 4. 检查应用访问
PORT=${PORT:-3000}
echo "🌐 应用访问测试 (http://localhost:$PORT):"
curl -I http://localhost:$PORT 2>/dev/null || echo "❌ 应用无法访问"

echo ""
echo "✅ 检查完成"

