# 宿主机开发模式说明书

## 🎯 迁移概述

从 **Podman 容器模式** 成功迁移到 **宿主机原生开发模式**。

### 迁移原因
- ✅ **提高开发效率**: 无需容器操作，直接在宿主机运行，启动速度快
- ✅ **简化环境认知**: Agent 的感知（文件系统）与执行（Shell 命令）完全统一
- ✅ **调试更便捷**: 直接使用宿主机工具进行调试和日志查看
- ✅ **性能更优异**: 无容器性能损耗，直接访问系统资源

## 🏗️ 新架构

### 运行环境对比

| 组件 | 容器模式 (旧) | 宿主机模式 (新) |
|------|--------------|----------------|
| Bun 后端 | Podman 容器内运行 | 宿主机直接运行 (`/root/.bun/bin/bun`) |
| Redis | Podman 容器 (端口映射) | 宿主机原生运行 (端口 6379) |
| Nginx | 宿主机运行 (无变化) | 宿主机运行 (无变化) |
| MySQL | 远程数据库 (无变化) | 远程数据库 (无变化) |

### 部署架构图

```
┌─────────────────────────────────────────────────────────────┐
│                     宿主机 (Host Machine)                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌──────────────┐      ┌───────────┐ │
│  │   Nginx      │──────│  Bun Backend │      │  Redis   │ │
│  │   (443/80)   │      │    (3000)    │──────│  (6379)  │ │
│  └──────────────┘      └──────────────┘      └───────────┘ │
│         │                                            │       │
│         │ 静态文件                                   │       │
│         ↓                                            │       │
│  ┌─────────────────────────────────────────────┐    │       │
│  │  /root/git/spanel-bun/frontend/dist/       │    │       │
│  └─────────────────────────────────────────────┘    │       │
│                                                      │       │
└──────────────────────────────────────────────────────┴────────┘
                            │
                            │ 远程连接
                            ↓
                  ┌──────────────────┐
                  │   MySQL          │
                  │ 103.214.22.166   │
                  │     :3306        │
                  └──────────────────┘
```

## 📋 环境配置详情

### 1. Bun 运行环境

**安装路径**: `/root/.bun/bin/bun`

**启动命令**:
```bash
# 开发模式 (热重载)
cd /root/git/spanel-bun/backend
bun run dev

# 生产模式
cd /root/git/spanel-bun/backend
bun run start

# 使用 PM2 管理
pm2 start backend/src/index.ts --name spanel-api
pm2 startup
pm2 save
```

**验证**:
```bash
# 检查进程
ps aux | grep "bun"

# 检查端口
netstat -tlnp | grep 3000

# 测试 API
curl http://localhost:3000/api/health
```

### 2. Redis 运行环境

**安装方式**: 系统包管理器 (`apt-get install redis-server`)

**启动命令**:
```bash
# 启动服务
sudo service redis-server start

# 停止服务
sudo service redis-server stop

# 重启服务
sudo service redis-server restart

# 开机自启
sudo systemctl enable redis-server
```

**验证**:
```bash
# 检查进程
ps aux | grep redis-server

# 检查端口
netstat -tlnp | grep 6379

# 测试连接
redis-cli ping  # 应该返回 PONG
```

**连接配置** (`backend/.env`):
```bash
REDIS_URL="redis://127.0.0.1:6379"
```

### 3. Nginx 配置

**配置文件**: `/etc/nginx/conf.d/test-spanel-bun.freessr.bid.conf`

**关键配置**:
```nginx
# API 反向代理到宿主机 Bun 后端
location /api/ {
    proxy_pass http://127.0.0.1:3000/api/;
    # ... 其他代理配置
}

# 静态文件直接指向构建目录
location /user/ {
    alias /root/git/spanel-bun/frontend/dist/src/pages/index/;
}

location /admin/ {
    alias /root/git/spanel-bun/frontend/dist/admin/;
}
```

**重载配置**:
```bash
# 测试配置
sudo nginx -t

# 重载配置
sudo nginx -s reload
```

