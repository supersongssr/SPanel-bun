# SPanel-bun 系统初始化配置与种子数据生成指南

为了支持系统的高效初始化部署及本地开发调试，SPanel-bun 提供了一套现代化的 CLI 迁移与种子数据填充方案。本方案用以指导开发人员对数据库进行表结构应用、默认全局设置填充以及超级管理员账号的一键创建。

---

## 目录
1. [初始化工作流](#1-初始化工作流)
2. [第一步：表结构迁移 (Drizzle Kit Migration)](#2-第一步表结构迁移-drizzle-kit-migration)
3. [第二步：全局配置填充 (Database Seeding)](#3-第二步全局配置填充-database-seeding)
4. [第三步：超级管理员账户创建 (CLI Command)](#4-第三步超级管理员账户创建-cli-command)
5. [常见问题与恢复手段](#5-常见问题与恢复手段)

---

## 1. 初始化工作流

当系统部署或进入新开发环境时，初始化的顺序如下所示：

```text
[ 新建 MySQL 数据库 ] 
        │
        ▼ (执行 Drizzle Kit db push 或 migration)
[ 生成数据表结构 ] 
        │
        ▼ (运行 TS 种子填充脚本 bun run src/db/seed.ts)
[ 灌入默认全局系统变量 (sp_config) ] 
        │
        ▼ (调用 CLI 命令 bun run src/cli.ts createAdmin)
[ 交互式创建第一个超级管理员账户 ]
```

---

## 2. 第一步：表结构迁移 (Drizzle Kit Migration)

对于本地开发调试环境或新起的空数据库环境，Drizzle 提供极其高效的 `push` 命令，可以直接将代码中定义的 schema 同步给 MySQL 数据库：

```bash
# 本地开发环境一键同步 Schema
npx drizzle-kit push
```

> [!CAUTION]
> **生产环境（MySQL 5.6 共享数据库）核心红线警告**：
> - 生产环境数据库为 **MySQL 5.6**，且正由现存的旧版 SPanel (Slim/PHP) 面板实例运行并共用。
> - **严禁在生产环境执行 `npx drizzle-kit push` 或 `npx drizzle-kit migrate`！** 
> - 任何通过 Drizzle 自动推送的数据表修改、约束增加或列变更，都有可能造成旧版 PHP 程序由于语法报错、行级或表级锁死而彻底不可用，进而造成灾难性事故。
> - 在生产部署时，SPanel-bun 仅作为该物理数据库的客户端，应**直接使用现存的物理表结构**。如果需要添加辅助索引，应先与旧版 PHP 实例进行 SQL 语句审计与兼容性确认后，由数据库管理员手动进行 `ALTER TABLE` 操作。

---

## 3. 第二步：全局配置填充 (Database Seeding)

SPanel 的运行高度依赖于 `sp_config` 表（该表存储了如：网站名称、节点通讯密钥、签到获取流量上下限、支付网关密钥等系统核心配置）。

### 3.1 种子文件设计 (`src/db/seed.ts`)
创建一个原生的 TypeScript 种子脚本，通过 Drizzle ORM 向 `sp_config` 中插入 SPanel 运行的全部默认基础值。

```typescript
import { db } from '../config/database';
import { mysqlTable, varchar, text } from 'drizzle-orm/mysql-core';

// 声明 sp_config 临时结构
const spConfig = mysqlTable('sp_config', {
  key: varchar('key', { length: 128 }).primaryKey(),
  value: text('value').notNull(),
});

const defaultConfigs = [
  // 基础网站信息
  { key: 'appName', value: 'SPanel-bun 代理中心' },
  { key: 'baseUrl', value: 'http://localhost' },
  { key: 'muKey', value: 'default_highly_secure_mu_key_123456' }, // 默认节点通信密钥
  
  // 用户初始赠送与限制设置
  { key: 'reg_auto_bytes', value: '1073741824' }, // 新注册赠送 1GB 流量 (字节存储)
  { key: 'reg_auto_class', value: '0' },
  { key: 'reg_auto_class_expire', value: '24' }, // 等级默认有效 24 小时
  
  // 签到设置
  { key: 'sign_min_grb', value: '10' }, // 签到最小获取 10MB
  { key: 'sign_max_grb', value: '50' }, // 签到最大获取 50MB
  
  // 安全防护
  { key: 'pow_difficulty', value: '3' }, // 默认 POW 难度前导零个数
  { key: 'redis_rate_limit_enabled', value: '1' },
];

async function seed() {
  console.log('🌱 正在向 MySQL 灌入系统初始化种子配置数据...');
  
  for (const config of defaultConfigs) {
    await db.insert(spConfig)
      .values(config)
      .onDuplicateKeyUpdate({
        set: { value: config.value }
      });
  }
  
  console.log('✅ 系统核心 sp_config 种子数据配置导入完毕！');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ 种子数据导入失败：', err);
  process.exit(1);
});
```

### 3.2 运行种子脚本
在控制台中使用 Bun 直接执行：
```bash
bun run src/db/seed.ts
```

---

## 4. 第三步：超级管理员账户创建 (CLI Command)

为了安全并免去手动在数据库中添加用户标志的繁琐，SPanel-bun 的 `cli.ts` 模块提供了一个交互式命令 `createAdmin`。

### 4.1 CLI 命令代码实现 (`src/commands/createAdmin.ts`)
该命令读取控制台输入，并利用 `Bun.password` 安全散列算法保存密码，最后将其标记为超级管理员。

```typescript
import { input, password as getPassword } from '@clack/prompts';
import { db } from '../config/database';
import { userTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export async function createAdminCommand() {
  console.log('🛠️ SPanel-bun 交互式超级管理员创建器\n');

  const email = await input({
    message: '请输入管理员登录邮箱：',
    validate: (value) => {
      if (!value.includes('@')) return '请输入合法的邮箱格式！';
    }
  });
  
  if (typeof email === 'symbol') return;

  const rawPassword = await getPassword({
    message: '请输入管理员登录密码：',
    mask: '*'
  });

  if (typeof rawPassword === 'symbol') return;

  // 1. 利用 Bun 原生 Bcrypt 加密密码
  const hashedPassword = await Bun.password.hash(rawPassword, {
    algorithm: 'bcrypt',
    cost: 10
  });

  // 2. 检查是否已经存在该邮箱
  const existingUser = await db.select().from(userTable).where(eq(userTable.email, email)).limit(1);
  if (existingUser.length > 0) {
    console.error('❌ 错误：该邮箱已在数据库中注册，无法重复创建管理员账户！');
    return;
  }

  // 3. 灌入核心管理员账户 (初始赠送 100GB 流量)
  const uuid = crypto.randomUUID();
  await db.insert(userTable).values({
    email,
    password: hashedPassword,
    money: '9999.00',
    u: 0n,
    d: 0n,
    transferEnable: 107374182400n, // 100GB in bigint bytes
    enable: 1,
    isAdmin: 1, // 核心管理员标记位
    class: 1,
    uuid,
  });

  console.log('\n🎉 ==============================================');
  console.log('✅ 超级管理员账号创建成功！');
  console.log(`📧 登录账号: ${email}`);
  console.log(`🔑 初始状态: 已激活 + class 1 等级权限`);
  console.log('==================================================');
}
```

### 4.2 运行 CLI 命令
```bash
bun run src/cli.ts createAdmin
```

---

## 5. 常见问题与恢复手段

*   **问题：运行迁移时提示 Drizzle 与现有 MySQL 版本不兼容**
    *   *解答*：SPanel 旧库可能部署在较旧版本的 MySQL (5.6/5.7) 或早期 MariaDB 上。请在 `drizzle.config.ts` 中将 `dialect` 指定为 `mysql` 并调整 `mysql2` 连接驱动池参数，降低批量更新连接池的最高并发限制以避免锁表。
*   **问题：想要重置所有系统配置，但保留用户数据**
    *   *解答*：直接执行 `bun run src/db/seed.ts`，脚本中使用了 `onDuplicateKeyUpdate` 语句，它会安全覆盖全局配置参数，但完全不会污染 `user` 表、`bought` 表及核心订单财务数据。
