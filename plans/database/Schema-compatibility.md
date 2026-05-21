# SPanel-bun 数据库 Schema 兼容性设计方案

本方案详细阐述了 **SPanel-bun** 在使用 **Drizzle ORM** 对接既有 SPanel MySQL 数据库时的字段映射规则、数学精度控制（Decimal）以及 TypeScript 类型安全规范。

---

## 目录
1. [映射基本原则](#1-映射基本原则)
2. [MySQL 与 Drizzle ORM 数据类型精确映射表](#2-mysql-与-drizzle-orm-数据类型精确映射表)
3. [BigInt 流量字段处理规范](#3-bigint-流量字段处理规范)
4. [Decimal 高精度财务计算与边界](#4-decimal-高精度财务计算与边界)
5. [时区与日期时间处理机制](#5-时区与日期时间处理机制)
6. [MySQL 5.6 生产环境兼容性红线](#6-mysql-56-生产环境兼容性红线)
7. [Drizzle Schema 核心表结构代码示例](#7-drizzle-schema-核心表结构代码示例)

---

## 1. 映射基本原则

为了保证旧有 PHP 系统的财务、流量数据在重构后 100% 兼容，并且无需对现有的 MySQL 数据库做任何结构变更或迁移，Drizzle ORM Schema 的定义必须遵循以下基本原则：
1. **零结构变更 (Zero Migration)**：不增加、不删除、不修改原有数据表的列名、类型、默认值以及索引。
2. **严格类型对齐**：对于 MySQL 的特有数据类型，在 TypeScript 中使用最精确且开销最小的类型进行对齐。
3. **精度红线**：流量（BigInt）与金额（Decimal）计算禁止使用原生的 JavaScript Number（双精度浮点型）进行转换或直接计算，防止精度丢失。

---

## 2. MySQL 与 Drizzle ORM 数据类型精确映射表

| MySQL 数据类型 | Drizzle 列类型声明 | TypeScript 类型 | 转换与流转规范 |
| :--- | :--- | :--- | :--- |
| `int(11) unsigned` | `int().unsigned()` | `number` | 用于自增 ID、关联 UID 等，最大值 4,294,967,295，可安全使用 `number` |
| `tinyint(1) / tinyint(4)`| `tinyint()` | `number` | 用于状态标志（如 `is_admin`, `enable`）。使用 `number` (0 或 1) 进行流转，避免转为 `boolean` 导致旧数据匹配失败 |
| `bigint(20)` | `bigint({ mode: 'bigint' })` | `bigint` | 流量字段（`u`, `d`, `transfer_enable`）。原生 `bigint` 无法直接进行 JSON 序列化，需特殊处理 |
| `decimal(12,2)` | `decimal({ precision: 12, scale: 2 })` | `string` (转 `Decimal`) | 财务余额字段。从数据库读取后为 `string`，计算时转换为 `decimal.js` 实例，回写时转为 `string` |
| `varchar(N)` | `varchar({ length: N })` | `string` | 字符型，无特殊处理 |
| `text` | `text()` | `string` | 文本型，无特殊处理 |
| `datetime` | `datetime()` | `Date` | 包含日期与时间的完整字段类型，支持自动时区转换 |

---

## 3. BigInt 流量字段处理规范

在 VPN/Proxy 系统中，流量以字节（Byte）为单位进行累计。`bigint(20)` 能够存储最大为 `9,223,372,036,854,775,807` 字节（约 8EB）的流量。

### 3.1 序列化难题
JavaScript 的 `JSON.stringify()` 默认不支持 `bigint` 类型，直接序列化会抛出 `TypeError: Do not know how to serialize a BigInt` 异常。

### 3.2 解决方案
1. **读取与入库**：在 `db/schema.ts` 中声明 `mode: 'bigint'`，确保查询和更新均采用 TS 原生 `bigint` 类型以保证计算速度。
2. **ElysiaJS 全局序列化拦截**：在 API 响应序列化阶段，全局将 `bigint` 自动转换为 `string` 输出给前端，或在前端请求体解析时兼容字符串格式的 `bigint` 转换。

```typescript
// 统一的全局序列化处理 (在 src/index.ts 中)
const app = new Elysia()
  .mapResponse(({ response }) => {
    if (response instanceof Response) return response;
    
    // 递归查找响应中的 BigInt 并转换为 String
    const serializeBigInt = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj === 'bigint') return obj.toString();
      if (Array.isArray(obj)) return obj.map(serializeBigInt);
      if (typeof obj === 'object') {
        const newObj: any = {};
        for (const key in obj) {
          newObj[key] = serializeBigInt(obj[key]);
        }
        return newObj;
      }
      return obj;
    };

    return new Response(JSON.stringify(serializeBigInt(response)), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  });
```

---

## 4. Decimal 高精度财务计算与边界

用户的金额 `user.money` 在 MySQL 中以 `decimal(12,2)` 存储。
JavaScript 的原生 `number` 采用双精度 IEEE 754 浮点数，在进行 `0.1 + 0.2` 等金钱运算时，会产生诸如 `0.30000000000000004` 的精度偏差。**在财务系统中这是绝对不允许的**。

### 4.1 技术选型：`decimal.js`
统一引入 `decimal.js` 库作为系统内金钱运算的唯一数学引擎。

### 4.2 计算与更新流转规范
*   **计算前转换**：从 Drizzle 读出的余额 `money` 为 `string` 类型，立即实例化为 `new Decimal(money)`。
*   **计算过程**：只允许调用 `decimal.js` 的链式运算函数（`plus`, `minus`, `times`, `div`），禁止将其转回原生 number。
*   **写入数据库**：回写时，使用 `.toFixed(2)` 格式化为两位小数的 `string` 写入。

```typescript
import { Decimal } from 'decimal.js';

// 购买套餐扣费逻辑示例
export async function processPurchase(user: typeof userTable.$inferSelect, packagePrice: string) {
  const currentBalance = new Decimal(user.money);
  const price = new Decimal(packagePrice);

  if (currentBalance.lessThan(price)) {
    throw new Error('余额不足');
  }

  // 扣减金额并格式化为 12,2 的字符串
  const newBalanceStr = currentBalance.minus(price).toFixed(2);

  // 更新数据库
  await db.update(userTable)
    .set({ money: newBalanceStr })
    .where(eq(userTable.id, user.id));
}
```

---

## 5. 时区与日期时间处理机制

旧版 SPanel 使用 PHP 的默认时区（通常设为 `PRC` 即 `Asia/Shanghai`），并将时间戳以 `int(11)` 或 `datetime` 写入 MySQL。

### 5.1 时区统一规范
1. **后端运行时时区**：Bun 运行时启动时，通过环境变量强制指定时区为东八区：
   `TZ=Asia/Shanghai bun run src/index.ts`
2. **Drizzle 日期映射**：
   * 原数据库中的 Unix 时间戳字段（`int(11)`，如 `last_checkin_time`, `reg_date`），Drizzle 中直接映射为 `int`，读取后使用 `new Date(val * 1000)` 进行格式化。
   * 原数据库中的 `datetime` 字段，Drizzle 中声明为 `datetime({ mode: 'date' })`。Drizzle 会自动处理时区偏移，将其转化为 TS 的 `Date` 对象。

---

## 6. MySQL 5.6 生产环境兼容性红线

> [!WARNING]
> **生产环境核心约束**：本项目重构后的 SPanel-bun 将与现存的 PHP 7.4 (Slim 3.x) 实例**共享并共用同一个 MySQL 5.6 数据库**。这带来了极严苛的向下兼容性限制，在编写 Drizzle ORM Schema 和执行查询时，必须无条件遵守以下技术红线：

### 6.1 禁用原生的 JSON 字段类型
*   **兼容性背景**：MySQL 5.6 **不支持** 原生的 `JSON` 数据类型（该类型在 MySQL 5.7.8 中才被引入）。
*   **重构限制**：
    *   在 `src/db/schema.ts` 中声明字段时，**严禁**使用 Drizzle 的 `json()` 或 `jsonb()` 字段类型。
    *   所有包含 JSON 文本的列（如节点配置 `ss_node.customConfig` 字段），在 Drizzle 中必须声明为 `text()` 或 `varchar()`，在业务逻辑层（TS）进行手动的 `JSON.parse()` 与 `JSON.stringify()`，保持底层的纯文本兼容。

### 6.2 唯一索引的 767 字节限制与字符集
*   **兼容性背景**：在 MySQL 5.6 下使用 `utf8mb4` 字符集时，如果 `innodb_large_prefix` 参数未启用，唯一索引或主键索引的最大键长度被严格限制为 **767 字节**。
*   **重构限制**：
    *   因为 `utf8mb4` 中每个字符最多占用 4 字节，故带有唯一约束（`unique()`）的列，其定义长度不得超过 `191`（191 * 4 = 764 字节）。
    *   如果旧版数据库表中的 `email` 或其他唯一索引列使用了 `varchar(255)` 并启用了 `utf8mb4`，而生产环境由于兼容限制未开启大索引前缀支持，这可能引发 `Specified key was too long; max key length is 767 bytes` 报错。Drizzle 字段长度必须与 legacy schema 物理长度精确一致，开发人员切勿擅自调大任何 unique 索引列的长度。

### 6.3 Datetime 列默认值与零日期兼容性
*   **兼容性背景**：MySQL 5.6 支持 `datetime` 的 `DEFAULT CURRENT_TIMESTAMP`，但如果 strict mode (如 `NO_ZERO_DATE`, `NO_ZERO_IN_DATE`) 开启，则无法写入 `0000-00-00 00:00:00`。
*   **重构限制**：
    *   SPanel 历史遗留字段的默认空时间常设为 `1989-06-04 00:00:00`，Drizzle schema 的 `defaultFn()` 必须精准沿用此默认时间字符串，绝对不能为了简便而在 schema 中改为 `0000-00-00`，以防部分 strict mode 开启的 MySQL 5.6 宿主机抛出语法或数据截断异常。

### 6.4 严禁使用 Drizzle-Kit 对生产库进行 Schema 结构修改
*   **兼容性背景**：因为生产环境数据库同时被 legacy PHP 使用，任何 Drizzle 自动生成的 Schema 修改（如列改名、新约束、索引格式变化）都有可能导致旧版 PHP 程序彻底罢工。
*   **重构限制**：
    *   **禁止**对生产库运行 `drizzle-kit push` 或 `drizzle-kit migrate`。
    *   SPanel-bun 仅作为该共享 MySQL 5.6 数据库的**只读/只写客户端角色**，其 schema 文件仅用于 ORM 进行类型推导和安全查询，不得用于控制或修改底层的物理表结构。

---

## 7. Drizzle Schema 核心表结构代码示例

在 `src/db/schema.ts` 中定义的 SPanel 原生表字段映射标准：

```typescript
import { mysqlTable, serial, int, varchar, bigint, decimal, tinyint, text, datetime } from 'drizzle-orm/mysql-core';

// 1. 用户表映射 (完美对齐旧版 user 表)
export const userTable = mysqlTable('user', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 32 }).notNull().unique(),
  password: varchar('pass', { length: 256 }).notNull(),
  money: decimal('money', { precision: 12, scale: 2 }).default('0.00').notNull(),
  
  // 流量计数器采用 bigint 存储字节
  u: bigint('u', { mode: 'bigint' }).default(0n).notNull(),
  d: bigint('d', { mode: 'bigint' }).default(0n).notNull(),
  transferEnable: bigint('transfer_enable', { mode: 'bigint' }).default(0n).notNull(),
  
  // 节点分组控制
  nodeGroup: int('node_group').default(0).notNull(),
  class: int('class').default(0).notNull(),
  classExpire: datetime('class_expire').defaultFn(() => new Date('1989-06-04 00:00:00')).notNull(),
  
  // 状态属性
  enable: tinyint('enable').default(1).notNull(),
  isAdmin: tinyint('is_admin').default(0).notNull(),
  
  // 签到与安全信息
  lastCheckinTime: int('last_checkin_time').default(0).notNull(),
  gaToken: varchar('ga_token', { length: 128 }).default('').notNull(),
  gaEnable: tinyint('ga_enable').default(0).notNull(),
  
  // 订阅相关 Token
  uuid: varchar('uuid', { length: 36 }).notNull(),
  theme: varchar('theme', { length: 32 }).default('default').notNull(),
});

// 2. 节点表映射
export const nodeTable = mysqlTable('ss_node', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 128 }).notNull(),
  server: varchar('server', { length: 128 }).notNull(),
  method: varchar('method', { length: 64 }).notNull(),
  customConfig: text('custom_config').notNull(),
  
  // 权限验证
  nodeGroup: int('node_group').default(0).notNull(),
  nodeClass: int('node_class').default(0).notNull(),
  nodeConnector: int('node_connector').default(0).notNull(),
  
  // 流量比例 (如 1.0, 0.5)
  trafficRate: decimal('traffic_rate', { precision: 5, scale: 2 }).default('1.00').notNull(),
  
  // 运行状态
  status: varchar('status', { length: 128 }).default('').notNull(),
  info: varchar('info', { length: 128 }).default('').notNull(),
});
```
