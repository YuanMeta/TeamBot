#!/bin/bash

# Docker Compose 启动脚本 (使用外部数据库)

set -e

echo "🚀 启动 Team Chat 应用 (使用外部数据库)..."
echo ""

# 生成随机密钥的函数
generate_secret() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# 检查 .env 文件是否存在
if [ ! -f .env ]; then
    echo "❌ 未找到 .env 文件"
    echo ""
    echo "使用外部数据库时，必须先配置 .env 文件并设置 DATABASE_URL。"
    echo ""
    echo "请按以下步骤操作："
    echo "1. 复制 env.template 为 .env"
    echo "2. 在 .env 文件中设置 DATABASE_URL，例如："
    echo "   DATABASE_URL=postgresql://username:password@host:5432/database"
    echo "3. 确保数据库已安装 pgvector 扩展"
    echo ""
    exit 1
fi

# 检查是否配置了 DATABASE_URL
if ! grep -q "^DATABASE_URL=" .env 2>/dev/null || [ -z "$(grep "^DATABASE_URL=" .env | cut -d= -f2-)" ]; then
    echo "❌ .env 文件中未找到 DATABASE_URL 或其值为空"
    echo ""
    echo "请在 .env 文件中配置 DATABASE_URL，例如："
    echo "DATABASE_URL=postgresql://username:password@host:5432/database"
    echo ""
    echo "注意事项："
    echo "- 确保数据库服务器可从 Docker 容器访问"
    echo "- 如果数据库在本机，请使用 host.docker.internal 而不是 localhost"
    echo "  例如: DATABASE_URL=postgresql://user:pass@host.docker.internal:5432/db"
    echo "- 确保数据库已安装 pgvector 扩展"
    echo ""
    exit 1
fi

# 检查并生成必要的密钥
SECRET_GENERATED=false

if ! grep -q "^JWT_SECRET=" .env 2>/dev/null || [ -z "$(grep "^JWT_SECRET=" .env | cut -d= -f2-)" ]; then
    echo "🔐 生成 JWT_SECRET..."
    JWT_SECRET=$(generate_secret)
    echo "" >> .env
    echo "# Auto-generated JWT Secret (Generated at $(date))" >> .env
    echo "JWT_SECRET=$JWT_SECRET" >> .env
    echo "✅ 已生成 JWT_SECRET"
    SECRET_GENERATED=true
fi

if ! grep -q "^COOKIE_SECRET=" .env 2>/dev/null || [ -z "$(grep "^COOKIE_SECRET=" .env | cut -d= -f2-)" ]; then
    echo "🔐 生成 COOKIE_SECRET..."
    COOKIE_SECRET=$(generate_secret)
    if [ "$SECRET_GENERATED" = false ]; then
        echo "" >> .env
    fi
    echo "COOKIE_SECRET=$COOKIE_SECRET" >> .env
    echo "✅ 已生成 COOKIE_SECRET"
    SECRET_GENERATED=true
fi

if [ "$SECRET_GENERATED" = true ]; then
    echo ""
fi

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker 未运行，请先启动 Docker"
    exit 1
fi

# 提取并显示数据库连接信息（隐藏密码）
DATABASE_URL=$(grep "^DATABASE_URL=" .env | cut -d= -f2-)
DB_INFO=$(echo "$DATABASE_URL" | sed -E 's/:([^@:]+)@/:****@/')
echo "📊 数据库连接: $DB_INFO"
echo ""

# 测试数据库连接（可选）
echo "🔍 测试数据库连接..."
DB_HOST=$(echo "$DATABASE_URL" | sed -E 's/.*@([^:]+).*/\1/')
DB_PORT=$(echo "$DATABASE_URL" | sed -E 's/.*:([0-9]+)\/.*/\1/')

# 简单的连接测试（如果 nc 可用）
if command -v nc > /dev/null 2>&1; then
    if nc -z -w5 "$DB_HOST" "$DB_PORT" 2>/dev/null; then
        echo "✅ 数据库服务器可访问"
    else
        echo "⚠️  警告: 无法连接到数据库服务器 $DB_HOST:$DB_PORT"
        echo "   请确保："
        echo "   - 数据库服务器正在运行"
        echo "   - 防火墙允许连接"
        echo "   - 如果数据库在本机，使用 host.docker.internal 而不是 localhost"
        echo ""
        read -p "是否继续启动应用？(y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
else
    echo "💡 提示: 安装 netcat (nc) 可以进行数据库连接测试"
fi

echo ""

# 启动服务
if [ "$1" = "--build" ] || [ "$1" = "-b" ]; then
    echo "📦 构建并启动应用容器..."
    docker compose -f docker-compose-standalone.yml up -d --build
else
    echo "📦 启动应用容器..."
    docker compose -f docker-compose-standalone.yml up -d
fi

echo ""
echo "⏳ 等待应用启动..."
sleep 5

# 检查服务状态
echo ""
echo "📊 服务状态："
docker compose -f docker-compose-standalone.yml ps

echo ""
echo "✅ 启动完成！"
echo ""
echo "📝 有用的命令："
echo "  查看日志:        docker compose -f docker-compose-standalone.yml logs -f"
echo "  查看应用日志:    docker compose -f docker-compose-standalone.yml logs -f app"
echo "  停止服务:        docker compose -f docker-compose-standalone.yml down"
echo "  重启服务:        docker compose -f docker-compose-standalone.yml restart"
echo "  重新构建启动:    ./scripts/docker-start-standalone.sh --build"
echo "  查看 PM2 状态:   docker compose -f docker-compose-standalone.yml exec app pm2 list"
echo "  进入容器:        docker compose -f docker-compose-standalone.yml exec app sh"
echo ""
echo "🌐 应用访问地址: http://localhost:${PORT:-3000}"
echo ""
echo "💡 提示："
echo "  - 如果应用启动失败，请检查数据库连接配置"
echo "  - 确保数据库已安装 pgvector 扩展"
echo "  - 使用 'docker compose -f docker-compose-standalone.yml logs -f app' 查看详细日志"
echo ""

