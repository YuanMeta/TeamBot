#!/bin/bash

# Docker Compose 停止脚本 (使用外部数据库)

set -e

echo "🛑 停止 Team Chat 应用..."
echo ""

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker 未运行"
    exit 1
fi

# 显示选项菜单
echo "请选择停止方式："
echo ""
echo "1) 停止容器（保留容器）"
echo "2) 停止并删除容器"
echo "3) 停止、删除容器并清理网络"
echo "4) 仅重启应用"
echo "5) 取消"
echo ""
read -p "请输入选项 (1-5): " -n 1 -r
echo
echo ""

case $REPLY in
    1)
        echo "📦 停止容器..."
        docker compose -f docker-compose-standalone.yml stop
        echo "✅ 容器已停止"
        ;;
    2)
        echo "📦 停止并删除容器..."
        docker compose -f docker-compose-standalone.yml down
        echo "✅ 容器已停止并删除"
        ;;
    3)
        echo "📦 停止并删除容器、网络..."
        docker compose -f docker-compose-standalone.yml down --remove-orphans
        echo "✅ 容器、网络已清理"
        ;;
    4)
        echo "🔄 重启应用..."
        docker compose -f docker-compose-standalone.yml restart app
        echo ""
        echo "⏳ 等待应用启动..."
        sleep 3
        echo ""
        echo "📊 服务状态："
        docker compose -f docker-compose-standalone.yml ps
        echo ""
        echo "✅ 应用已重启"
        ;;
    5)
        echo "❌ 已取消"
        exit 0
        ;;
    *)
        echo "❌ 无效选项"
        exit 1
        ;;
esac

echo ""
echo "📝 其他有用的命令："
echo "  启动服务:        ./scripts/docker-start-standalone.sh"
echo "  查看日志:        docker compose -f docker-compose-standalone.yml logs -f"
echo "  查看服务状态:    docker compose -f docker-compose-standalone.yml ps"
echo ""

