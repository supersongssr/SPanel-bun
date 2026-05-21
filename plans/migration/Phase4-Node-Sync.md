# SPanel-bun 重构迁移四期规范：高并发节点同步与 Redis 缓冲队列 (Phase 4)

本方案是整个重构迁移阶段的性能红线所在。由于后端 VPN/代理守护进程（如 Shadowsocks-mod, Xray 等）会高频地同步活跃用户、上报海量流量记录，直接查写 MySQL 数据库必然导致高并发锁表。**本阶段的核心任务是实现高性能节点通信接口、Redis 用户元数据高速缓存以及异步流量写入缓冲队列。**

---

## 目录
1. [四期迁移目标与性能红线](#1-四期迁移目标与性能红线)
2. [节点通信安全校验中间件 (`NodeAuth`)](#2-节点通信安全校验中间件-nodeauth)
3. [基于 Redis Cache 的高频用户列表查询](#3-基于-redis-cache-的高频用户列表查询)
4. [流量增量上报的 Redis 异步缓冲队列 (Batch Write Buffer)](#4-流量增量上报的-redis-异步缓冲队列-batch-write-buffer)
5. [常驻异步批处理 Worker 线程设计](#5-常驻异步批处理-worker-线程设计)
6. [四期联调与压力验收指标](#6-四期联调与压力验收指标)

---

## 1. 四期迁移目标与性能红线

1. **百分之百向下兼容**：完美模拟原有 `/api/mu/*` 和 `/api/mod_mu/*` 接口，入参和出参 JSON 格式不发生任何变更，使现存的 Shadowsocks-mod/Xray 守护进程无需更换或调整配置即可直接同步。
2. **高频查询拦截**：对节点每分钟发起的 `/api/mod_mu/users` 请求，实现 **Redis 缓存接管**，避免频繁在 MySQL 执行全表扫描。
3. **消除数据库死锁（核心红线）**：高频流量上报（`/api/mod_mu/users/traffic`）采用**异步缓存写入策略**，在内存中进行聚合归并后批量持久化，数据库并发写开销降低 90% 以上。

---

## 2. 节点通信安全校验中间件 (`NodeAuth`)

节点同步接口需要双层安全防护：**Mu Key（通讯密钥）签名比对** 以及 **节点服务器物理 IP 白名单比对**。

```typescript
import { db } from '../config/database';
import { nodeTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { redis } from '../config/redis';

/**
 * Elysia 节点专属高频鉴权中间件
 */
export async function verifyNodeAccess(request: Request, set: any): Promise<{ nodeId: number } | null> {
  const url = new URL(request.url);
  const clientIp = request.headers.get('x-real-ip') || '127.0.0.1';
  
  // 1. 获取 URL 中的 muKey 参数或 Headers 中的 key
  const queryKey = url.searchParams.get('key');
  const headerKey = request.headers.get('Node-Key');
  const currentKey = queryKey || headerKey;

  // 获取配置中的系统全局 muKey
  const systemMuKey = await redis.get('sp_config:muKey') || 'default_highly_secure_mu_key_123456';

  if (!currentKey || currentKey !== systemMuKey) {
    set.status = 401;
    return null;
  }

  // 2. IP 白名单匹配 (提取活跃节点配置信息)
  const pathParts = url.pathname.split('/');
  const nodeIdIndex = pathParts.indexOf('nodes') + 1;
  const nodeId = nodeIdIndex > 0 ? Number(pathParts[nodeIdIndex]) : null;

  if (nodeId) {
    const nodes = await db.select().from(nodeTable).where(eq(nodeTable.id, nodeId)).limit(1);
    const node = nodes[0];
    
    // 如果节点表登记了固定 IP 且与上报 IP 不符，则拦截 (防跨站越权同步)
    if (node && node.server && node.server !== clientIp && clientIp !== '127.0.0.1') {
      set.status = 403;
      return null;
    }
  }

  return { nodeId: nodeId || 0 };
}
```

---

## 3. 基于 Redis Cache 的高频用户列表查询

节点请求 `/api/mod_mu/users` 需要拉取当前系统上等级、分组匹配且账号激活的全部用户连接参数（如 `port`, `passwd`, `uuid`）。
*   **缓存加载机制**：当第一次请求到达时，从 MySQL 捞取数据并将其转换为 JSON 存储在 Redis 哈希结构（`node:sync:users`）中，设定 30 分钟过期时间。
*   **主动撤销机制**：当管理员在后台修改了用户的 class, group, password 或用户流量耗尽被封禁时，系统**必须通过 Redis 立即清除 `node:sync:users` 缓存键**，强迫下一次节点轮询刷新数据。

---

## 4. 流量增量上报的 Redis 异步缓冲队列 (Batch Write Buffer)

当节点发生流量消费并请求 `POST /api/mod_mu/users/traffic` 上报时，后端只执行快速的队列入库，保证连接极速返回：

### 4.1 流量上报接收端点 (Fast Write in Elysia)
```typescript
import { redis } from '../config/redis';

export async function handleNodeTrafficReport(body: { u: string, d: string, uid: number }) {
  const payload = JSON.stringify({
    uid: body.uid,
    u: body.u.toString(), // 上传字节
    d: body.d.toString(), // 下载字节
    timestamp: Date.now()
  });

  // 直接推入 Redis 高速列表队列中，不进行任何 SQL 慢速阻塞操作
  await redis.lpush('queue:node:traffic', payload);

  return { status: 'success', message: '已加入批量更新队列' };
}
```

---

## 5. 常驻异步批处理 Worker 线程设计

在 `src/scheduler.ts` 中运行一个常驻的异步流处理任务，每隔 5 秒定时拉取队列，在内存中完成数据聚合，再以“大批量多单更新（Bulk Update）”或“合并更新（Merged Update）”的方式回写 MySQL：

```typescript
import { redis } from './config/redis';
import { db } from './config/database';
import { userTable } from './db/schema';
import { sql } from 'drizzle-orm';

export async function startTrafficBatchWorker() {
  console.log('🤖 流量大批量归并更新 Worker 已经启动运行...');

  setInterval(async () => {
    try {
      // 1. 获取并清空当前队列中积累的全部数据
      const len = await redis.llen('queue:node:traffic');
      if (len === 0) return;

      const rawItems = await redis.lrange('queue:node:traffic', 0, -1);
      await redis.ltrim('queue:node:traffic', len, -1); // 弹出已拉取部分

      // 2. 内存归并聚合 (防止同一 UID 在 5 秒内产生多次上报导致执行多条 UPDATE)
      const mergedTraffic: Record<number, { u: bigint, d: bigint }> = {};

      for (const raw of rawItems) {
        const item = JSON.parse(raw);
        const uid = item.uid;
        const u = BigInt(item.u);
        const d = BigInt(item.d);

        if (!mergedTraffic[uid]) {
          mergedTraffic[uid] = { u: 0n, d: 0n };
        }
        mergedTraffic[uid].u += u;
        mergedTraffic[uid].d += d;
      }

      // 3. 构造批量 SQL 事务，一次性提交更新 (利用 Drizzle ORM batch 或 RAW SQL 提速)
      const uids = Object.keys(mergedTraffic);
      if (uids.length === 0) return;

      console.log(`📊 批处理 Worker: 正在聚合提交 ${uids.length} 个用户的增量流量数据...`);

      await db.transaction(async (tx) => {
        for (const uidStr of uids) {
          const uid = Number(uidStr);
          const traffic = mergedTraffic[uid];

          // 增量更新 u 和 d
          await tx.update(userTable)
            .set({
              u: sql`${userTable.u} + ${traffic.u}`,
              d: sql`${userTable.d} + ${traffic.d}`
            })
            .where(eq(userTable.id, uid));
        }
      });

    } catch (err) {
      console.error('❌ 批处理 Worker 执行出错：', err);
    }
  }, 5000); // 5秒一轮
}
```

---

## 6. 四期联调与压力验收指标

在四期联调中，需要对同步和写机制进行极其严密的压测：

*   [ ] **缓存穿透验证**：模拟 100 次并发的 `/api/mod_mu/users` 查询，查验 MySQL 的查询日志，MySQL 的 `SELECT * FROM user` 应当**仅仅被执行了 1 次**，其余 99 次均由 Redis 直接极速响应。
*   [ ] **高频写入抗压测试**：使用 wrk 压测工具模拟节点，以每秒 2000 次请求的超高频向 `/api/mod_mu/users/traffic` 上报虚拟流量，检查宿主机 MySQL 性能，CPU 占用率应**保持在 5% 以下**，且完全没有发生任何 SQL 行锁定超时报错。
*   [ ] **数据完整性比对**：完成高并发压测后，核对 MySQL 表中用户的累计流量增量值，必须与压测工具发送的总流量数据包的总字节（Bytes）完全匹配。
