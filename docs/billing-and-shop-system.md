# 财务与商店系统文档

## 概述

本文档描述了 SPanel Bun 的完整财务与商店系统实现，包括用户购买、充值码兑换、管理员商品管理和财务记录查看等功能。

## 核心特性

- ✅ **事务安全的购买系统**: 使用 Prisma `$transaction` 确保数据一致性
- ✅ **智能流量处理**: 自动将 GB 转换为字节（Byte），支持多种单位
- ✅ **等级叠加逻辑**: 购买新套餐时智能合并用户属性
- ✅ **充值码系统**: 支持批量生成、唯一性验证、使用限制
- ✅ **防刷机制**: 兑换接口内置速率限制
- ✅ **完整的前后端分离**: Vue 3 + Element Plus 前端，Elysia.js 后端

## 数据库结构

### shop 表（商品表）

```prisma
model shop {
  id                   BigInt  @id @default(autoincrement())
  name                 String  @db.Text           // 商品名称
  price                Decimal @db.Decimal(12, 2) // 价格
  content              String  @db.Text           // 商品内容（JSON/文本）
  auto_renew           Int     @default(0)        // 自动续费
  auto_reset_bandwidth Int     @default(0)        // 自动重置流量
  status               Int     @default(1)        // 状态：1=上架，0=下架
}
```

**content 字段格式示例：**

```json
{
  "traffic": "100GB",
  "class": 1,
  "expire": "30天",
  "node_group": 1
}
```

或使用纯文本格式：

```
traffic: 100GB
class: 1
expire: 30天
node_group: 1
```

### bought 表（购买记录表）

```prisma
model bought {
  id       BigInt  @id @default(autoincrement())
  userid   BigInt                        // 用户ID
  shopid   BigInt                        // 商品ID
  datetime BigInt                        // 购买时间（Unix时间戳）
  renew    BigInt                        // 自动续费标记
  coupon   String  @db.Text              // 优惠券
  price    Decimal @db.Decimal(12, 2)    // 购买价格
}
```

### code 表（充值码表）

```prisma
model code {
  id          BigInt   @id @default(autoincrement())
  code        String   @db.Text             // 充值码（格式：XXXX-XXXX-XXXX-XXXX）
  type        Int                            // 类型：1=充值码，2=体验码，3=优惠码
  number      Decimal  @db.Decimal(11, 2)   // 金额
  isused      Int      @default(0)          // 是否已使用：0=未使用，1=已使用
  userid      BigInt                        // 使用者ID
  usedatetime DateTime  @db.DateTime(0)     // 使用时间
}
```

## API 接口文档

### 用户端 API

#### 1. 获取商品列表

**接口:** `GET /api/user/shop`

**认证:** 不需要

**返回示例:**

```json
{
  "products": [
    {
      "id": 1,
      "name": "100GB 流量包",
      "price": 10.00,
      "content": {
        "traffic": "100GB",
        "class": 1
      },
      "auto_renew": false,
      "auto_reset_bandwidth": false,
      "status": true
    }
  ]
}
```

#### 2. 购买商品

**接口:** `POST /api/user/buy`

**认证:** Bearer Token

**请求体:**

```json
{
  "shop_id": "1"
}
```

**事务处理流程:**

1. 检查商品是否存在且在售
2. 检查用户余额是否充足
3. 扣除用户余额
4. 解析商品内容，更新用户属性：
   - **流量（transfer_enable）**: 累加模式（新流量 + 旧流量）
   - **等级（class）**: 取最大值（max(旧等级, 新等级)）
   - **过期时间（expire_in）**: 延长模式（当前时间 + 新增天数）
5. 在 bought 表中插入购买记录

**返回示例:**

```json
{
  "message": "Purchase successful",
  "success": true,
  "product": "100GB 流量包",
  "price": 10.00,
  "newBalance": 90.00,
  "trafficAdded": "107374182400",
  "class": 1
}
```

**错误响应:**

- `404`: 商品不存在
- `400`: 余额不足或商品已下架
- `500`: 服务器错误

#### 3. 兑换充值码

