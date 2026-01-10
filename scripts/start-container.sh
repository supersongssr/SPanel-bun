#!/bin/bash
# Podman 容器启动脚本 - spanel-bun
# 采用"宿主机处理静态，容器处理动态"模式

set -e

PROJECT_ROOT="/root/git/spanel-bun"
CONTAINER_NAME="spanel-bun"
IMAGE_NAME="localhost/spanel-bun:latest"

echo "🚀 启动 SPanel Bun 测试环境容器..."

# 检查容器是否已存在
if podman ps -a --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
    echo "⚠️  容器 ${CONTAINER_NAME} 已存在，停止并删除..."
    podman stop ${CONTAINER_NAME} 2>/dev/null || true
    podman rm ${CONTAINER_NAME} 2>/dev/null || true
fi

# 创建容器
echo "📦 创建容器 ${CONTAINER_NAME}..."
podman run -d \
    --name ${CONTAINER_NAME} \
    --restart unless-stopped \
    -p 3000:3000 \
    -v ${PROJECT_ROOT}:/app:z \
    -w /app \
    ${IMAGE_NAME} \
    bun run /app/backend/src/index.ts

# 等待容器启动
echo "⏳ 等待容器启动..."
sleep 3

# 检查容器状态
if podman ps --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
    echo "✅ 容器 ${CONTAINER_NAME} 启动成功！"
    echo ""
    echo "📊 容器信息:"
    podman ps --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    echo "🔧 常用命令:"
    echo "  查看日志: podman logs -f ${CONTAINER_NAME}"
    echo "  进入容器: podman exec -it ${CONTAINER_NAME} bash"
    echo "  重启容器: podman restart ${CONTAINER_NAME}"
    echo "  停止容器: podman stop ${CONTAINER_NAME}"
    echo ""
    echo "🌐 测试环境地址:"
    echo "  用户端: https://test-spanel-bun.freessr.bid/user/index.html"
    echo "  管理端: https://test-spanel-bun.freessr.bid/admin/index.html"
    echo "  API: https://test-spanel-bun.freessr.bid/api/"
else
    echo "❌ 容器启动失败！"
    echo "查看日志: podman logs ${CONTAINER_NAME}"
    exit 1
fi