## 🚀 快速开始

### 首次部署

1. **安装依赖**:
   ```bash
   # 安装 Redis
   sudo apt-get update
   sudo apt-get install -y redis-server
   sudo service redis-server start
   ```

2. **配置环境**:
   ```bash
   cd /root/git/spanel-bun/backend
   cp .env.example .env
   nano .env
   ```

   确保 Redis 连接地址为: `redis://127.0.0.1:6379`

3. **安装后端依赖**:
   ```bash
   cd /root/git/spanel-bun/backend
   bun install
   bun run prisma:generate
   ```

4. **构建前端**:
   ```bash
   cd /root/git/spanel-bun/frontend
   bun install
   bun run build:public
   ```

5. **设置权限**:
   ```bash
   sudo chown -R www-data:www-data /root/git/spanel-bun/frontend/dist
   sudo chmod -R 755 /root/git/spanel-bun/frontend/dist
   ```

6. **启动服务**:
   ```bash
   # 启动 Redis
   sudo service redis-server start

   # 启动后端
   cd /root/git/spanel-bun/backend
   bun run dev
   ```

### 日常开发

**后端开发**:
```bash
cd /root/git/spanel-bun/backend
bun run dev  # 热重载开发服务器
```

**前端开发**:
```bash
cd /root/git/spanel-bun/frontend
bun run dev  # Vite 开发服务器
```

**部署前端**:
```bash
cd /root/git/spanel-bun/frontend
bun run build:public
sudo chown -R www-data:www-data /root/git/spanel-bun/frontend/dist
sudo chmod -R 755 /root/git/spanel-bun/frontend/dist
sudo nginx -s reload
```

## 🔧 常用命令参考

### 后端管理

```bash
# 启动开发服务器
cd backend && bun run dev

# 启动生产服务器
cd backend && bun run start

# PM2 管理
pm2 start backend/src/index.ts --name spanel-api
pm2 list
pm2 logs spanel-api
pm2 restart spanel-api
pm2 stop spanel-api
pm2 delete spanel-api

# 查看日志
tail -f backend/logs/app.log
```

### 前端管理

```bash
# 开发模式
cd frontend && npm run dev

# 构建静态文件
cd frontend && bun run build:public

# 预览构建结果
cd frontend && npm run preview
```

### Redis 管理

```bash
# 启动/停止/重启
sudo service redis-server start
sudo service redis-server stop
sudo service redis-server restart

# 查看状态
sudo service redis-server status

# 连接测试
redis-cli ping
redis-cli info

# 清空缓存
redis-cli FLUSHALL
```

### 系统服务

```bash
# 查看 Bun 进程
ps aux | grep "bun"

# 查看端口占用
netstat -tlnp | grep 3000
netstat -tlnp | grep 6379

# 查看日志
sudo tail -f /var/log/nginx/test-spanel-bun-access.log
sudo tail -f /var/log/nginx/test-spanel-bun-error.log
```

## 📊 监控和健康检查

### 端点检查

```bash
# 健康检查
curl https://test-spanel-bun.freessr.bid/api/health

# API 根路径
curl https://test-spanel-bun.freessr.bid/api/

# Swagger 文档
curl https://test-spanel-bun.freessr.bid/api/swagger
```

### 服务状态

```bash
# 后端状态
curl http://localhost:3000/api/health

# Redis 状态
redis-cli info server

# Nginx 状态
sudo systemctl status nginx
```

## 🐛 故障排查

### 问题 1: 后端无法启动

**症状**: `bun run dev` 启动失败

**排查步骤**:
```bash
# 1. 检查端口占用
netstat -tlnp | grep 3000

# 2. 检查 Redis 连接
redis-cli ping

# 3. 检查数据库连接
bun run prisma:db pull

# 4. 查看详细日志
bun run dev --verbose
```

### 问题 2: Redis 连接失败

**症状**: `Error connecting to Redis`