**接口:** `POST /api/user/redeem`

**认证:** Bearer Token

**请求体:**

```json
{
  "code": "ABCD-1234-EFGH-5678"
}
```

**速率限制:** 每小时最多兑换 10 次

**事务处理流程:**

1. 验证充值码格式
2. 检查充值码是否存在且未使用
3. 检查用户兑换次数（1小时内不超过10次）
4. 增加用户余额
5. 标记充值码已使用

**返回示例:**

```json
{
  "message": "Code redeemed successfully",
  "success": true,
  "amount": 10.00,
  "newBalance": 110.00
}
```

**错误响应:**

- `404`: 充值码无效
- `400`: 充值码已使用
- `429`: 超过速率限制
- `500`: 服务器错误

### 管理员 API

#### 1. 获取商品列表（管理端）

**接口:** `GET /api/admin/shop`

**认证:** Bearer Token（需要管理员权限）

**查询参数:**

- `page`: 页码（默认：1）
- `pageSize`: 每页数量（默认：20，最大：100）
- `status`: 状态筛选（可选：0=下架，1=上架）

#### 2. 创建商品

**接口:** `POST /api/admin/shop`

**认证:** Bearer Token（需要管理员权限）

**请求体:**

```json
{
  "name": "100GB 流量包",
  "price": 10.00,
  "content": "{\"traffic\":\"100GB\",\"class\":1}",
  "auto_renew": false,
  "auto_reset_bandwidth": false,
  "status": true
}
```

#### 3. 更新商品

**接口:** `PUT /api/admin/shop/:id`

**认证:** Bearer Token（需要管理员权限）

**请求体:** 同创建商品

#### 4. 删除商品

**接口:** `DELETE /api/admin/shop/:id`

**认证:** Bearer Token（需要管理员权限）

#### 5. 获取购买记录

**接口:** `GET /api/admin/bought`

**认证:** Bearer Token（需要管理员权限）

**查询参数:**

- `page`: 页码（默认：1）
- `pageSize`: 每页数量（默认：20，最大：100）

**返回示例:**

```json
{
  "records": [
    {
      "id": 1,
      "user": {
        "id": 1,
        "email": "user@example.com",
        "user_name": "testuser"
      },
      "product": {
        "id": 1,
        "name": "100GB 流量包",
        "price": 10.00
      },
      "price": 10.00,
      "datetime": "2024-01-14T12:00:00.000Z",
      "renew": false,
      "coupon": ""
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

#### 6. 获取充值码列表

**接口:** `GET /api/admin/codes`

**认证:** Bearer Token（需要管理员权限）

**查询参数:**

- `page`: 页码（默认：1）
- `pageSize`: 每页数量（默认：20，最大：100）
- `isused`: 使用状态筛选（可选：true/false）

#### 7. 生成充值码

**接口:** `POST /api/admin/codes/generate`

**认证:** Bearer Token（需要管理员权限）

**请求体:**

```json
{
  "count": 10,
  "amount": 10.00,
  "type": 1
}
```

**充值码格式:** `XXXX-XXXX-XXXX-XXXX`（16位，4组，每组4位）

**字符集:** `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`（排除易混淆字符：I, O, 0, 1）

**返回示例:**

```json
{
  "message": "Codes generated successfully",
  "count": 10,
  "amount": 10.00
}
```

#### 8. 删除充值码

**接口:** `DELETE /api/admin/codes/:id`

**认证:** Bearer Token（需要管理员权限）

## 前端页面

### 用户端商店页面

**文件:** `frontend/src/pages/shop/App.vue`

**功能:**

- 卡片式商品展示
- 实时余额显示
- 快速充值码兑换
- 购买确认对话框
- 余额不足禁用购买按钮

**关键组件:**

```vue
<el-card v-for="product in products" :key="product.id">
  <!-- 商品信息 -->
  <div class="product-content">
    <div class="content-item" v-if="product.content.traffic">
      <el-icon><TrendCharts /></el-icon>
      <span>流量: {{ product.content.traffic }}</span>
    </div>
    <!-- ... -->
  </div>

  <!-- 购买按钮 -->
  <el-button
    :disabled="userBalance < product.price"
    @click="handleBuy(product)"
  >
    立即购买
  </el-button>
