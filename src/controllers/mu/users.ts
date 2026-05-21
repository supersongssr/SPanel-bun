import { Elysia, t } from 'elysia';
import { db } from '../../config/database';
import { userTable, nodeTable } from '../../db/schema';
import { eq } from 'drizzle-orm';
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

export const muUsersController = new Elysia({ prefix: '/mu' })
  /**
   * 1. 边缘节点心跳拉取可用连接用户列表 (自适应多版本兼容接口)
   */
  .get('/users', async ({ query, set }) => {
    const key = query.key || null;
    if (!isAuthorized(key, set)) {
      return { ret: 0, msg: '未授权：通信密钥无效。' };
    }

    const nodeId = query.node_id ? Number(query.node_id) : null;

    // A. 尝试从 Redis 缓存中获取已过滤完毕的用户流，极致毫秒级响应
    if (nodeId) {
      const cached = await redis.get(`node:sync:users:${nodeId}`);
      if (cached) {
        try {
          const data = JSON.parse(cached);
          return { ret: 1, data };
        } catch (e) {
          // 若 JSON 解析异常，则落入降级查库逻辑
        }
      }
    }

    // B. 数据库降级/穿透逻辑 (若 Redis 缓存不存在)
    let allowedUsers: (typeof userTable.$inferSelect)[] = [];

    if (nodeId) {
      const nodes = await db.select().from(nodeTable).where(eq(nodeTable.id, nodeId)).limit(1);
      if (nodes.length > 0) {
        const node = nodes[0];
        // 仅拉取 enable = 1 账号有效的活跃用户
        const allActiveUsers = await db.select().from(userTable).where(eq(userTable.enable, 1));
        
        allowedUsers = allActiveUsers.filter(u => {
          let uClass = u.class;
          // 校验等级是否过期，若过期则降为 0
          if (u.classExpire && u.classExpire.getTime() < Date.now()) {
            uClass = 0;
          }
          const groupMatch = node.nodeGroup === 0 || node.nodeGroup === u.nodeGroup;
          const classMatch = uClass >= node.nodeClass;
          return groupMatch && classMatch;
        });
      }
    } else {
      // 没有任何 nodeId 时，默认向后兼容，返回所有 enable = 1 的有效用户
      allowedUsers = await db.select().from(userTable).where(eq(userTable.enable, 1));
    }

    const formattedData = allowedUsers.map(u => ({
      id: u.id,
      port: u.port,
      passwd: u.passwd,
      method: u.method,
      enable: u.enable,
      u: u.u.toString(),
      d: u.d.toString(),
      transfer_enable: u.transferEnable.toString(),
      uuid: u.v2rayUuid,
      v2ray_uuid: u.v2rayUuid
    }));

    // C. 异步将查询出的结果缓存入 Redis，过期时间 60 秒，保护 MySQL 不受高频轮询冲击
    if (nodeId) {
      await redis.set(`node:sync:users:${nodeId}`, JSON.stringify(formattedData), 'EX', 60);
    }

    return {
      ret: 1,
      data: formattedData
    };
  }, {
    query: t.Object({
      key: t.Optional(t.String()),
      node_id: t.Optional(t.String())
    })
  });
