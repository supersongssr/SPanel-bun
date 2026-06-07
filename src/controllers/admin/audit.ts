import { Elysia } from 'elysia';
import { db } from '../../config/database';
import { loginIpTable, aliveIpTable, userTrafficLogTable, userTable, nodeTable } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';
import { authDerive, requireAdmin } from '../../middleware/auth';

export const adminAuditController = new Elysia({ prefix: '/admin' })
  .derive(authDerive)
  /**
   * 1. 登录历史记录审计
   */
  .get('/audit/login', async ({ userId, isAdmin, set }) => {
    requireAdmin({ userId, isAdmin, set });

    const list = await db.select({
      id: loginIpTable.id,
      ip: loginIpTable.ip,
      datetime: loginIpTable.datetime,
      type: loginIpTable.type,
      userId: loginIpTable.userId,
      userName: userTable.userName,
      userEmail: userTable.email
    })
      .from(loginIpTable)
      .leftJoin(userTable, eq(loginIpTable.userId, userTable.id))
      .orderBy(desc(loginIpTable.id))
      .limit(500); // 限制返回最近 500 条记录

    return {
      status: 'success',
      data: list.map(log => ({
        id: log.id,
        ip: log.ip,
        datetime: new Date(Number(log.datetime) * 1000).toISOString().replace('T', ' ').substring(0, 19),
        type: log.type === 1 ? 'API 登录' : '网页登录',
        user: {
          id: log.userId.toString(),
          userName: log.userName || '未知用户',
          email: log.userEmail || 'Deleted User'
        }
      }))
    };
  })

  /**
   * 2. 节点在线 IP 审计
   */
  .get('/audit/alive', async ({ userId, isAdmin, set }) => {
    requireAdmin({ userId, isAdmin, set });

    const list = await db.select({
      id: aliveIpTable.id,
      ip: aliveIpTable.ip,
      datetime: aliveIpTable.datetime,
      nodeId: aliveIpTable.nodeId,
      nodeName: nodeTable.name,
      userId: aliveIpTable.userId,
      userName: userTable.userName,
      userEmail: userTable.email
    })
      .from(aliveIpTable)
      .leftJoin(userTable, eq(aliveIpTable.userId, userTable.id))
      .leftJoin(nodeTable, eq(aliveIpTable.nodeId, nodeTable.id))
      .orderBy(desc(aliveIpTable.id))
      .limit(500);

    return {
      status: 'success',
      data: list.map(log => ({
        id: log.id,
        ip: log.ip,
        datetime: new Date(Number(log.datetime) * 1000).toISOString().replace('T', ' ').substring(0, 19),
        node: {
          id: log.nodeId.toString(),
          name: log.nodeName || '未知节点'
        },
        user: {
          id: log.userId.toString(),
          userName: log.userName || '未知用户',
          email: log.userEmail || 'Deleted User'
        }
      }))
    };
  })

  /**
   * 3. 流量消耗日志审计
   */
  .get('/audit/traffic', async ({ userId, isAdmin, set }) => {
    requireAdmin({ userId, isAdmin, set });

    const list = await db.select({
      id: userTrafficLogTable.id,
      u: userTrafficLogTable.u,
      d: userTrafficLogTable.d,
      rate: userTrafficLogTable.rate,
      traffic: userTrafficLogTable.traffic,
      logTime: userTrafficLogTable.logTime,
      userId: userTrafficLogTable.userId,
      userName: userTable.userName,
      userEmail: userTable.email,
      nodeId: userTrafficLogTable.nodeId,
      nodeName: nodeTable.name
    })
      .from(userTrafficLogTable)
      .leftJoin(userTable, eq(userTrafficLogTable.userId, userTable.id))
      .leftJoin(nodeTable, eq(userTrafficLogTable.nodeId, nodeTable.id))
      .orderBy(desc(userTrafficLogTable.id))
      .limit(500);

    return {
      status: 'success',
      data: list.map(log => ({
        id: log.id,
        u: log.u.toString(),
        d: log.d.toString(),
        rate: log.rate,
        traffic: log.traffic,
        datetime: new Date(Number(log.logTime) * 1000).toISOString().replace('T', ' ').substring(0, 19),
        node: {
          id: log.nodeId.toString(),
          name: log.nodeName || '未知节点'
        },
        user: {
          id: log.userId.toString(),
          userName: log.userName || '未知用户',
          email: log.userEmail || 'Deleted User'
        }
      }))
    };
  });