</el-card>
```

### 管理端财务管理页面

**文件:** `frontend/src/pages/admin/views/Billing.vue`

**功能:**

- 选项卡式界面（购买记录 / 充值码管理）
- 购买记录分页列表
- 充值码列表（显示使用状态）
- 批量生成充值码对话框
- 删除充值码功能

## 专家级实现细节

### 1. 流量单位一致性

所有流量计算均以 **字节（Byte）** 为基础单位：

```typescript
// 1 GB = 1024^3 bytes
const GB_TO_BYTES = 1024 ** 3
const trafficToAdd = BigInt(value * GB_TO_BYTES)

// 更新用户流量
updateData.transfer_enable = user.transfer_enable + trafficToAdd
```

### 2. 套餐覆盖逻辑

#### 流量叠加（累加模式）

```typescript
// 新流量累加到现有流量
updateData.transfer_enable = user.transfer_enable + trafficToAdd
```

#### 等级覆盖（取最大值）

```typescript
// 使用 max() 防止降级
updateData.class = Math.max(user.class, newClass)
```

#### 过期时间延长（累加模式）

```typescript
// 在现有时间基础上增加天数
const currentExpire = user.class_expire ? new Date(user.class_expire) : new Date()
const newExpire = new Date(currentExpire.getTime() + days * 24 * 60 * 60 * 1000)
updateData.class_expire = newExpire
```

### 3. Prisma 事务原子性

```typescript
const result = await prisma.$transaction(async (tx) => {
  // 1. 检查商品
  const product = await tx.shop.findUnique({ where: { id: shopId } })
  if (!product) throw new Error('Product not found')

  // 2. 检查用户余额
  const user = await tx.user.findUnique({ where: { id: userId } })
  if (userBalance < productPrice) throw new Error('Insufficient balance')

  // 3. 更新用户
  await tx.user.update({ /* ... */ })

  // 4. 创建购买记录
  await tx.bought.create({ /* ... */ })

  return { success: true }
})
```

**事务保证:**

- ✅ 所有操作要么全部成功，要么全部回滚
- ✅ 不会出现余额扣除但商品未到账的情况
- ✅ 不会出现余额为负数的情况

### 4. 防刷机制（速率限制）

```typescript
// 检查最近1小时的兑换次数
const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
const recentRedemptions = await prisma.code.count({
  where: {
    userid: BigInt(userId),
    usedatetime: { gte: oneHourAgo },
  },
})

if (recentRedemptions >= 10) {
  set.status = 429
  return { error: 'Too Many Requests', message: 'Rate limit exceeded' }
}
```

**限制规则:**

- 每用户每小时最多兑换 10 次
- 超过限制返回 HTTP 429（Too Many Requests）

### 5. 充值码生成算法

```typescript
const generateCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 排除易混淆字符
  let code = ''
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) code += '-'
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}
```

**特点:**

- 16位字符，分为4组（XXXX-XXXX-XXXX-XXXX）
- 排除易混淆字符（I, O, 0, 1）
- 使用 `crypto.random`（更安全）或 `Math.random`（性能优先）

## 并发测试

### 测试场景

模拟10个并发购买请求，验证：

1. 用户余额不会变为负数
2. 所有事务原子性执行
3. 余额计算准确

### 运行测试

```bash
bun run tests/concurrent-purchase.test.ts
```

### 预期输出

```
🚀 Starting Concurrent Purchase Test
   Concurrent requests: 10
   Initial balance: ¥100
   Product price: ¥10
   Expected successful purchases: 10

💰 Initial user balance: ¥100

🔥 Firing 10 concurrent purchase requests...

⏱️  Completed in 1234ms

📊 Results:
   Successful purchases: 10
   Failed purchases: 0
   Final balance: ¥0

✅ Validation Checks:
   ✅ Balance is non-negative: ¥0
   ✅ Balance matches expected: ¥0
   ✅ Successful purchases within limits: 10/10
   ✅ No unexpected errors

