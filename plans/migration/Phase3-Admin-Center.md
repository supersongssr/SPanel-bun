# SPanel-bun 重构迁移三期规范：管理端与高权限安全控制 (Phase 3)

本方案涵盖了重构迁移的第三阶段：管理后台系统的静态化交互、高特权接口鉴权保障、敏感数据审计日志记录以及管理员“一键切换/模拟用户”的安全令牌握手机制设计。

---

## 目录
1. [三期迁移目标](#1-三期迁移目标)
2. [管理端高特权鉴权中间件设计 (`AdminAuth`)](#2-管理端高特权鉴权中间件设计-adminauth)
3. [管理员一键模拟用户 (Impersonation) 安全握手流](#3-管理员一键模拟用户-impersonation-安全握手流)
4. [操作审计日志设计与表结构](#4-操作审计日志设计与表结构)
5. [三期功能上线验收指南](#5-三期功能上线验收指南)

---

## 1. 三期迁移目标

1. 实现超级管理控制台（`/admin/` 目录下静态文件）的静态化分发，利用 **Alpine.js + HTML 表格组件** 实现百万级用户和节点数据的分页检索、编辑及维护。
2. 确保所有 `/api/v1/admin/*` 下的 API 强挂载 `AdminAuth` 过滤中间件，阻断任何非管理员或越权行为。
3. 建立“模拟用户登录”安全握手，使管理员能够在不获取用户明文密码的前提下，生成安全的受限临时令牌以排查故障。
4. 记录所有高危写入操作（增删改节点、调整用户余额），提供详尽的操作轨迹审计。

---

## 2. 管理端高特权鉴权中间件设计 (`AdminAuth`)

在 `src/middleware/auth.ts` 中实现高特权校验。该中间件在解析 JWT 的基础上，二次检索数据库或缓存中的 `user.is_admin` 状态，确保高危接口的安全。

```typescript
import { jwt } from '@elysiajs/jwt';
import { db } from '../config/database';
import { userTable } from '../db/schema';
import { eq } from 'drizzle-orm';

/**
 * ElysiaJS 管理员高特权校验过滤器
 */
export const adminAuthMiddleware = (app: any) => 
  app.derive(async ({ request, set, jwt }: any) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      set.status = 401;
      return { error: '未登录且未授权' };
    }

    const token = authHeader.split(' ')[1];
    const payload = await jwt.verify(token);
    
    if (!payload || !payload.uid) {
      set.status = 401;
      return { error: '非法令牌凭证' };
    }

    // 查询用户信息，确认管理员状态
    const users = await db.select().from(userTable).where(eq(userTable.id, Number(payload.uid))).limit(1);
    const user = users[0];

    if (!user || user.isAdmin !== 1) {
      set.status = 403; // Forbidden
      return { error: '越权访问：非管理员用户' };
    }

    // 注入当前操作上下文
    return { adminUser: user };
  });
```

---

## 3. 管理员一键模拟用户 (Impersonation) 安全握手流

在日常维护中，管理员经常需要切换为某特定用户查看该用户的配置或工单。直接修改用户密码或伪造 JWT 极度危险。
**SPanel-bun 采用 Redis 临时授权凭证握手机制：**

```text
[ 管理员浏览器 (admin.yourdomain.com) ]
         │
         ▼ (1. POST /api/v1/admin/user/impersonate 携带 uid=100)
[ ElysiaJS 管理控制器 (AdminAuth) ] ──► (2. 生成高熵 token 并存入 Redis, 仅 60s 有效)
         │
         ▼ (3. 返回 { impersonateToken: "imp_xxxxxx" })
[ 管理员浏览器 ] ──► (4. 打开新标签页并跳转 panel.yourdomain.com/auth/login.html?token=imp_xxxxxx)
         │
         ▼ (5. panel 页面拉取 URL token 请求 POST /api/v1/auth/login-impersonate 进行兑换)
[ ElysiaJS 未登录控制器 ] ──► (6. 核对 Redis, 校验成功则销毁 Redis Token, 并返回用户 uid=100 的合法 JWT)
         │
         ▼ (7. 兑换成功，管理员在 panel 域名以该用户身份进行页面操作)
[ 用户端面板主页 ]
```

### 3.1 握手交换端点实现 (Backend Exchange)
```typescript
import { redis } from '../config/redis';
import crypto from 'crypto';

// 1. 管理端申请生成 Impersonate 授权 Token (管理路由组下)
export async function createImpersonateToken(targetUid: number) {
  const token = 'imp_' + crypto.randomBytes(32).toString('hex');
  
  // 临时保存至 Redis，设置 60 秒极短生命期，单次消费后即失效
  await redis.set(`impersonate:${token}`, targetUid.toString(), 'EX', 60);
  
  return { impersonateToken: token };
}

// 2. 游客端点进行 Token 兑换 JWT (未登录路由组下)
export async function redeemImpersonateToken(token: string, jwtSigner: any) {
  const targetUidStr = await redis.get(`impersonate:${token}`);
  if (!targetUidStr) {
    throw new Error('模拟登录令牌已过期或不存在');
  }

  // 消费令牌，即用即毁防止重放
  await redis.del(`impersonate:${token}`);

  const uid = Number(targetUidStr);
  
  // 生成目标用户的常规登录 JWT
  const userJwt = await jwtSigner.sign({ uid });
  
  return { token: userJwt };
}
```

---

## 4. 操作审计日志设计与表结构

所有管理员在高特权下对资源进行的修改，均需记录日志。

### 4.1 审计日志表 Schema (`src/db/schema.ts`)
```typescript
import { mysqlTable, serial, int, varchar, text, datetime } from 'drizzle-orm/mysql-core';

export const adminAuditLogTable = mysqlTable('admin_audit_log', {
  id: serial('id').primaryKey(),
  adminId: int('admin_id').notNull(),
  adminEmail: varchar('admin_email', { length: 128 }).notNull(),
  action: varchar('action', { length: 128 }).notNull(), // 如: 'edit_node', 'change_balance'
  targetId: int('target_id').notNull(),                 // 被操作的主体 ID
  detail: text('detail').notNull(),                     // 详细 JSON 数据变更对比
  ip: varchar('ip', { length: 45 }).notNull(),
  createdAt: datetime('created_at').defaultFn(() => new Date()).notNull(),
});
```

---

## 5. 三期功能上线验收指南

*   [ ] **越权边界验证**：普通用户以其 JWT 令牌强行请求 `/api/v1/admin/dashboard`，接口必须拦截并返回 `403 Forbidden`。
*   [ ] **模拟用户测试**：在管理员用户列表点击“进入用户视点”，能成功跳转至新窗口并自动展示该用户的数据，查验 LocalStorage 中的 JWT 已更换为该用户的 JWT。
*   [ ] **审计追踪验证**：管理员在后台将用户 A 的余额变更为 `500.00` 元，查看 `admin_audit_log` 数据库表，必须存在此条记录，并记录了操作员的 IP。
