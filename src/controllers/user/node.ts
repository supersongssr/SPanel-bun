import { Elysia } from 'elysia';
import { db } from '../../config/database';
import { userTable, nodeTable, nodeInfoTable, nodeOnlineLogTable } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';
import { authDerive, requireAuth } from '../../middleware/auth';

export const userNodeController = new Elysia({ prefix: '/user' })
  .derive(authDerive)
  /**
   * 获取用户可用的节点列表 (按等级与分组进行物理过滤)
   */
  .get('/node', async ({ userId, set }) => {
    requireAuth({ userId, set });

    const uid = userId!;
    const users = await db.select().from(userTable).where(eq(userTable.id, uid)).limit(1);
    if (users.length === 0) {
      set.status = 404;
      return { status: 'error', message: '用户账号不存在。' };
    }

    const user = users[0];

    // 校验等级过期
    let userClass = user.class;
    if (user.classExpire && new Date(user.classExpire).getTime() < Date.now()) {
      userClass = 0;
    }

    // 查询所有 type = 1 (可见节点)
    const allDbNodes = await db.select().from(nodeTable).where(eq(nodeTable.type, 1));
    const allowedNodes = allDbNodes.filter(node => {
      const groupMatch = node.nodeGroup === 0 || node.nodeGroup === user.nodeGroup;
      const classMatch = userClass >= node.nodeClass;
      return groupMatch && classMatch;
    });

    return {
      status: 'success',
      data: allowedNodes.map(node => ({
        id: node.id,
        name: node.name,
        info: node.info,
        status: node.status,
        traffic_rate: node.trafficRate,
        node_speedlimit: node.nodeSpeedlimit,
        country_code: node.countryCode || 'UN',
        online: node.nodeOnline === 1
      }))
    };
  })

  /**
   * 获取物理节点 live 负载、在线人数等实时数据
   */
  .get('/node/:id/ajax', async ({ userId, params, set }) => {
    requireAuth({ userId, set });

    const nodeId = Number(params.id);

    // 1. 获取最新一期负载信息
    const infoLogs = await db.select()
      .from(nodeInfoTable)
      .where(eq(nodeInfoTable.nodeId, nodeId))
      .orderBy(desc(nodeInfoTable.logTime))
      .limit(1);

    // 2. 获取最新一期在线人数
    const onlineLogs = await db.select()
      .from(nodeOnlineLogTable)
      .where(eq(nodeOnlineLogTable.nodeId, nodeId))
      .orderBy(desc(nodeOnlineLogTable.logTime))
      .limit(1);

    const uptime = infoLogs.length > 0 ? Number(infoLogs[0].uptime) : 0;
    const load = infoLogs.length > 0 ? infoLogs[0].load : '0.00, 0.00, 0.00';
    const onlineUsers = onlineLogs.length > 0 ? onlineLogs[0].onlineUser : 0;

    return {
      status: 'success',
      data: {
        node_id: nodeId,
        uptime: uptime,
        load: load,
        online_users: onlineUsers,
        timestamp: Date.now()
      }
    };
  });
