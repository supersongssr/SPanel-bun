# SPanel-bun 旧版架构重难点重构与 AI 模块化开发蓝图

本项目重构的核心任务，是彻底清算旧版 PHP SPanel 历史遗留的代码逻辑混乱和结构臃肿（"意大利面条式"代码），并在全新的 **Bun + TypeScript + ElysiaJS + Drizzle ORM** 栈上，建立一套极度清晰、强类型、单一职责且面向 **AI 代理高能自动编写** 的现代干净架构（Clean Architecture）。

---

## 1. 旧版 SPanel (PHP/Slim 3.x) 核心架构痛点解剖

旧版 codebase 存在严重的“高耦合”、“职责不清”及“代码膨胀”等坏味道。以下是我们在重写中必须解决的致命缺陷：

### 痛点 A：超胖控制器 (God Class Controller) —— 逻辑与视图高度耦合
*   **代码坏味道**：`UserController.php` 长度接近 **90KB**，包含 40 余个 Action 方法。`ApiController.php` 接近 **40KB**。
*   **重构策略**：控制器类沦为了“上帝类”。它不仅负责解析 HTTP 参数、还直接执行 Eloquent SQL 查询数据库、进行复杂的资金扣减逻辑、调用微信和邮件 API、处理签到流量分配，甚至还要处理页面的 Smarty 渲染和 HTML 输出。
*   **危害**：代码长、分支多，极易引发回归 Bug，对于 AI 编写极不友好，单次代码生成的上下文窗口压力极大。

### 痛点 B：数据源污染与隐式修改 (Implicit DB Changes) —— 缺乏事务级防线
*   **代码坏味道**：在 Controller 和 Middlewares 内部随意使用 `User::where('id', $uid)->update([...])`，缺乏统一的 Service 数据业务层封锁。
*   **危害**：资金扣减等高危操作散落在各处，由于没有集中的事务处理，导致在购买并发（CC / 越权爆破）时产生负余额与超卖漏洞。

### 痛点 C：配置读取与路由拦截不规范 —— 隐藏暗雷
*   **代码坏味道**：在控制器函数深处，存在大量直接使用 `Config::get('muKey')`、`$_POST['key']` 等全局静态或原始超全局变量的情形。部分控制器方法内部甚至手动编写 `if ($user == null) { return $response; }`，与路由中间件的功能相重叠。
*   **危害**：接口入参没有声明式 Schema，入参非法时直接抛出 PHP 异常，导致 API 健壮性差，无法进行高效的契约式测试（Contract Testing）。

### 痛点 D：无状态与状态化逻辑混乱 —— 支付与定时任务常驻耗能
*   **代码坏味道**：定时任务通过不断冷启动 `php xcat checkjob` 来清理数据，进程每次启动都要经历框架初始化和数据库重连。支付网关（如 `YftPay`、`chenPay`）直接在控制器内部强行跳转并硬编码逻辑。
*   **危害**：极大地消耗了宿主机物理资源，并发性能极低，且非常难以横向扩展。

---

## 2. 新版 SPanel-bun 干净架构 (Clean Architecture) 设计

为了实现极佳的可读性、可维护性与抗压性，SPanel-bun 拒绝单体大控制器，改用**严格分层、模块解耦**的结构。

```text
       [ ElysiaJS 路由网关 ] (src/index.ts)
                │
                ▼ (通过 t.Object 强类型入参预检)
      [ 控制器层 Controller ] (src/controllers/*)
  (只做 HTTP 参数解析、状态码组装，单文件 < 150 行)
                │
                ▼ (业务契约调用)
       [ 服务层 Service ] (src/services/*)
    (无状态纯业务逻辑类，包含资金计算、订阅渲染等)
                │
                ▼ (数据高精度操作)
    [ 数据访问层 DB/Drizzle ] (src/db/schema.ts)
(严格 Schema 隐射，使用 decimal.js 级联处理高精度字段)
```

### 2.1 各层职责红线规约 (Separation of Concerns)

1.  **数据层 (Database Layer - `src/db/`)**：
    *   **职责**：仅声明数据库表物理映射（Schema），提供原始 Drizzle Query Helper。
    *   **红线**：严禁在此层编写任何具体的业务决策逻辑，禁止直接在此层包含任何 HTTP 上下文。
2.  **服务层 (Service Layer - `src/services/`)**：
    *   **职责**：业务核心大脑。接收普通 TS 类型入参，执行核心算法（如：流量大小格式转换、基于位掩码 `node_group` 的节点过滤算法、利用 `decimal.js` 精算余额并开启 DB 事务扣款）。
    *   **红线**：服务层方法**必须是无状态的**，不依赖任何 HTTP 请求体（`Request`）、请求头（`Headers`）或特定 Web 框架上下文。它应该是高度可进行单元测试的。
