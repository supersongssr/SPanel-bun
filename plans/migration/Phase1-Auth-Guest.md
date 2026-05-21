# SPanel-bun 重构迁移一期规范：未登录与游客模块 (Phase 1)

未登录与游客模块是重构迁移的第一阶段。此阶段的核心任务是**移除 Slim 原有的 Session 登录机制，重构为完全基于 JWT 令牌的无状态认证机制，并将所有认证页面转化为纯静态 HTML，并强挂载防 CC 攻击的 POW（工作量证明）保护中间件。**

---

## 目录
1. [一期迁移目标](#1-一期迁移目标)
2. [后端 API 实现明细 (`/api/v1/auth`)](#2-后端-api-实现明细-apiv1auth)
3. [防 CC 工作量证明 (POW) 中间件实现](#3-防-cc-工作量证明-pow-中间件实现)
4. [前端静态页面与 Fetch AJAX 请求对接规范](#4-前端静态页面与-fetch-ajax-请求对接规范)
5. [一期上线验证清单](#5-一期上线验证清单)

---

## 1. 一期迁移目标

1. **彻底拆除 Smarty 模板引擎**，将 `/auth/login`, `/auth/register` 等页面全部重构为纯 HTML 静态文件，存放在 `public/auth/` 目录下。
2. **后端引入 ElysiaJS 鉴权接口**，用户成功认证后返回 JWT Token（不采用传统 Cookie，避免 CSRF 攻击）。
3. **在 `/api/v1/auth/register` 和 `/api/v1/auth/send-code` 接口上强制开启 POW 挑战校验**，消耗恶意攻击者的客户端算力，阻止高并发 CC 攻击和短信邮件接口轰炸。

---

## 2. 后端 API 实现明细 (`/api/v1/auth`)

后端控制器文件应建立在 `src/controllers/auth/index.ts` 中，使用 ElysiaJS 声明以下路由：

```typescript
import { Elysia, t } from 'elysia';
import { handleLogin, handleRegister, handleSendCode, generatePowChallenge } from './authService';

export const guestRoutes = new Elysia()
  // 1. 获取图形验证码 (用于防简单机器人刷 POW 接口)
  .get('/captcha', async () => {
    // 调用 svg-captcha，将验证码文本与 ID 缓存至 Redis，TTL 5 分钟
    return { captchaId: 'redis_hash_key', svg: '<svg>...</svg>' };
  })

  // 2. 请求工作量挑战 (POW Challenge)
  .post('/pow-challenge', async ({ body }) => {
    // 传递用户的临时特征/Captcha 校验结果
    return await generatePowChallenge(body.captchaId, body.captchaCode);
  }, {
    body: t.Object({
      captchaId: t.String(),
      captchaCode: t.String()
    })
  })

  // 3. 登录接口
  .post('/login', async ({ body, set }) => {
    return await handleLogin(body, set);
  }, {
    body: t.Object({
      email: t.String(),
      password: t.String(),
      powSalt: t.String(),
      powNonce: t.String()
    })
  })

  // 4. 注册接口 (强制验证邮箱验证码 + POW)
  .post('/register', async ({ body, set }) => {
    return await handleRegister(body, set);
  }, {
    body: t.Object({
      email: t.String(),
      password: t.String(),
      emailCode: t.String(),
      powSalt: t.String(),
      powNonce: t.String()
    })
  })

  // 5. 发送邮箱验证码 (强制 POW)
  .post('/send-code', async ({ body }) => {
    return await handleSendCode(body);
  }, {
    body: t.Object({
      email: t.String(),
      powSalt: t.String(),
      powNonce: t.String()
    })
  });
```

---

## 3. 防 CC 工作量证明 (POW) 中间件实现

在 `src/middleware/pow.ts` 中实现 POW 的快速校验逻辑，确保在进行高能耗的密码 Argon2 散列运算或发送邮件之前，过滤非法的恶意包：

```typescript
import { createHash } from 'crypto';
import { redis } from '../config/redis';

/**
 * 校验客户端算出的 Nonce 是否匹配 POW 挑战
 */
export async function verifyPow(salt: string, nonce: string, difficulty: number): Promise<boolean> {
  // 1. 确认该 salt 是否在 Redis 中存在且未过期 (一用即毁防重放)
  const exists = await redis.get(`pow:salt:${salt}`);
  if (!exists) return false;
  
  // 2. 消费此 salt，防重放
  await redis.del(`pow:salt:${salt}`);

  // 3. 进行 SHA-256 计算验证
  const hash = createHash('sha256')
    .update(salt + nonce)
    .digest('hex');

  // 4. 确认前导零数量是否匹配
  const prefix = '0'.repeat(difficulty);
  return hash.startsWith(prefix);
}
```

*   **性能考量**：Node.js/Bun 的单次 `sha256` 仅消耗约 `0.02ms` 的 CPU 时间，因此后端验证千次请求也仅需 `20ms`，而攻击者客户端算完一轮可能需要几秒，攻防不对称防御成立。

---

## 4. 前端静态页面与 Fetch AJAX 请求对接规范

前端所有的未登录页面不再依靠 Slim PHP 直接输出，而是从 `/root/git/SPanel-bun/public` 中读取静态文件。

### 4.1 会话凭证存储
用户登录成功后，后端返回如下 JSON 载荷：
```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { "email": "test@test.com" }
  }
}
```
前端 JS 接收到之后，**强制保存在 LocalStorage 中**：
```javascript
localStorage.setItem('spanel_jwt', response.data.token);
localStorage.setItem('spanel_user', JSON.stringify(response.data.user));
// 登录成功后，跳转至用户面板
window.location.href = '/user/dashboard.html';
```

### 4.2 客户端 POW 算力计算器示例 (`public/assets/js/pow.js`)
在注册及验证码获取表单提交时，前端异步启动后台线程（Web Worker）进行哈希碰撞以防界面卡死，普通用户耗时约 100ms - 300ms：

```javascript
// POW 客户端碰撞示例
async function solvePow(salt, difficulty) {
  let nonce = 0;
  const prefix = '0'.repeat(difficulty);
  
  while (true) {
    const data = salt + nonce;
    // 浏览器原生高速 SubtleCrypto 碰撞
    const msgUint8 = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    if (hashHex.startsWith(prefix)) {
      return nonce.toString();
    }
    nonce++;
  }
}
```

---

## 5. 一期上线验证清单

在 Phase 1 开发就绪后，必须逐一验证以下安全控制和跳转逻辑：

*   [ ] **静态文件直接访问**：在浏览器访问 `http://localhost/auth/login.html` 可以瞬间秒开。
*   [ ] **图形验证码更新**：每次点击图形验证码 SVG 图像，能自动请求 `/api/v1/auth/captcha` 并刷新，原验证码 ID 立即被 Redis 撤回。
*   [ ] **无 POW 拒绝机制**：使用 Postman 模拟向 `/api/v1/auth/login` 发起请求，若不携带 `powSalt` 和 `powNonce`，接口必须立刻拦截并返回 `400 Bad Request`，绝不能调用 `Bun.password` 进行耗时验证。
*   [ ] **JWT 写入测试**：使用正确的账号密码通过 POW 校验登录后，LocalStorage 成功录入合法 JWT。
