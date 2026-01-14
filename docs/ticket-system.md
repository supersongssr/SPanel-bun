# 工单系统文档 (Ticket System)

## 概述

工单系统是用户与管理员之间沟通的重要渠道，支持提交问题、回复对话和状态管理。

## 核心特性

- ✅ **对话流式展示**: 工单及其回复以对话形式呈现
- ✅ **状态管理**: 支持开启/关闭工单
- ✅ **实时更新**: 回复后自动重新打开已关闭的工单
- ✅ **权限分离**: 用户只能访问自己的工单，管理员可访问所有工单
- ✅ **分页列表**: 高效的工单列表查询

## 数据库结构

### ticket 表（工单表）

```prisma
model ticket {
  id       BigInt @id @default(autoincrement())
  title    String @db.LongText        // 工单标题
  content  String @db.LongText        // 工单内容
  rootid   BigInt                     // 父工单ID（0=主工单，>0=回复）
  userid   BigInt                     // 用户ID
  sort     Int?    @default(0)        // 排序（暂未使用）
  datetime BigInt                     // 创建时间（Unix时间戳）
  status   Int     @default(1)        // 状态：1=开启，0=关闭
}
```

**数据结构说明:**

- **主工单**: `rootid = 0`，代表一个新工单
- **回复**: `rootid > 0`，指向主工单的 ID
- **对话链**: 通过 `rootid` 关联主工单及其所有回复

**示例数据:**

```
ticket表:
├── id=1, rootid=0, title="无法连接", status=1  // 主工单
├── id=2, rootid=1, title="无法连接", content="我遇到问题..."  // 用户回复
└── id=3, rootid=1, title="无法连接", content="请检查配置..."  // 管理员回复
```

## API 接口文档

### 用户端 API

#### 1. 获取工单列表

**接口:** `GET /api/user/tickets`

**认证:** Bearer Token（JWT）

**查询参数:**

- `page`: 页码（默认：1）
- `pageSize`: 每页数量（默认：20，最大：100）
- `status`: 状态筛选（可选：`open`/`closed`）

**返回示例:**

