import { Elysia, t } from 'elysia';
import { db } from '../../config/database';
import { nodeTable } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { authDerive, requireAdmin } from '../../middleware/auth';

export const adminNodeController = new Elysia({ prefix: '/admin' })
  .derive(authDerive)
  /**
   * 1. 获取所有物理节点列表
   */
  .get('/node', async ({ userId, isAdmin, set }) => {
    requireAdmin({ userId, isAdmin, set });

    const list = await db.select().from(nodeTable);

    return {
      status: 'success',
      data: list.map(node => ({
        id: node.id,
        name: node.name,
        server: node.server,
        method: node.method,
        info: node.info,
        status: node.status,
        type: node.type === 1,
        traffic_rate: node.trafficRate,
        node_group: node.nodeGroup,
        node_class: node.nodeClass,
        node_speedlimit: node.nodeSpeedlimit,
        node_connector: node.nodeConnector,
        node_bandwidth: node.nodeBandwidth,
        traffic_limit: node.trafficLimit.toString(),
        country_code: node.countryCode || 'UN'
      }))
    };
  })

  /**
   * 2. 创建新物理节点
   */
  .post('/shop', async () => {
    // 占位以避免路由混淆，重点在下面的 post('/node') 接口
  })
  .post('/node', async ({ userId, isAdmin, body, set }) => {
    requireAdmin({ userId, isAdmin, set });

    const {
      name, server, method, info, status, type, traffic_rate,
      node_group, node_class, node_speedlimit, node_connector,
      node_bandwidth, traffic_limit, country_code
    } = body;

    const result = await db.insert(nodeTable).values({
      name: name,
      server: server,
      method: method,
      info: info,
      status: status,
      type: type ? 1 : 0,
      trafficRate: traffic_rate,
      nodeGroup: node_group,
      nodeClass: node_class,
      nodeSpeedlimit: node_speedlimit,
      nodeConnector: node_connector,
      nodeBandwidth: node_bandwidth,
      trafficLimit: BigInt(traffic_limit),
      countryCode: country_code,
      // 默认/必要兜底配置
      customMethod: 0,
      customRss: 0,
      nodeHeartbeat: 0n,
      nodeOnline: 1,
      serverUptime: 0
    });

    return {
      status: 'success',
      message: '节点创建成功！',
      data: {
        id: result[0]?.insertId
      }
    };
  }, {
    body: t.Object({
      name: t.String(),
      server: t.String(),
      method: t.String(),
      info: t.String(),
      status: t.String(),
      type: t.Boolean(),
      traffic_rate: t.String(),
      node_group: t.Number(),
      node_class: t.Number(),
      node_speedlimit: t.String(),
      node_connector: t.Number(),
      node_bandwidth: t.String(),
      traffic_limit: t.String(), // 传入字节数(String)
      country_code: t.String()
    })
  })

  /**
   * 3. 更新物理节点信息
   */
  .put('/node/:id', async ({ userId, isAdmin, params, body, set }) => {
    requireAdmin({ userId, isAdmin, set });

    const nodeId = Number(params.id);
    const {
      name, server, method, info, status, type, traffic_rate,
      node_group, node_class, node_speedlimit, node_connector,
      node_bandwidth, traffic_limit, country_code
    } = body;

    const rows = await db.select().from(nodeTable).where(eq(nodeTable.id, nodeId)).limit(1);
    if (rows.length === 0) {
      set.status = 404;
      return { status: 'error', message: '物理节点不存在。' };
    }

    await db.update(nodeTable)
      .set({
        name: name,
        server: server,
        method: method,
        info: info,
        status: status,
        type: type ? 1 : 0,
        trafficRate: traffic_rate,
        nodeGroup: node_group,
        nodeClass: node_class,
        nodeSpeedlimit: node_speedlimit,
        nodeConnector: node_connector,
        nodeBandwidth: node_bandwidth,
        trafficLimit: BigInt(traffic_limit),
        countryCode: country_code
      })
      .where(eq(nodeTable.id, nodeId));

    return {
      status: 'success',
      message: '节点信息更新成功！'
    };
  }, {
    body: t.Object({
      name: t.String(),
      server: t.String(),
      method: t.String(),
      info: t.String(),
      status: t.String(),
      type: t.Boolean(),
      traffic_rate: t.String(),
      node_group: t.Number(),
      node_class: t.Number(),
      node_speedlimit: t.String(),
      node_connector: t.Number(),
      node_bandwidth: t.String(),
      traffic_limit: t.String(),
      country_code: t.String()
    })
  })

  /**
   * 4. 删除物理节点
   */
  .delete('/node/:id', async ({ userId, isAdmin, params, set }) => {
    requireAdmin({ userId, isAdmin, set });

    const nodeId = Number(params.id);

    const rows = await db.select().from(nodeTable).where(eq(nodeTable.id, nodeId)).limit(1);
    if (rows.length === 0) {
      set.status = 404;
      return { status: 'error', message: '物理节点不存在。' };
    }

    await db.delete(nodeTable).where(eq(nodeTable.id, nodeId));

    return {
      status: 'success',
      message: '物理节点已成功删除。'
    };
  });