3.  **控制器层 (Controller Layer - `src/controllers/`)**：
    *   **职责**：HTTP 协议的翻译官。负责从 ElysiaJS 上下文中读取参数，调用服务层对应的 Service，并将 Service 的纯 TS 结果包装为标准 JSON (`{ code, message, data }`) 吐给前端。
    *   **红线**：**严禁直接在 Controller 中编写复杂的 SQL 读写逻辑或支付状态流转算法**。Controller 方法应控制在 10 行以内，单文件总行数严禁超过 200 行。
4.  **验证层 (Validation Layer - `ElysiaJS t.Object`)**：
    *   **职责**：强校验。每个路由声明处直接绑定 Elysia 的类型检验守卫。非法入参在到达 Controller 之前便会被网关自动拦截并返回 `400 Bad Request`。

---

## 3. 面向 AI 的模块化分治开发指南 (AI-Driven Development Blueprint)

新版 SPanel-bun 将由 AI 编码助手（如 Antigravity）直接进行代码编写。为了防止 AI 在长篇大论中迷失方向，导致代码质量下降或逻辑混乱，开发流程遵循以下**模块化拆分标准**：

### 3.1 单文件行数红线 (File Size Ceiling)
*   **准则**：**单个 TypeScript 代码文件的最大行数不得超过 300 行。**
*   **做法**：如果某个业务的 Controller（例如 `UserController`）包含 20 多个接口，不要写在一个大文件里，而是按照业务二级模块拆分目录，例如：
    *   `controllers/user/profile.ts`（处理个人资料、2FA、密码重置）
    *   `controllers/user/shop.ts`（处理商店商品展示、优惠券校验与购买）
    *   `controllers/user/ticket.ts`（处理工单的创建、追问和关闭）

### 3.2 契约式开发 (Contract-First Coding)
AI 编写代码之前，必须先定义好**接口契约 (Interface / Types)**。
*   *第 1 步*：AI 优先定义 Services 中的入参类型（`dto`）与返回类型。
*   *第 2 步*：编写单元测试 Mock 契约。
*   *第 3 步*：AI 分步编写具体业务逻辑，直至通过单元测试。

---

## 4. 后端拆解模块化文件清单 (Splitting Monolith Controllers)

针对旧版 `UserController`、`AdminController` 及 `ApiController` 进行深度降维，拆分出高内聚、低耦合的模块文件结构：

### 4.1 会员端控制器模块拆解 (`src/controllers/user/`)

*   `dashboard.ts` —— **仪表盘控制器**
    *   *功能*：拉取用户流量图表数据、主控制台概要统计、触发每日签到交互。
*   `shop.ts` —— **套餐商店控制器**
    *   *功能*：获取在售商品套餐、应用优惠码校验抵扣折扣率、提交订单支付。
*   `ticket.ts` —— **工单反馈控制器**
    *   *功能*：用户发起新工单、追问回复内容、查询历史工单对话详情。
*   `profile.ts` —— **安全资料控制器**
    *   *功能*：绑定/解绑 2FA、重置 SSR 混淆密码、更改连接密码与加密方式、付费更改或免费重置分配端口。
*   `relay.ts` —— **中转规则控制器**
    *   *功能*：用户自建端口转发中转规则的 CRUD 操作。
*   `invite.ts` —— **邀请返利控制器**
    *   *功能*：查看个人专有邀请链接、获取邀请记录及近期佣金返利账单。
*   `detect.ts` —— **安全审计控制器**
    *   *功能*：获取系统的屏蔽词与规则阻断列表，检索用户自己触发审计阻断的历史日志。
*   `recharge.ts` —— **充值兑换控制器**
    *   *功能*：提交礼品卡/充值卡密，快速核销卡片并将面值兑换累加到余额中。

### 4.2 管理端控制器模块拆解 (`src/controllers/admin/`)

*   `user.ts` —— **会员管治控制器**
    *   *功能*：全平台会员高级筛选与分页查询、修改会员各项数值（特权等级、余额、总流量、封禁状态）、生成 Impersonate 安全模拟令牌。
*   `node.ts` —— **物理节点配置控制器**
    *   *功能*：代理节点增删改查、批量下发节点后端代理配置 JSON、监控节点实时负载和在线设备数。
*   `shop.ts` —— **商品上架控制器**
    *   *功能*：上架/下架商品包，修改套餐时长、限额流量与目标等级。
*   `coupon.ts` —— **折扣码控制器**
    *   *功能*：优惠券批量生成、应用场景范围（特定等级可用/特定商品可用）及有效期限制。