**排查步骤**:
```bash
# 1. 检查 Redis 状态
sudo service redis-server status

# 2. 测试连接
redis-cli ping

# 3. 检查配置
cat backend/.env | grep REDIS_URL

# 4. 重启 Redis
sudo service redis-server restart
```

### 问题 3: 前端 404 错误

**症状**: 访问页面返回 404

**排查步骤**:
```bash
# 1. 检查构建文件
ls -la /root/git/spanel-bun/frontend/dist/

# 2. 检查权限
ls -ld /root/git/spanel-bun/frontend/dist/

# 3. 检查 Nginx 配置
sudo nginx -t

# 4. 查看 Nginx 错误日志
sudo tail -50 /var/log/nginx/test-spanel-bun-error.log

# 5. 重新构建
cd frontend && bun run build:public
```

### 问题 4: API 502 错误

**症状**: API 请求返回 502 Bad Gateway

**排查步骤**:
```bash
# 1. 检查后端进程
ps aux | grep "bun"

# 2. 检查后端端口
netstat -tlnp | grep 3000

# 3. 测试后端直接访问
curl http://localhost:3000/api/health

# 4. 重启后端
pm2 restart spanel-api
# 或
pkill -f "bun.*backend"
cd backend && bun run dev
```

## 📝 迁移检查清单

### 已完成项目

- [x] 停止并删除 Podman 容器 (redis, spanel-bun)
- [x] 在宿主机安装 Redis
- [x] 启动 Redis 服务并设置开机自启
- [x] 更新 `.env` 文件 Redis 连接地址为 `127.0.0.1:6379`
- [x] 更新 `.claude/CLAUDE.md` 文档
- [x] 更新 `.claude/TEST_ENV_WORKFLOW.md` 文档
- [x] 更新 `README.md` 部署说明
- [x] 更新 Nginx 配置注释
- [x] 验证后端在宿主机正常启动
- [x] 验证 Nginx 配置正确
- [x] 创建宿主机开发模式文档

### 验证步骤

```bash
# 1. 验证 Redis 运行
redis-cli ping  # 应该返回 PONG

# 2. 验证后端启动
cd /root/git/spanel-bun/backend
bun run dev  # 应该显示 "Server is running on http://localhost:3000"

# 3. 验证 Nginx 配置
sudo nginx -t  # 应该显示 "syntax is ok"

# 4. 验证端口监听
netstat -tlnp | grep -E "3000|6379"  # 应该看到两个端口都在监听

# 5. 验证 API 访问
curl http://localhost:3000/api/health  # 应该返回健康检查响应
```

## 🎉 迁移总结

### 关键变化

1. **不再使用 Podman 容器**: Bun 和 Redis 直接运行在宿主机
2. **简化启动流程**: 直接使用 `bun run dev` 启动后端
3. **统一开发环境**: Agent 和开发者使用相同的命令和工具
4. **提高开发效率**: 无需容器操作，启动速度更快

### 优势总结

- ✅ **开发效率提升**: 无容器层级，直接操作文件系统和进程
- ✅ **调试更简单**: 使用宿主机原生工具，日志查看更直接
- ✅ **性能更优**: 无容器性能损耗，资源利用更高效
- ✅ **环境一致**: 开发环境与生产环境架构一致
- ✅ **维护简化**: 减少容器管理复杂度，系统更简洁

### 访问地址

| 服务 | 地址 |
|------|------|
| 用户登录 | https://test-spanel-bun.freessr.bid/user/login.html |
| 用户仪表板 | https://test-spanel-bun.freessr.bid/user/index.html |
| 用户注册 | https://test-spanel-bun.freessr.bid/user/register.html |
| 管理后台 | https://test-spanel-bun.freessr.bid/admin/index.html |
| API 健康检查 | https://test-spanel-bun.freessr.bid/api/health |
| API 文档 | https://test-spanel-bun.freessr.bid/api/swagger |

---

**迁移完成时间**: 2026-01-14
**迁移状态**: ✅ 成功完成
**文档版本**: v1.0