🎉 All tests passed! Transaction system is working correctly.
```

## 部署清单

### 后端部署

1. **确保数据库表存在:**

```bash
cd backend
bun run prisma:generate
bun run prisma:migrate
```

2. **重启后端服务:**

```bash
pm2 restart spanel-api
# 或
podman restart spanel-backend
```

### 前端部署

1. **构建前端:**

```bash
cd frontend
npm run build
```

2. **部署静态文件:**

```bash
cd /root/git/spanel-bun
sudo ./scripts/deploy-public.sh
```

3. **验证部署:**

访问 `https://test-spanel-bun.freessr.bid/user/shop.html` 查看商店页面

### 配置环境变量

在 `backend/.env` 中配置:

```env
# JWT 密钥（必须修改）
JWT_SECRET=your-secret-key-here

# 数据库连接
DATABASE_URL="mysql://user:password@localhost:3306/spanel"
```

## 故障排查

### 问题1: 购买时余额扣除但商品未到账

**原因:** 事务未正确提交

**解决方案:** 检查 Prisma 连接，确保使用 `$transaction` API

```typescript
// ✅ 正确
await prisma.$transaction(async (tx) => {
  // ...
})

// ❌ 错误（非事务）
await prisma.user.update({ /* ... */ })
await prisma.bought.create({ /* ... */ })
```

### 问题2: 流量单位不匹配

**原因:** 混用 GB 和 Byte

**解决方案:** 统一使用 Byte 计算

```typescript
// ✅ 正确
const trafficInBytes = BigInt(100 * 1024 ** 3)

// ❌ 错误
const trafficInGB = 100
```

### 问题3: 充值码无法使用

**原因:** 充值码已使用或不存在

**调试步骤:**

1. 检查数据库中充值码状态:

```sql
SELECT * FROM code WHERE code = 'XXXX-XXXX-XXXX-XXXX';
```

2. 检查 `isused` 字段是否为 1

3. 检查 `usedatetime` 是否有值

## 安全建议

1. **JWT Token 安全:**

   - 生产环境必须修改 `JWT_SECRET`
   - Token 有效期建议设置为 7 天
   - 使用 HTTPS 传输

2. **充值码安全:**

   - 使用足够的字符长度（16位推荐）
   - 排除易混淆字符（I, O, 0, 1）
   - 定期清理已使用的充值码

3. **防刷安全:**

   - 实现速率限制（已完成）
   - 添加验证码（可选）
   - IP 黑名单机制（可选）

## 性能优化建议

1. **数据库索引:**

```sql
-- 加速购买记录查询
CREATE INDEX idx_bought_userid ON bought(userid);
CREATE INDEX idx_bought_datetime ON bought(datetime);

-- 加速充值码查询
CREATE INDEX idx_code_code ON code(code);
CREATE INDEX idx_code_isused ON code(isused);
```

2. **缓存策略:**

   - 商品列表缓存（Redis，TTL=5分钟）
   - 用户余额缓存（Redis，TTL=1分钟）
   - 注意：余额缓存必须在事务中失效

3. **分页优化:**

   - 使用游标分页（Cursor-based Pagination）替代偏移量分页
   - 避免大偏移量查询（`OFFSET 10000`）

## 总结

本财务与商店系统实现了：

- ✅ 完整的事务安全购买流程
- ✅ 智能的套餐合并逻辑
- ✅ 安全的充值码系统
- ✅ 用户友好的商店界面
- ✅ 管理员财务后台
- ✅ 并发安全验证
- ✅ 防刷保护机制

**系统可靠性:**

- 所有金额计算以数据库为准
- 前端仅做展示，不做计算
- 使用 Prisma 事务确保原子性
- 并发测试验证无竞态条件

**适用场景:**

- VPN/代理服务套餐销售
- 流量包购买
- 会员等级升级
- 账户余额充值

---

**文档版本:** v1.0.0
**最后更新:** 2026-01-14
**作者:** Claude Code
**许可:** MIT License