*   `audit.ts` —— **审计日志控制器**
    *   *功能*：查询全局审计触发记录，以及超级管理员在后台的高危写操作历史追踪。
*   `monitor.ts` —— **系统环境监视控制器**
    *   *功能*：查看 Bun 服务器运行时资源占比、查看 Redis 滑动窗口防御队列以及 IP 临时锁定库。

---

## 5. 核心模块 AI 编写模板与提示范例

为了让 AI 代理能够顺畅、完美地生成类型安全、架构干净的代码，开发时可采用如下规范：

### 5.1 服务层编写规范 (以 `UserService:checkin` 签到逻辑为例)
```typescript
// Path: src/services/user-service.ts
import { db } from '../config/database';
import { users } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { BusinessError } from '../utils/errors';

export class UserService {
  /**
   * 用户每日签到获取流量
   * @param userId 用户 ID
   * @returns 签到获取的流量奖励 (Bytes) 与新流量总额
   */
  async doCheckin(userId: number): Promise<{ rewardBytes: bigint; totalBytes: bigint }> {
    return await db.transaction(async (tx) => {
      // 1. 获取并锁定用户记录，防并发签到刷流量
      const [user] = await tx.select()
        .from(users)
        .where(eq(users.id, userId))
        .for('update');

      if (!user) {
        throw new BusinessError('用户不存在');
      }

      // 2. 检查今天是否已经签到
      const today = new Date().toISOString().split('T')[0];
      const lastCheckinDay = user.last_checkin_time 
        ? user.last_checkin_time.toISOString().split('T')[0] 
        : null;

      if (lastCheckinDay === today) {
        throw new BusinessError('您今天已经签到过了，请明天再来');
      }

      // 3. 计算签到流量奖励 (标准 SPanel 规则: 随机奖励 100MB ~ 500MB)
      const randomMB = Math.floor(Math.random() * (500 - 100 + 1)) + 100;
      const rewardBytes = BigInt(randomMB) * 1024n * 1024n;

      // 4. 更新数据库，直接基于 BigInt 相加
      const nextTransfer = BigInt(user.transfer_enable) + rewardBytes;
      await tx.update(users)
        .set({
          transfer_enable: nextTransfer,
          last_checkin_time: new Date()
        })
        .where(eq(users.id, userId));

      return {
        rewardBytes,
        totalBytes: nextTransfer
      };
    });
  }
}
```

### 5.2 控制器层编写规范 (以签到 API 路由挂载为例)
```typescript
// Path: src/controllers/user/dashboard.ts
import { Elysia, t } from 'elysia';
import { UserService } from '../../services/user-service';

const userService = new UserService();

export const userDashboardRoutes = new Elysia({ prefix: '/dashboard' })
  /**
   * 会员主页签到接口
   */
  .post('/checkin', async ({ set, store }) => {
    // 1. 从 JWT Auth 中间件透传的上下文中获取 uid
    const userId = (store as any).userId; 
    
    try {
      // 2. 干净的契约业务调用，绝不在 Controller 内部拼接 SQL
      const result = await userService.doCheckin(userId);
      
      return {
        code: 200,
        message: `签到成功，已为您充入 ${Number(result.rewardBytes / 1024n / 1024n)}MB 流量。`,
        data: {
          reward_bytes: result.rewardBytes.toString(),
          transfer_enable: result.totalBytes.toString()
        }
      };
    } catch (error: any) {
      // 3. 统一错误捕获并以标准 JSON 反馈
      set.status = error.statusCode || 400;
      return {
        code: error.statusCode || 400,
        message: error.message || '签到失败',
        data: null
      };
    }
  });
```

---

## 6. AI 模块化自动生成约束法则

当命令 AI 开发特定子模块时，**必须满足以下开发约束**，否则一律不予合入主干：
1.  **强类型验证拦截**：所有的 POST / PUT 请求，必须通过 ElysiaJS 的 `t.Object` 形式约束入参。禁止在 Controller 函数中解析未知来源的 `body`。
2.  **绝对禁止全局 SQL**：所有 Controller 必须调用其对应引用的 Service 类。如果 Controller 代码里出现了 `db.select().from(...)`，视作架构违规，必须重构。
3.  **零浮点运算溢出**：对任何订单、余额、套餐折扣的计算，如果存在金额操作，AI 必须自动引入 `decimal.js` 类库，严格采用 `new Decimal(x).add(y)` 等函数运算，保证高精结算。
4.  **高抗并发锁粒度**：签到、扣款、取码等数据库更新高并发操作，AI 编写 Service 时必须开启事务 `db.transaction()` 并使用悲观锁 `.for('update')` 来封锁变动行，从根本上防止竞态漏洞。
