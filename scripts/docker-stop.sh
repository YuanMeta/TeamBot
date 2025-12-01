#!/bin/bash

# Docker Compose 停止脚本

set -e

echo "🛑 停止 Team Chat 应用..."
echo ""

# 询问是否删除数据卷
read -p "是否同时删除数据库数据？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "⚠️  警告：这将删除所有数据库数据！"
    read -p "确定要继续吗？(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker compose down -v
        echo "✅ 服务已停止，数据已删除"
    else
        echo "❌ 操作已取消"
    fi
else
    docker compose down
    echo "✅ 服务已停止，数据已保留"
fi

echo ""

