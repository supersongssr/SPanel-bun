# SPanel PHP → Bun 迁移路线图

## 🎯 总体目标

将 SPanel 从 PHP (Slim Framework) 迁移到 Bun + TypeScript (Elysia.js v0) 架构，实现：
- ⚡ 性能提升 3-4 倍
- 🔒 更强的类型安全
- 🚀 更好的开发体验
- 💰 更低的服务器成本

---

## 📊 项目状态

### 已完成 ✅
- [x] Bun 后端项目初始化
- [x] Elysia.js v0 框架搭建
- [x] Prisma ORM 配置
- [x] Vue 3 前端脚手架
- [x] Nginx 配置
- [x] Docker 容器化
- [x] 基础 API 结构
- [x] Swagger API 文档

### 进行中 🚧
- [ ] Prisma Schema 完善
- [ ] 用户认证模块
- [ ] 节点管理模块

### 待开始 📋
- [ ] 订阅服务模块
- [ ] 支付系统模块
- [ ] 流量统计模块
- [ ] 管理后台
- [ ] Telegram Bot 集成

---

## 🗺️ 迁移路线

### 第一阶段：核心基础 (Week 1-2)

#### 目标
建立迁移的基础设施，确保核心功能可用

#### 任务清单

##### 1. 数据库层 (2天)
```bash
where: backend/prisma/schema.prisma
why: 需要与旧项目数据结构兼容
how: 基于旧项目 SQL 结构完善 Prisma Schema
must:
  - 保持字段名一致性
  - 保留所有关系映射
  - 添加必要的索引
  - 支持软删除
```

**关键表**:
- ✅ User (基础完成，需补充字段)
- ✅ Node (基础完成，需补充字段)
- ⚠️ TrafficLog (需完善)
- ❌ InviteCode (待创建)
- ❌ Code (充值码，待创建)
- ❌ Coupon (待创建)
- ❌ Bought (待创建)
- ❌ Payback (待创建)
- ❌ Ticket (待创建)
- ❌ AliveIp (待创建)
- ❌ NodeOnlineLog (待创建)

**具体任务**:
- [ ] 补充 User 表缺失字段:
  - `port` (INT) - 分配端口
  - `passwd` (VARCHAR) - 明文密码 (调试用)
  - `reg_ip` (VARCHAR) - 注册 IP
  - `reg_date` (DATETIME) - 注册时间
  - `expire_in` (DATETIME) - 到期时间
  - `node_group` (INT) - 节点分组
  - `node_speedlimit` (BIGINT) - 速度限制
  - `plan_id` (VARCHAR) - 套餐 ID
  - `telegram_id` (VARCHAR) - Telegram ID

- [ ] 补充 Node 表缺失字段:
  - `node_heartbeat` (INT) - 心跳时间
  - `node_ip` (VARCHAR) - 节点 IP
  - `custom_method` (VARCHAR) - 自定义加密
  - `last_ping_time` (INT) - 最后 ping 时间

- [ ] 创建新表 (见上方列表)

- [ ] 运行数据库迁移:
  ```bash
  cd backend
  bun run prisma:generate
  bun run prisma:migrate
  ```

##### 2. 认证模块 (3天)
```bash
where: backend/src/controllers/auth.controller.ts
why: 用户登录注册是系统入口
how: 基于 Hono + JWT 实现 RESTful API
must:
  - 支持 email/username 登录
  - JWT Token 认证
  - 密码加密 (bcrypt)
  - 验证码支持 (可选)
  - 邀请码验证
```

**API 端点**:
```
POST   /api/auth/register          - 用户注册
POST   /api/auth/login             - 用户登录
POST   /api/auth/logout            - 用户登出
POST   /api/auth/refresh           - 刷新 Token
GET    /api/auth/me                - 获取当前用户信息
POST   /api/auth/forgot-password   - 忘记密码
POST   /api/auth/reset-password    - 重置密码
POST   /api/auth/verify-email      - 邮箱验证
```

**数据流**:
```
注册流程:
email/password + invite_code
  → 验证邀请码
  → 检查邮箱是否存在
  → 密码加密 (bcrypt)
  → 创建用户记录
  → 分配初始流量
  → 生成 JWT Token
  → 返回用户信息

登录流程:
email/password
  → 验证用户存在
  → 验证密码正确
  → 生成 JWT Token
  → 更新登录 IP 和时间
  → 返回 Token 和用户信息
```

