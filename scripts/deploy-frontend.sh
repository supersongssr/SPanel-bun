#!/bin/bash

# SPanel 前端部署脚本
# 用途: 构建前端并复制到部署目录

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置
FRONTEND_DIR="/root/git/spanel-bun/frontend"
DEPLOY_DIR="/var/www/spannel"
BACKUP_DIR="/var/www/spannel-backup-$(date +%Y%m%d_%H%M%S)"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  SPanel 前端部署脚本${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 检查前端目录
if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}错误: 前端目录不存在: $FRONTEND_DIR${NC}"
    exit 1
fi

cd "$FRONTEND_DIR"

# 1. 安装依赖
echo -e "${YELLOW}[1/4] 检查依赖...${NC}"
if [ ! -d "node_modules" ]; then
    echo "正在安装依赖..."
    bun install
else
    echo "依赖已安装，跳过"
fi
echo ""

# 2. 构建前端
echo -e "${YELLOW}[2/4] 构建前端...${NC}"
bun run build
echo ""

# 3. 备份现有部署 (如果存在)
if [ -d "$DEPLOY_DIR" ]; then
    echo -e "${YELLOW}[3/4] 备份现有部署到: $BACKUP_DIR${NC}"
    mkdir -p "$BACKUP_DIR"
    cp -r "$DEPLOY_DIR"/* "$BACKUP_DIR/" 2>/dev/null || true
else
    echo -e "${YELLOW}[3/4] 创建部署目录: $DEPLOY_DIR${NC}"
    mkdir -p "$DEPLOY_DIR"
fi
echo ""

# 4. 部署新版本
echo -e "${YELLOW}[4/4] 部署到: $DEPLOY_DIR${NC}"
cp -r dist/* "$DEPLOY_DIR/"
chown -R www-data:www-data "$DEPLOY_DIR"
chmod -R 755 "$DEPLOY_DIR"
echo ""

# 完成
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  部署完成!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "部署目录: $DEPLOY_DIR"
echo "备份目录: $BACKUP_DIR"
echo ""
echo -e "${YELLOW}Nginx配置示例:${NC}"
cat << 'NGINX'

server {
    listen 80;
    server_name spanel.example.com;

    # API代理到后端
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 前端静态文件
    location / {
        root /var/www/spannel;
        try_files $uri $uri/ /index.html;
    }

    # Admin管理端
    location /admin {
        alias /var/www/spannel/admin;
        try_files $uri $uri/ /admin/index.html;
    }

    # User用户端
    location /user {
        alias /var/www/spannel/user;
        try_files $uri $uri/ /user/index.html;
    }
}
NGINX

echo ""
echo -e "${GREEN}✅ 所有步骤完成!${NC}"