```json
{
  "tickets": [
    {
      "id": 1,
      "title": "无法连接节点",
      "content": "我无法连接到香港节点...",
      "status": true,
      "datetime": "2024-01-14T10:00:00.000Z",
      "lastMessage": "请检查您的配置",
      "lastMessageTime": "2024-01-14T12:00:00.000Z",
      "replyCount": 3
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

#### 2. 获取工单详情及对话历史

**接口:** `GET /api/user/tickets/:id`

**认证:** Bearer Token（JWT）

**返回示例:**

```json
{
  "ticket": {
    "id": 1,
    "title": "无法连接节点",
    "status": true,
    "datetime": "2024-01-14T10:00:00.000Z"
  },
  "messages": [
    {
      "id": 1,
      "userid": 123,
      "content": "我无法连接到香港节点...",
      "datetime": "2024-01-14T10:00:00.000Z",
      "isAdmin": false
    },
    {
      "id": 2,
      "userid": 1,
      "content": "请提供您的节点日志",
      "datetime": "2024-01-14T10:30:00.000Z",
      "isAdmin": true
    },
    {
      "id": 3,
      "userid": 123,
      "content": "日志如下...",
      "datetime": "2024-01-14T11:00:00.000Z",
      "isAdmin": false
    }
  ]
}
```

**字段说明:**

- `isAdmin`: `true` 表示该消息由管理员发送，`false` 表示由用户发送

#### 3. 创建新工单

**接口:** `POST /api/user/tickets`

**认证:** Bearer Token（JWT）

**请求体:**

```json
{
  "title": "无法连接节点",
  "content": "我无法连接到香港节点，错误代码XXX"
}
```

**返回示例:**

```json
{
  "message": "Ticket created successfully",
  "ticket": {
    "id": 1,
    "title": "无法连接节点",
    "status": true
  }
}
```

#### 4. 回复工单

**接口:** `POST /api/user/tickets/:id/reply`

**认证:** Bearer Token（JWT）

**请求体:**

```json
{
  "content": "这是我的回复内容"
}
```

**逻辑说明:**

- 回复作为新记录插入（`rootid = 主工单ID`）
- 如果工单已关闭，回复后自动重新打开

**返回示例:**

```json
{
  "message": "Reply added successfully"
}
```

#### 5. 关闭工单

**接口:** `POST /api/user/tickets/:id/close`

**认证:** Bearer Token（JWT）

**说明:** 用户可关闭自己的工单，但管理员可重新打开

**返回示例:**

```json
{
  "message": "Ticket closed successfully"
}
```

### 管理员 API

#### 1. 获取所有工单（管理员）

**接口:** `GET /api/admin/tickets`

**认证:** Bearer Token（需要管理员权限）

**查询参数:**

- `page`: 页码（默认：1）
- `pageSize`: 每页数量（默认：20，最大：100）
- `status`: 状态筛选（可选：`open`/`closed`）

**返回示例:**

```json
{
  "tickets": [
    {
      "id": 1,
      "title": "无法连接节点",
      "content": "我无法连接到香港节点...",
      "status": true,
      "datetime": "2024-01-14T10:00:00.000Z",
      "user": {
        "id": 123,
        "email": "user@example.com",
        "user_name": "testuser"
      },
      "lastMessageTime": "2024-01-14T12:00:00.000Z",
      "replyCount": 3
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

#### 2. 获取工单详情（管理员）

**接口:** `GET /api/admin/tickets/:id`

**认证:** Bearer Token（需要管理员权限）

**返回格式:** 与用户端相同，但包含 `user` 信息

#### 3. 回复工单（管理员）

**接口:** `POST /api/admin/tickets/:id/reply`

**认证:** Bearer Token（需要管理员权限）

**请求体:**

```json
{
  "content": "这是管理员的回复",
  "status": true  // 可选：同时更新工单状态
}
```

**字段说明:**

- `content`: 回复内容（必需）
- `status`: 工单状态（可选）- `true` 开启，`false` 关闭

**返回示例:**

```json
{
  "message": "Reply added successfully"
}
```

#### 4. 更新工单状态（管理员）

**接口:** `POST /api/admin/tickets/:id/status`

**认证:** Bearer Token（需要管理员权限）

**请求体:**

```json
{
  "status": false
}
```

**返回示例:**

```json
{
  "message": "Ticket closed successfully"
}
```

## 前端页面设计

### 用户工单页面

**文件:** `frontend/src/pages/user/ticket.vue`

**功能模块:**

1. **工单列表**:
   - 显示工单标题、最后消息、时间、回复数量
   - 状态标签（开启/关闭）
   - 点击进入详情

2. **工单详情**:
   - 对话流式展示（类似聊天界面）
   - 区分用户/管理员消息（左右对齐）
   - 快速回复输入框
   - 关闭工单按钮

**UI 布局:**

```
┌─────────────────────────────────────┐
│  我的工单              [新建工单]   │
├─────────────────────────────────────┤
│  工单1                [开启] 最后消息│
│  工单2                [关闭] 最后消息│
└─────────────────────────────────────┘
```

**详情页对话流:**

```
┌─────────────────────────────────────┐
│  工单：无法连接节点        [关闭]   │
├─────────────────────────────────────┤
│  2024-01-14 10:00                  │
│  用户: 我无法连接...    [右对齐]   │
│                                     │
│  2024-01-14 10:30                  │
│  管理员: 请检查配置...  [左对齐]   │
│                                     │
│  ┌─────────────────────────────┐  │
│  │ 输入回复内容...      [发送] │  │
│  └─────────────────────────────┘  │
└─────────────────────────────────────┘
```

### 管理员工单页面

**文件:** `frontend/src/pages/admin/tickets.vue`

**功能模块:**

1. **工单列表**:
   - 显示所有用户的工单
   - 显示用户信息（邮箱/用户名）
   - 待处理工单优先显示

2. **工单详情**:
   - 完整对话历史
   - 回复并可选关闭工单
   - 快捷操作（回复后关闭）

## 业务逻辑

### 创建工单

```typescript
// 1. 验证用户身份
const userId = BigInt(payload.userId)

// 2. 创建主工单
const now = BigInt(Math.floor(Date.now() / 1000))
const ticket = await prisma.ticket.create({
  data: {
    userid: userId,
    title: data.title,
    content: data.content,
    rootid: BigInt(0),  // 主工单标记
    datetime: now,
    status: 1,          // 默认开启
  },
})
```

### 回复工单

```typescript
// 1. 查找主工单
const mainTicket = await prisma.ticket.findFirst({
  where: {
    id: ticketId,
    rootid: BigInt(0),
  },
})

// 2. 创建回复（新记录）
await prisma.ticket.create({
  data: {
    userid: userId,
    title: mainTicket.title,  // 继承标题
    content: data.content,
    rootid: ticketId,         // 指向主工单
    datetime: now,
    status: 1,
  },
})

// 3. 如果主工单已关闭，重新打开
if (mainTicket.status === 0) {
  await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: 1 },
  })
}
```

### 关闭工单

```typescript
await prisma.ticket.update({
  where: { id: ticketId },
  data: { status: 0 },
})
```

### 查询对话历史

```typescript
// 1. 获取主工单
const mainTicket = await prisma.ticket.findFirst({
  where: { id: ticketId, rootid: BigInt(0) },
})

// 2. 获取所有回复
const replies = await prisma.ticket.findMany({
  where: { rootid: ticketId },
  orderBy: { datetime: 'asc' },
})

// 3. 组合对话链
const messages = [
  {
    id: mainTicket.id,
    userid: mainTicket.userid,
    content: mainTicket.content,
    datetime: mainTicket.datetime,
    isAdmin: false,
  },
  ...replies.map((reply) => ({
    id: reply.id,
    userid: reply.userid,
    content: reply.content,
    datetime: reply.datetime,
    isAdmin: reply.userid !== mainTicket.userid,
  })),
]
```

## 安全机制

### 1. 权限控制

**用户端:**
- 只能查询自己的工单（`userid = 当前用户ID`）
- 只能操作自己的工单

**管理员端:**
- 可查询所有工单
- 可回复所有工单
- 可修改工单状态

```typescript
// 用户端权限检查
const ticket = await prisma.ticket.findFirst({
  where: {
    id: ticketId,
    userid: userId,  // 强制匹配用户ID
  },
})

if (!ticket) {
  set.status = 404
  return { error: 'Not Found' }
}
```

### 2. 内容验证

```typescript
// 标题长度限制
if (data.title.length > 200) {
  set.status = 400
  return { error: 'Title too long' }
}

// 内容非空检查
if (!data.content || data.content.trim().length === 0) {
  set.status = 400
  return { error: 'Content is required' }
}
```

### 3. 防止恶意操作

- **速率限制**: 限制用户创建工单的频率（可选）
- **XSS 防护**: 前端显示时转义 HTML 特殊字符
- **SQL 注入防护**: 使用 Prisma ORM 自动防护

## 扩展功能建议

### 1. 工单分类

```typescript
model ticket {
  // ...
  category Int     @default(0)  // 0=其他, 1=连接问题, 2=计费, 3=账户
}
```

### 2. 优先级

```typescript
model ticket {
  // ...
  priority Int     @default(0)  // 0=低, 1=中, 2=高, 3=紧急
}
```

### 3. 附件支持

```typescript
model ticket_attachment {
  id       BigInt  @id @default(autoincrement())
  ticketid BigInt
  filename String
  url      String
}
```

### 4. 通知系统

- 用户回复时通知管理员
- 管理员回复时通知用户
- 邮件/短信通知

### 5. 工单模板

```typescript
const TICKET_TEMPLATES = {
  connection: {
    title: "连接问题",
    content: "请描述您遇到的连接问题，包括：\n1. 节点名称\n2. 错误信息\n3. 客户端类型",
  },
  billing: {
    title: "计费问题",
    content: "请提供订单号和问题描述...",
  },
}
```

## 故障排查

### 问题1: 回复不显示

**原因:** `rootid` 关联错误

**解决方案:**
```sql
-- 检查回复是否正确关联主工单
SELECT * FROM ticket WHERE rootid = <主工单ID>;
```

### 问题2: 工单状态不更新

**原因:** 只更新了回复记录的状态，未更新主工单

**解决方案:**
```typescript
// 确保同时更新主工单状态
await prisma.ticket.update({
  where: { id: mainTicketId },
  data: { status: 0 },
})
```

### 问题3: 权限绕过

**原因:** 未正确检查 `userid`

**解决方案:**
```typescript
// 始终在查询中包含用户ID
where: {
  id: ticketId,
  userid: userId,  // 必须匹配
}
```

## 总结

工单系统实现了:

- ✅ 用户/管理员完整的工单管理
- ✅ 对话流式展示
- ✅ 状态管理（开启/关闭）
- ✅ 回复后自动重新打开
- ✅ 权限分离与安全控制
- ✅ 分页查询优化

**适用场景:**

- 客服支持系统
- 用户问题反馈
- 技术支持工单

---

**文档版本:** v1.0.0
**最后更新:** 2026-01-14
**作者:** Claude Code
**许可:** MIT License