**测试**:
```bash
# 测试注册
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123",
    "invite_code": "INVITE123"
  }'

# 测试登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

##### 3. 用户模块 (3天)
```bash
where: backend/src/controllers/user.controller.ts
why: 用户信息管理是核心功能
how: RESTful API + Prisma ORM
must:
  - 用户信息查询
  - 用户信息更新
  - 流量统计
  - 签到功能
  - 邀请码生成
```

**API 端点**:
```
GET    /api/user                    - 获取当前用户信息
PUT    /api/user                    - 更新用户信息
GET    /api/user/traffic            - 获取流量统计
POST   /api/user/checkin            - 签到
GET    /api/user/invite-codes       - 获取邀请码列表
POST   /api/user/invite-code        - 生成邀请码
GET    /api/user/orders             - 获取订单列表
GET    /api/user/tickets            - 获取工单列表
```

##### 4. 节点模块 (4天)
```bash
where: backend/src/controllers/node.controller.ts
why: 节点是 VPN 服务的核心
how: RESTful API + 节点状态监控
must:
  - 节点列表查询
  - 节点过滤 (等级/分组)
  - 节点状态更新
  - 心跳检测
```

**API 端点**:
```
GET    /api/nodes                   - 获取节点列表
GET    /api/nodes/:id               - 获取节点详情
PUT    /api/nodes/:id/status        - 更新节点状态 (管理端)
GET    /api/nodes/:id/online        - 获取在线用户数
POST   /api/nodes/:id/heartbeat     - 节点心跳上报
```

**节点过滤逻辑**:
```typescript
// 根据用户等级和分组过滤节点
const filterNodes = (nodes: Node[], user: User) => {
  return nodes.filter(node => {
    // 节点状态检查
    if (node.status !== 'available') return false;

    // 节点等级检查
    if (node.nodeClass > user.class) return false;

    // 节点分组检查
    if (node.nodeGroup !== 0 && node.nodeGroup !== user.nodeGroup) return false;

    return true;
  });
};
```

##### 5. 基础中间件 (1天)
```bash
where: backend/src/middleware/
why: 统一处理认证、错误、日志等
how: Hono 中间件机制
must:
  - JWT 认证中间件
  - 错误处理中间件
  - 日志中间件
  - CORS 中间件
  - 频率限制中间件
```

---

### 第二阶段：核心功能 (Week 3-4)

#### 1. 订阅服务模块 (5天)
```bash
where: backend/src/controllers/subscription.controller.ts
why: 订阅链接是用户获取节点配置的主要方式
how: 根据用户权限和节点列表生成订阅
must:
  - 支持 SS/SSR/V2Ray/Trojan 协议
  - 节点过滤 (用户等级/分组)
  - 流量统计嵌入
  - 订阅转换支持
  - Clash/Quantumult 格式
```

**API 端点**:
```
GET    /api/subscription/:token           - 获取订阅 (通用)
GET    /api/subscription/:token/ss        - SS 订阅
GET    /api/subscription/:token/ssr       - SSR 订阅
GET    /api/subscription/:token/v2ray     - V2Ray 订阅
GET    /api/subscription/:token/trojan    - Trojan 订阅
GET    /api/subscription/:token/clash     - Clash 订阅
```

**订阅生成逻辑**:
```typescript
// 1. 验证 Token
// 2. 获取用户信息
// 3. 过滤可用节点
// 4. 根据协议生成配置
// 5. Base64 编码 (可选)
// 6. 返回订阅内容
```

#### 2. 流量统计模块 (3天)
```bash
where: backend/src/controllers/traffic.controller.ts
why: 流量统计是计费和限制的基础
how: 异步写入 + 定时聚合
must:
  - 流量记录
  - 流量查询
  - 流量限制检查
  - 流量报表
```

**API 端点**:
```
POST   /api/traffic/report              - 上报流量 (内部)
GET    /api/traffic/usage               - 获取流量使用情况
GET    /api/traffic/history             - 获取流量历史记录
```

#### 3. 支付系统模块 (4天)
```bash
where: backend/src/controllers/payment.controller.ts
why: 支付是商业模式的核心
how: 集成支付网关 + 订单管理
must:
  - 订单创建
  - 支付回调处理
  - 充值码支持
  - 优惠券支持
  - 返利处理
