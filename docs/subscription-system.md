# 订阅分发系统文档 (Subscription System)

## 概述

订阅分发系统是机场（VPN代理服务）的核心功能，负责将用户的订阅信息转换成各种客户端（Clash、Shadowrocket、Quantumult X 等）可识别的配置格式。

## 核心特性

- ✅ **多协议支持**: SS、SSR、V2Ray、Trojan
- ✅ **智能节点过滤**: 根据用户等级（class）和群组（node_group）自动过滤节点
- ✅ **流量统计上报**: 通过 `Subscription-Userinfo` header 上报流量使用情况
- ✅ **多客户端格式**: Clash (YAML)、Surge、通用订阅链接（Base64）
- ✅ **Token 安全**: 使用专用 link token（非 JWT）进行订阅认证

## 数据库结构

### link 表（订阅链接表）

```prisma
model link {
  id      BigInt  @id @default(autoincrement())
  type    Int
  address String  @db.Text
  port    Int
  token   String  @db.Text    // 订阅令牌（UUID格式）
  ios     Int     @default(0)
  userid  BigInt                 // 用户ID
  isp     String? @db.Text
  geo     Int?
  method  String? @db.Text
}
```

**关键字段说明:**

- `token`: 订阅链接的唯一标识符，UUID 格式
- `userid`: 关联的用户 ID
- `type`: 链接类型（暂未使用）

## API 接口文档

### 1. 获取订阅链接（用户端）

**接口:** `GET /api/user/subscription`

**认证:** Bearer Token（JWT）

**返回示例:**

```json
{
  "token": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "urls": {
    "ss": "https://test-spanel-bun.freessr.bid/api/subscribe/a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "ssr": "https://test-spanel-bun.freessr.bid/api/subscribe/a1b2c3d4-e5f6-7890-abcd-ef1234567890?target=ssr",
    "v2ray": "https://test-spanel-bun.freessr.bid/api/subscribe/a1b2c3d4-e5f6-7890-abcd-ef1234567890?target=v2ray",
    "vmess": "https://test-spanel-bun.freessr.bid/api/subscribe/a1b2c3d4-e5f6-7890-abcd-ef1234567890?target=vmess",
    "trojan": "https://test-spanel-bun.freessr.bid/api/subscribe/a1b2c3d4-e5f6-7890-abcd-ef1234567890?target=trojan",
    "clash": "https://test-spanel-bun.freessr.bid/api/subscribe/a1b2c3d4-e5f6-7890-abcd-ef1234567890?target=clash",
    "surge": "https://test-spanel-bun.freessr.bid/api/subscribe/a1b2c3d4-e5f6-7890-abcd-ef1234567890?target=surge"
  },
  "updateUrl": "https://test-spanel-bun.freessr.bid/api/subscribe/a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

### 2. 重置订阅令牌

**接口:** `POST /api/user/subscription/reset`

**认证:** Bearer Token（JWT）

**说明:** 使旧订阅链接失效，生成新令牌

**返回示例:**

```json
{
  "message": "Subscription link reset successfully",
  "token": "new-uuid-token",
  "url": "https://test-spanel-bun.freessr.bid/api/subscribe/new-uuid-token"
}
```

### 3. 订阅分发（核心接口）

**接口:** `GET /api/subscribe/:token`

**认证:** 使用 link token（非 JWT）

**查询参数:**

- `target`: 客户端类型
  - `ss` - Shadowsocks（默认）
  - `ssr` - ShadowsocksR
  - `v2ray` / `vmess` - V2Ray
  - `trojan` - Trojan
  - `clash` - Clash配置（YAML）
  - `surge` - Surge配置

**响应头:**

```
Subscription-Userinfo: upload=1073741824; download=2147483648; total=107374182400; expire=1735689600
```

**响应格式:**

根据 `target` 参数返回不同格式：

#### SS 格式（默认）

```
ss://base64(method:password@server:port)#节点名称
ss://base64(method:password@server:port)#节点2
```

#### Clash 格式（YAML）

```yaml
port: 7890
socks-port: 7891
allow-lan: true
mode: Rule
log-level: info

proxies:
  - { name: "节点1", type: ss, server: example.com, port: 8388, cipher: aes-256-gcm, password: "password" }
  - { name: "节点2", type: ss, server: example2.com, port: 8388, cipher: aes-256-gcm, password: "password" }

proxy-groups:
  - name: 🚀 节点选择
    type: select
    proxies:
      - ♻️ 自动选择
      - 节点1
      - 节点2

rules:
  - MATCH,🚀 节点选择
```

## 订阅链接生成逻辑

### 1. 用户识别

```typescript
// 通过 link token 查找用户
const link = await prisma.link.findFirst({
  where: { token: params.token }
})

