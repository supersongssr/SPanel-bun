# SPanel 前端自动构建系统

## 🚀 快速开始

### 方式一：手动运行自动构建（推荐用于开发）

```bash
cd /root/git/spanel-bun/frontend
./auto-build.sh
```

### 方式二：使用 systemd 服务（推荐用于生产环境）

```bash
# 启用并启动服务
systemctl enable spanel-frontend-watch
systemctl start spanel-frontend-watch

# 查看状态
systemctl status spanel-frontend-watch

# 查看日志
journalctl -u spanel-frontend-watch -f

# 停止服务
systemctl stop spanel-frontend-watch

# 重启服务
systemctl restart spanel-frontend-watch
```

### 方式三：使用 npm scripts

```bash
# 方式 3a: 使用 nodemon (简单)
bun run watch

# 方式 3b: 使用 Vite watch 模式
bun run build:watch
```

## 📝 工作原理

1. **监听文件变化**: 监控 `src/` 目录下的所有 `.vue`, `.js`, `.ts` 文件
2. **自动构建**: 检测到变化时自动运行 `vite build`
3. **权限修复**: 自动设置 `www-data:www-data` 权限和 755 权限
4. **实时更新**: 更改代码后 1-2 秒内自动重新构建

## 🔧 配置说明

### 监控的文件类型
- Vue 组件: `*.vue`
- JavaScript 文件: `*.js`
- TypeScript 文件: `*.ts`

### 输出目录
- 构建输出: `dist/`
- 权限自动设置: `www-data:www-data 755`

## 📊 性能

- **首次构建**: ~8-10 秒
- **增量构建**: ~5-8 秒
- **文件检测**: < 1 秒（使用 inotify）

## ⚠️ 注意事项

1. **构建时间**: 每次修改都会触发完整构建，需要 5-10 秒
2. **并发**: 建议在开发时只运行一个自动构建实例
3. **调试**: 如需查看详细日志，使用 `journalctl -u spanel-frontend-watch -f`

## 🎯 使用场景

- ✅ **开发环境**: 修改代码后立即看到效果
- ✅ **调试**: 快速迭代修复问题
- ✅ **生产更新**: 无需手动构建，自动部署

## 🛠️ 故障排除

### 构建失败
```bash
# 查看详细错误日志
journalctl -u spanel-frontend-watch -n 50 --no-pager

# 手动测试构建
cd /root/git/spanel-bun/frontend
bun run build
```

### 服务未启动
```bash
# 检查服务状态
systemctl status spanel-frontend-watch

# 查看错误日志
journalctl -xe
```

### 文件监控不工作
```bash
# 检查 inotify-tools
which inotifywait

# 如果没有安装
apt install inotify-tools
```

## 📦 依赖

- `vite`: 构建工具
- `inotify-tools`: 文件监控（Linux）
- `bun`: 运行时环境
- `systemd`: 服务管理（可选）

## 🔄 更新日志

- **2025-01-14**: 创建自动构建系统
  - 支持 inotify 实时监控
  - 自动权限修复
  - systemd 服务集成
