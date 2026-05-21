# SPanel-bun 接口验证与单元测试规约

本规范定义了对 **SPanel-bun** 的核心 RESTful API 以及节点同步接口进行质量保障与自动化测试的方案，利用 Bun 原生内置的超高速测试框架 `bun test` 实现高效、轻量的自动化接口验证。

---

## 目录
1. [测试设计原则](#1-测试设计原则)
2. [环境搭建与配置 (`bun test`)](#2-环境搭建与配置-bun-test)
3. [数据库与 Redis 连接的 Mock 方案](#3-数据库与-redis-连接的-mock-方案)
4. [核心接口测试用例编写规范](#4-核心接口测试用例编写规范)
5. [测试执行与覆盖率要求](#5-测试执行与覆盖率要求)

---

## 1. 测试设计原则

1. **前后端完全分离要求**：前端为纯静态文件，因此接口测试聚焦于后端返回的 JSON 结构规范度、状态码合规性以及业务越权边界。
2. **轻量与隔离**：不强依赖庞大的外部容器环境，测试套件应能够在本地内存级快速跑完。
3. **零副作用**：测试期间产生的临时数据库写入和 Redis 缓存键，在测试完毕后必须被自动回收并清空（Tear Down）。

---

## 2. 环境搭建与配置 (`bun test`)

Bun 运行时原生内置了对 Jest/Vitest 语法高度兼容的测试框架，执行速度比传统的 Jest 快 10 倍以上。

### 2.1 依赖安装与声明
测试中我们仅需安装少量的开发辅助依赖（如 `mock-req-res` 或直接利用 Drizzle 在 SQLite 内存库上运行测试，本重写方案通过为 Drizzle 适配 SQLite 内存数据库进行核心单元测试）：

```json
// package.json 核心脚本声明
{
  "scripts": {
    "test": "bun test",
    "test:coverage": "bun test --coverage"
  }
}
```

---

## 3. 数据库与 Redis 连接的 Mock 方案

为了实现单机无外部依赖测试，在 `tests/setup.ts` 中设计内存数据库的 Mock 替换：

```typescript
import { mock, beforeAll, afterAll } from 'bun:test';
import { Redis } from 'ioredis';

// Mock ioredis 客户端以避免外部物理依赖
mock.module('ioredis', () => {
  return {
    Redis: class {
      private store: Record<string, string> = {};
      
      async get(key: string) { return this.store[key] || null; }
      async set(key: string, value: string, mode?: string, duration?: number) {
        this.store[key] = value;
        return 'OK';
      }
      async del(key: string) {
        delete this.store[key];
        return 1;
      }
      async lpush(key: string, val: string) { return 1; }
    }
  };
});
```

---

## 4. 核心接口测试用例编写规范

测试文件以 `*.test.ts` 命名，存放在项目根目录的 `tests/` 文件夹下。

### 4.1 游客与鉴权测试用例 (`tests/auth.test.ts`)
测试用以验证登录接口、密保哈希碰撞以及 POW 验证链是否正常工作：

```typescript
import { describe, expect, it } from 'bun:test';
import { Elysia } from 'elysia';
import { guestRoutes } from '../src/controllers/auth';

describe('🔓 游客鉴权接口群组单元测试', () => {
  const app = new Elysia().use(guestRoutes);

  it('GET /captcha 应当成功返回 SVG 及缓存验证码 ID', async () => {
    const response = await app
      .handle(new Request('http://localhost/captcha'))
      .then((res) => res.json());

    expect(response).toHaveProperty('captchaId');
    expect(response).toHaveProperty('svg');
    expect(response.svg).toContain('<svg');
  });

  it('POST /login 缺少 POW 校验参数应当被中间件直接打回 400', async () => {
    const response = await app.handle(
      new Request('http://localhost/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@gmail.com',
          password: 'wrong_password'
        })
      })
    );

    expect(response.status).toBe(400); // 强类型拦截生效
  });
});
```

### 4.2 用户越权防御测试用例 (`tests/admin.test.ts`)
高特权接口防纵向越权是安全重度考核指标：

```typescript
import { describe, expect, it } from 'bun:test';
import { Elysia } from 'elysia';
import { adminRoutes } from '../src/controllers/admin';
import { jwtMiddleware } from '../src/middleware/auth';

describe('🛡️ 管理端高特权接口防御越权测试', () => {
  // 挂载鉴权中间件及管理控制器
  const app = new Elysia()
    .use(jwtMiddleware)
    .use(adminRoutes);

  it('携带普通用户的 JWT 请求管理员看板应当被拦截并返回 403', async () => {
    // 1. 制造一个普通用户的伪造令牌
    const testUserJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOjEyMywiaXNBZG1pbiI6MH0...';

    const response = await app.handle(
      new Request('http://localhost/api/v1/admin/dashboard', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${testUserJwt}`
        }
      })
    );

    expect(response.status).toBe(403); // 必须是拒绝状态
  });
});
```

---

## 5. 测试执行与覆盖率要求

开发过程中，所有提交必须通过 100% 的单元测试集：

```bash
# 执行全部测试用例
bun test

# 执行并输出可视化的测试覆盖率报告
bun test --coverage
```

### 覆盖率红线要求
*   对于核心 Service 层（`src/services/` 下的订阅配置生成器、充值结算扣费引擎等）的代码，**测试覆盖率必须达到 90% 以上**。
*   对于控制器层（`src/controllers/`），接口返回格式匹配正确性验证覆盖率不低于 80%。