const user = await prisma.user.findUnique({
  where: { id: Number(link.userid) }
})
```

### 2. 账户状态检查

```typescript
// 检查账户是否过期
if (user.expire_in) {
  const expireDate = new Date(user.expire_in)
  if (expireDate < new Date()) {
    return 'Account expired'
  }
}
```

### 3. 节点过滤

**过滤条件:**

1. **节点在线**: `node_online = 1`
2. **等级匹配**: `node_class <= user.class`
3. **群组匹配**: `node_group = 0` OR `node_group = user.node_group`

```typescript
const nodes = await prisma.ss_node.findMany({
  where: {
    node_online: 1,
    node_class: {
      lte: user.class,  // 用户等级 >= 节点等级
    },
    OR: [
      { node_group: 0 },       // 全局节点
      { node_group: user.node_group },  // 用户专属节点
    ],
  },
  orderBy: {
    sort: 'asc',
  },
})
```

**示例场景:**

- 用户等级 `class=1`，群组 `node_group=2`
- 可用节点：
  - ✅ `node_class=0, node_group=0`（全局节点，等级0）
  - ✅ `node_class=1, node_group=2`（匹配用户群组）
  - ✅ `node_class=1, node_group=0`（全局节点）
  - ❌ `node_class=2, node_group=2`（节点等级过高）
  - ❌ `node_class=0, node_group=1`（群组不匹配）

### 4. 流量统计上报

**Subscription-Userinfo Header 格式:**

```
upload=%u; download=%d; total=%t; expire=%e
```

参数说明:
- `upload`: 上传流量（字节）
- `download`: 下载流量（字节）
- `total`: 总流量限制（字节）
- `expire`: 过期时间（Unix 时间戳）

```typescript
const uploadBytes = Number(user.u)
const downloadBytes = Number(user.d)
const totalLimit = Number(user.transfer_enable)
const expireTimestamp = user.expire_in
  ? Math.floor(new Date(user.expire_in).getTime() / 1000)
  : 0

set.headers['subscription-userinfo'] =
  `upload=${uploadBytes}; download=${downloadBytes}; total=${totalLimit}; expire=${expireTimestamp}`
```

**客户端显示效果:**

- Clash: 流量条显示已用/总流量
- Shadowrocket: 显示流量百分比
- Quantumult X: 显示流量详情

## 协议链接生成

### Shadowsocks (SS)

**格式:** `ss://base64(method:password@server:port)#name`

```typescript
function generateSSLink(node, user) {
  const userInfo = `${user.method}:${user.pass}`
  const base64UserInfo = Buffer.from(userInfo).toString('base64')
  const link = `ss://${base64UserInfo}@${node.server}:${node.port}`
  const nodeName = encodeURIComponent(node.name)
  return `${link}#${nodeName}`
}
```

### ShadowsocksR (SSR)

**格式:** `ssr://server:port:protocol:method:obfs:passwordbase64/?remarksbase64&groupbase64`

```typescript
function generateSSRLink(node, user) {
  const passwordBase64 = Buffer.from(user.pass).toString('base64')
  const remarksBase64 = Buffer.from(node.name).toString('base64')
  const groupBase64 = Buffer.from('SPanel').toString('base64')

  const link = `ssr://${node.server}:${node.port}:${user.protocol}:${user.method}:${user.obfs}:${passwordBase64}/?remarks=${remarksBase64}&group=${groupBase64}`
  return link
}
```

### V2Ray / VMess

**格式:** `vmess://base64(json_config)`

```typescript
function generateV2RayLink(node, user) {
  const config = {
    v: '2',
    ps: node.name,
    add: node.server,
    port: node.port.toString(),
    id: user.pass,
    aid: '0',
    scy: 'auto',
    net: 'tcp',
    type: 'none',
    host: '',
    path: '',
    tls: '',
  }

  const jsonConfig = JSON.stringify(config)
  const base64Config = Buffer.from(jsonConfig).toString('base64')
  return `vmess://${base64Config}`
}
```

### Trojan

**格式:** `trojan://password@server:port?peer=sni#name`