```

**API 端点**:
```
POST   /api/payment/order              - 创建订单
GET    /api/payment/order/:id          - 获取订单详情
POST   /api/payment/callback/:provider - 支付回调
POST   /api/payment/code/redeem        - 兑换充值码
POST   /api/payment/coupon/apply       - 应用优惠券
```

**支持的支付方式**:
- 支付宝 (F2FPay)
- 微信支付
- PayPal
- 充值码支付

#### 4. 工单系统模块 (2天)
```bash
where: backend/src/controllers/ticket.controller.ts
why: 工单是用户支持的主要渠道
how: RESTful API + 邮件通知
must:
  - 工单提交
  - 工单回复
  - 工单状态管理
  - 邮件通知
```

---

### 第三阶段：增强功能 (Week 5-6)

#### 1. 管理后台 (5天)
```bash
where: backend/src/controllers/admin.controller.ts
why: 管理员需要管理用户、节点、订单等
how: RBAC + RESTful Admin API
must:
  - 用户管理
  - 节点管理
  - 订单管理
  - 系统配置
  - 数据统计
```

**API 端点**:
```
# 用户管理
GET    /api/admin/users               - 用户列表
GET    /api/admin/users/:id           - 用户详情
PUT    /api/admin/users/:id           - 更新用户
DELETE /api/admin/users/:id           - 删除用户

# 节点管理
GET    /api/admin/nodes               - 节点列表
POST   /api/admin/nodes               - 创建节点
PUT    /api/admin/nodes/:id           - 更新节点
DELETE /api/admin/nodes/:id           - 删除节点

# 订单管理
GET    /api/admin/orders              - 订单列表
PUT    /api/admin/orders/:id          - 更新订单

# 系统配置
GET    /api/admin/config              - 获取配置
PUT    /api/admin/config              - 更新配置

# 统计报表
GET    /api/admin/stats/users         - 用户统计
GET    /api/admin/stats/traffic       - 流量统计
GET    /api/admin/stats/revenue       - 收入统计
```

#### 2. Telegram Bot 集成 (3天)
```bash
where: backend/src/services/telegram.ts
why: Telegram 是重要的用户触达渠道
how: Telegraf 框架
must:
  - 用户绑定
  - 流量查询
  - 节点状态
  - 工单提交
  - 签到提醒
```

**Bot 命令**:
```
/start      - 开始使用
/bind       - 绑定账户
/traffic    - 查询流量
/nodes      - 节点状态
/checkin    - 签到
/ticket     - 提交工单
/help       - 帮助信息
```

#### 3. 邮件服务 (2天)
```bash
where: backend/src/services/email.ts
why: 邮件是重要的通知渠道
how: Nodemailer + 模板引擎
must:
  - 注册验证邮件
  - 密码重置邮件
  - 工单通知
  - 流量提醒
```

#### 4. 数据分析和报表 (3天)
```bash
where: backend/src/controllers/analytics.controller.ts
why: 数据分析支持业务决策
how: 聚合查询 + 图表数据
must:
  - 用户增长统计
  - 收入统计
  - 流量统计
  - 节点负载统计
```

---

### 第四阶段：前端开发 (Week 7-8)

#### 1. 用户端页面
```bash
where: frontend/src/pages/user/
why: 用户需要友好的界面
how: Vue 3 + Element Plus + Vite
must:
  - 登录/注册页
  - 仪表板
  - 节点列表
  - 订阅管理
  - 订单管理
  - 工单系统
  - 个人设置
```

#### 2. 管理端页面
```bash
where: frontend/src/pages/admin/
why: 管理员需要后台管理界面
how: Vue 3 + Element Plus + Vite
must:
  - 用户管理
  - 节点管理
  - 订单管理
  - 系统配置
  - 数据报表
```

---

### 第五阶段：测试和优化 (Week 9-10)

#### 1. 单元测试
```bash
where: backend/tests/
why: 保证代码质量
how: Bun Test + Jest
must:
  - API 测试
  - Service 层测试
  - 工具函数测试
```

#### 2. 集成测试
```bash
where: backend/tests/integration/
why: 验证模块间协作
how: Supertest + Prisma Mock
must:
  - 用户注册到订阅完整流程
  - 支付流程
  - 工单流程
