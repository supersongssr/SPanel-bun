import { Elysia, t } from 'elysia';
import { redis } from '../../config/redis';
import { getConfig } from '../../config/app';

/**
 * 校验 Mu 通信密钥
 */
function isAuthorized(key: string | null, set: any): boolean {
  const systemKey = getConfig('muKey', 'default_highly_secure_mu_key_123456');
  if (!key || key !== systemKey) {
    set.status = 401;
    return false;
  }
  return true;
}

export const muTrafficController = new Elysia()
  /**
   * 1. 批量流量消耗上报端点 (/api/mu/users/traffic 或 /api/mod_mu/users/traffic)
   * 流量数据存入 Redis queue:traffic:incoming，实现微秒级响应
   */
  .post('/mu/users/traffic', async ({ query, body, set }) => {
    return handleBatchTraffic(query.key, query.node_id, body, set);
  }, {
    query: t.Object({
      key: t.Optional(t.String()),
      node_id: t.Optional(t.String())
    }),
    body: t.Array(t.Object({
      user_id: t.Number(),
      u: t.Number(),
      d: t.Number()
    }))
  })

  .post('/mod_mu/users/traffic', async ({ query, body, set }) => {
    return handleBatchTraffic(query.key, query.node_id, body, set);
  }, {
    query: t.Object({
      key: t.Optional(t.String()),
      node_id: t.Optional(t.String())
    }),
    body: t.Array(t.Object({
      user_id: t.Number(),
      u: t.Number(),
      d: t.Number()
    }))
  })

  /**
   * 2. 单个用户流量消耗上报端点 (/api/mu/users/:id/traffic 或 /api/mod_mu/users/:id/traffic)
   */
  .post('/mu/users/:id/traffic', async ({ params, query, body, set }) => {
    return handleSingleTraffic(params.id, query.key, query.node_id, body, set);
  }, {
    params: t.Object({
      id: t.String()
    }),
    query: t.Object({
      key: t.Optional(t.String()),
      node_id: t.Optional(t.String())
    }),
    body: t.Object({
      u: t.Number(),
      d: t.Number()
    })
  })

  .post('/mod_mu/users/:id/traffic', async ({ params, query, body, set }) => {
    return handleSingleTraffic(params.id, query.key, query.node_id, body, set);
  }, {
    params: t.Object({
      id: t.String()
    }),
    query: t.Object({
      key: t.Optional(t.String()),
      node_id: t.Optional(t.String())
    }),
    body: t.Object({
      u: t.Number(),
      d: t.Number()
    })
  });

/**
 * 处理批量流量上报
 */
async function handleBatchTraffic(key: string | undefined, nodeIdStr: string | undefined, body: any[], set: any) {
  if (!isAuthorized(key || null, set)) {
    return { ret: 0, msg: '未授权：通信密钥无效。' };
  }

  const nodeId = nodeIdStr ? Number(nodeIdStr) : 0;
  const pipeline = redis.pipeline();
  const nowSec = Math.floor(Date.now() / 1000);

  for (const item of body) {
    if (item.u <= 0 && item.d <= 0) continue; // 过滤无意义数据

    const queueData = {
      userId: Number(item.user_id),
      nodeId: nodeId,
      u: BigInt(item.u).toString(),
      d: BigInt(item.d).toString(),
      timestamp: nowSec
    };

    pipeline.rpush('queue:traffic:incoming', JSON.stringify(queueData));
  }

  await pipeline.exec();

  return {
    ret: 1,
    msg: '流量上报已成功缓冲存入高速队列。'
  };
}

/**
 * 处理单个用户流量上报
 */
async function handleSingleTraffic(userIdStr: string, key: string | undefined, nodeIdStr: string | undefined, body: any, set: any) {
  if (!isAuthorized(key || null, set)) {
    return { ret: 0, msg: '未授权：通信密钥无效。' };
  }

  const userId = Number(userIdStr);
  const nodeId = nodeIdStr ? Number(nodeIdStr) : 0;
  const u = BigInt(body.u);
  const d = BigInt(body.d);

  if (u <= 0n && d <= 0n) {
    return { ret: 1, msg: '无新流量损耗。' };
  }

  const queueData = {
    userId: userId,
    nodeId: nodeId,
    u: u.toString(),
    d: d.toString(),
    timestamp: Math.floor(Date.now() / 1000)
  };

  await redis.rpush('queue:traffic:incoming', JSON.stringify(queueData));

  return {
    ret: 1,
    msg: '流量上报已成功缓冲存入高速队列。'
  };
}