```typescript
function generateTrojanLink(node, user) {
  const link = `trojan://${user.pass}@${node.server}:${node.port}?peer=${node.server}#${encodeURIComponent(node.name)}`
  return link
}
```

### Clash (YAML)

完整的 Clash 配置文件，包含代理节点和代理组。

```typescript
function generateClashConfig(nodes, user) {
  const proxies = nodes.map(node =>
    `  - { name: "${node.name}", type: ss, server: ${node.server}, port: ${node.port}, cipher: ${user.method}, password: "${user.pass}" }`
  )

  return `port: 7890
proxies:
${proxies.join('\n')}

proxy-groups:
  - name: 🚀 节点选择
    type: select
    proxies:
      - ♻️ 自动选择
      ${nodes.map(n => `- ${n.name}`).join('\n      ')}

rules:
  - MATCH,🚀 节点选择
`
}
```

## 安全机制

### 1. Token 安全

- **UUID 格式**: 使用随机 UUID 作为订阅令牌
- **非 JWT**: 订阅 token 与 JWT 分离，降低风险
- **可重置**: 用户可随时重置订阅链接

### 2. 节点权限控制

- **等级控制**: 用户只能访问等级 ≤ 自己等级的节点
- **群组控制**: 用户只能访问全局节点或自己群组的节点
- **在线状态**: 仅分发了线节点

### 3. 账户过期检查

```typescript
if (user.expire_in && new Date(user.expire_in) < new Date()) {
  return 'Account expired'
}
```

## 客户端配置指南

### Clash

**订阅链接:**
```
https://test-spanel-bun.freessr.bid/api/subscribe/:token?target=clash
```

**使用步骤:**
1. 打开 Clash Dashboard
2. 进入 Profiles 页面
3. 点击 "Update" 或输入订阅 URL
4. 下载配置后选择该配置

### Shadowrocket

**订阅链接:**
```
https://test-spanel-bun.freessr.bid/api/subscribe/:token
```

**使用步骤:**
1. 打开 Shadowrocket
2. 点击 "+" 按钮
3. 选择 "Type: Subscribe"
4. 粘贴订阅链接
5. 点击 "Connect"

### Quantumult X

**订阅链接:**
```
https://test-spanel-bun.freessr.bid/api/subscribe/:token
```

**使用步骤:**
1. 打开 Quantumult X
2. 进入 节点 → 订阅
3. 点击 "+" 添加订阅
4. 粘贴订阅链接

### V2Ray / V2RayN

**订阅链接:**
```
https://test-spanel-bun.freessr.bid/api/subscribe/:token?target=v2ray
```

**使用步骤:**
1. 打开 V2RayN
2. 订阅 → 订阅设置
3. 添加订阅链接
4. 更新订阅

## 性能优化

### 1. 缓存策略

建议为订阅接口添加缓存（Redis）:

```typescript
// 缓存 key: `subscribe:${token}:${target}`
// TTL: 5 分钟
// 当用户流量更新时失效缓存
```

### 2. 节点列表缓存

```typescript
// 节点列表变化不频繁，可缓存 1 小时
const cacheKey = `nodes:class=${user.class}:group=${user.node_group}`
```

### 3. 响应压缩

对于大型配置（如 Clash），建议启用 gzip 压缩:

```typescript
app.use(compress())
```

## 故障排查

### 问题1: 订阅链接 404

**原因:** link token 不存在

**解决方案:**
1. 检查数据库中是否存在该 token
2. 调用 `/api/user/subscription` 重新获取

### 问题2: 订阅返回 "Account expired"

**原因:** 用户账户已过期

**解决方案:**
1. 检查 `user.expire_in` 字段
2. 续费或购买套餐

### 问题3: Clash 无法解析配置

**原因:** YAML 格式错误

**解决方案:**
1. 检查节点名称是否包含特殊字符
2. 使用 `encodeURIComponent()` 处理节点名称

### 问题4: 流量统计不正确

**原因:** 流量单位混淆

**解决方案:**
```typescript
// 确保统一使用字节（Bytes）
const uploadBytes = Number(user.u)      // BigInt → Number
const downloadBytes = Number(user.d)
```

## 监控与日志

### 关键指标

1. **订阅请求量**: 统计每日订阅请求次数
2. **Token 分布**: 统计活跃 token 数量
3. **客户端分布**: 统计不同 target 的使用比例
4. **错误率**: 404、403、500 错误的比例

### 日志记录

```typescript
console.log(`[Subscribe] User: ${userId}, Target: ${target}, Nodes: ${nodes.length}`)
```

## 总结

订阅分发系统实现了:

- ✅ 多协议支持（SS/SSR/V2Ray/Trojan）
- ✅ 智能节点过滤（等级 + 群组）
- ✅ 流量统计上报（Subscription-Userinfo header）
- ✅ 多客户端格式（Clash/Surge/通用）
- ✅ Token 安全机制
- ✅ 账户过期检查

**适用场景:**

- VPN/代理服务订阅分发
- 多客户端配置统一管理
- 节点权限动态控制

---

**文档版本:** v1.0.0
**最后更新:** 2026-01-14
**作者:** Claude Code
**许可:** MIT License