```

#### 3. 性能优化
```bash
where: 全局
why: 提升用户体验
how: 缓存 + 异步 + 索引优化
must:
  - Redis 缓存
  - 数据库查询优化
  - API 响应优化
```

#### 4. 安全加固
```bash
where: 全局
why: 保护用户数据和系统安全
how: 安全最佳实践
must:
  - SQL 注入防护
  - XSS 防护
  - CSRF 防护
  - 频率限制
  - 数据加密
```

---

## 📦 部署策略

### 开发环境
```bash
# 后端
cd backend
bun install
bun run dev  # 热重载

# 前端
cd frontend
npm install
npm run dev  # Vite HMR

# 数据库
docker-compose up -d mysql redis
```

### 测试环境
```bash
# 构建前端
cd frontend
npm run build:public

# 部署前端
sudo ./scripts/deploy-public.sh

# 启动后端 (PM2)
cd backend
pm2 start bun --name spanel-api -- run src/index.ts

# Nginx 配置
sudo ./scripts/install-nginx-config.sh
```

### 生产环境
```bash
# 使用 Docker/Podman 部署
docker-compose up -d

# 或使用 Kubernetes
kubectl apply -f k8s/
```

---

## 📈 成功指标

### 性能指标
- ⚡ API 响应时间 < 100ms (P95)
- ⚡ 首屏加载 < 1s (4G 网络)
- ⚡ 并发支持 > 1000 QPS
- ⚡ 内存占用 < 100MB (单实例)

### 功能指标
- ✅ 所有旧 PHP 功能完全迁移
- ✅ API 兼容旧版本客户端
- ✅ 数据零丢失迁移
- ✅ 平滑切换无停机

### 质量指标
- ✅ 单元测试覆盖率 > 80%
- ✅ 无已知安全漏洞
- ✅ 通过压力测试
- ✅ 文档完整

---

## 🔄 迁移策略

### 数据迁移
```bash
# 1. 导出旧数据库
mysqldump -u root -p old_spanel > backup.sql

# 2. 转换数据结构 (脚本)
bun run scripts/migrate-data.ts

# 3. 导入新数据库
mysql -u root -p new_spanel < migrated.sql

# 4. 验证数据完整性
bun run scripts/verify-migration.ts
```

### 灰度发布
```
Week 1-2:  开发环境验证
Week 3-4:  测试环境验证
Week 5-6:  10% 用户灰度
Week 7-8:  50% 用户灰度
Week 9-10: 100% 全量切换
```

### 回滚方案
```bash
# 如果出现问题，立即回滚到旧版本
sudo systemctl stop spanel-bun
sudo systemctl start php7-spanel
sudo nginx -s reload
```

---

## 📝 开发规范

### Git 工作流
```bash
# 功能开发
git checkout -b feature/auth-module
git commit -m "feat: implement user authentication"

# 修复 Bug
git checkout -b fix/login-error
git commit -m "fix: resolve login validation issue"

# 文档更新
git commit -m "docs: update API documentation"
```

### 代码规范
- TypeScript: ESLint + Prettier
- 提交信息: Conventional Commits
- 分支命名: feature/fix/hotfix/docs
- 代码审查: 必须经过 Review

---

## 🎯 里程碑

| 时间 | 里程碑 | 状态 |
|------|--------|------|
| Week 1-2 | 核心基础完成 | 🚧 进行中 |
| Week 3-4 | 核心功能完成 | 📋 待开始 |
| Week 5-6 | 增强功能完成 | 📋 待开始 |
| Week 7-8 | 前端开发完成 | 📋 待开始 |
| Week 9-10 | 测试和优化完成 | 📋 待开始 |
| Week 11+ | 生产环境部署 | 📋 待开始 |

---

## 📚 相关文档

- [PHP 项目审计报告](PHP_AUDIT_REPORT.md)
- [旧项目 README](../.links/spanel/README.md)
- [数据结构文档](../.links/spanel/README.md#数据结构)
- [新项目 README](../README.md)
- [快速开始指南](QUICKSTART.md)
- [部署文档](DEPLOYMENT.md)

---

**文档版本**: v1.0.0
**最后更新**: 2026-01-13
**维护人员**: Claude (AI Assistant)
