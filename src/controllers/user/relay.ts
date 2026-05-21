import { Elysia, t } from 'elysia';
import { db } from '../../config/database';
import { relayTable, nodeTable } from '../../db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { authDerive, requireAuth } from '../../middleware/auth';

export const userRelayController = new Elysia({ prefix: '/user' })
  .derive(authDerive)
  /**
   * 1. 获取当前用户配置的所有中转端口转发规则 (联合节点表展现友好名称)
   */
  .get('/relay', async ({ userId, set }) => {
    requireAuth({ userId, set });

    const uid = BigInt(userId!);

    // A. 抓取该用户所有规则
    const list = await db.select()
      .from(relayTable)
      .where(eq(relayTable.userId, uid));

    if (list.length === 0) {
      return { status: 'success', data: [] };
    }

    // B. 收集涉及的 Node ID 列表，并拉取对应的节点名称
    const nodeIds = new Set<number>();
    for (const item of list) {
      nodeIds.add(Number(item.sourceNodeId));
      if (item.distNodeId > 0n) {
        nodeIds.add(Number(item.distNodeId));
      }
    }

    const nodeMap = new Map<number, string>();
    if (nodeIds.size > 0) {
      const nodes = await db.select({ id: nodeTable.id, name: nodeTable.name })
        .from(nodeTable)
        .where(inArray(nodeTable.id, Array.from(nodeIds)));
      for (const n of nodes) {
        nodeMap.set(n.id, n.name);
      }
    }

    return {
      status: 'success',
      data: list.map(item => ({
        id: item.id,
        source_node_id: Number(item.sourceNodeId),
        source_node_name: nodeMap.get(Number(item.sourceNodeId)) || `未知入口节点 (#${item.sourceNodeId})`,
        dist_node_id: Number(item.distNodeId),
        dist_node_name: item.distNodeId === 0n ? '直接落地 IP' : (nodeMap.get(Number(item.distNodeId)) || `未知目标节点 (#${item.distNodeId})`),
        dist_ip: item.distIp,
        port: item.port,
        priority: item.priority
      }))
    };
  })

  /**
   * 2. 新增中转规则
   */
  .post('/relay', async ({ userId, body, set }) => {
    requireAuth({ userId, set });

    const uid = BigInt(userId!);
    const { source_node_id, dist_node_id, dist_ip, port, priority } = body;

    // A. 校验端口范围
    if (port < 1 || port > 65535) {
      set.status = 400;
      return { status: 'error', message: '中转目标端口必须在 1 - 65535 范围内。' };
    }

    // B. 校验源节点是否存在
    const sourceNode = await db.select().from(nodeTable).where(eq(nodeTable.id, source_node_id)).limit(1);
    if (sourceNode.length === 0) {
      set.status = 400;
      return { status: 'error', message: '入口中转节点不存在。' };
    }

    // C. 校验目标节点是否存在 (若 dist_node_id > 0)
    if (dist_node_id > 0) {
      const distNode = await db.select().from(nodeTable).where(eq(nodeTable.id, dist_node_id)).limit(1);
      if (distNode.length === 0) {
        set.status = 400;
        return { status: 'error', message: '出口落地节点不存在。' };
      }
    }

    // D. 写入中转规则
    await db.insert(relayTable).values({
      userId: uid,
      sourceNodeId: BigInt(source_node_id),
      distNodeId: BigInt(dist_node_id),
      distIp: dist_ip,
      port: port,
      priority: priority || 0
    });

    return {
      status: 'success',
      message: '中转端口转发规则创建成功！'
    };
  }, {
    body: t.Object({
      source_node_id: t.Number(),
      dist_node_id: t.Number(),
      dist_ip: t.String(),
      port: t.Number(),
      priority: t.Optional(t.Number())
    })
  })

  /**
   * 3. 获取单条中转规则配置
   */
  .get('/relay/:id', async ({ userId, params, set }) => {
    requireAuth({ userId, set });

    const uid = BigInt(userId!);
    const ruleId = Number(params.id);

    const rules = await db.select()
      .from(relayTable)
      .where(
        and(
          eq(relayTable.id, ruleId),
          eq(relayTable.userId, uid)
        )
      )
      .limit(1);

    if (rules.length === 0) {
      set.status = 404;
      return { status: 'error', message: '中转规则不存在或无权访问。' };
    }

    const rule = rules[0];

    return {
      status: 'success',
      data: {
        id: rule.id,
        source_node_id: Number(rule.sourceNodeId),
        dist_node_id: Number(rule.distNodeId),
        dist_ip: rule.distIp,
        port: rule.port,
        priority: rule.priority
      }
    };
  })

  /**
   * 4. 更新特定中转规则
   */
  .put('/relay/:id', async ({ userId, params, body, set }) => {
    requireAuth({ userId, set });

    const uid = BigInt(userId!);
    const ruleId = Number(params.id);
    const { source_node_id, dist_node_id, dist_ip, port, priority } = body;

    // A. 校验原规则归属
    const rules = await db.select()
      .from(relayTable)
      .where(
        and(
          eq(relayTable.id, ruleId),
          eq(relayTable.userId, uid)
        )
      )
      .limit(1);

    if (rules.length === 0) {
      set.status = 404;
      return { status: 'error', message: '规则不存在或无权修改。' };
    }

    if (port < 1 || port > 65535) {
      set.status = 400;
      return { status: 'error', message: '中转目标端口必须在 1 - 65535 范围内。' };
    }

    // B. 校验新节点有效性
    const sourceNode = await db.select().from(nodeTable).where(eq(nodeTable.id, source_node_id)).limit(1);
    if (sourceNode.length === 0) {
      set.status = 400;
      return { status: 'error', message: '入口中转节点不存在。' };
    }

    if (dist_node_id > 0) {
      const distNode = await db.select().from(nodeTable).where(eq(nodeTable.id, dist_node_id)).limit(1);
      if (distNode.length === 0) {
        set.status = 400;
        return { status: 'error', message: '出口落地节点不存在。' };
      }
    }

    // C. 执行更新
    await db.update(relayTable)
      .set({
        sourceNodeId: BigInt(source_node_id),
        distNodeId: BigInt(dist_node_id),
        distIp: dist_ip,
        port: port,
        priority: priority || 0
      })
      .where(eq(relayTable.id, ruleId));

    return {
      status: 'success',
      message: '中转端口转发规则修改成功！'
    };
  }, {
    body: t.Object({
      source_node_id: t.Number(),
      dist_node_id: t.Number(),
      dist_ip: t.String(),
      port: t.Number(),
      priority: t.Optional(t.Number())
    })
  })

  /**
   * 5. 删除中转规则 (通过 body 接收 id，完美对齐旧版 PHP 表单提交)
   */
  .delete('/relay', async ({ userId, body, set }) => {
    requireAuth({ userId, set });

    const uid = BigInt(userId!);
    const { id } = body;

    const rules = await db.select()
      .from(relayTable)
      .where(
        and(
          eq(relayTable.id, id),
          eq(relayTable.userId, uid)
        )
      )
      .limit(1);

    if (rules.length === 0) {
      set.status = 404;
      return { status: 'error', message: '规则不存在或无权删除。' };
    }

    await db.delete(relayTable).where(eq(relayTable.id, id));

    return {
      status: 'success',
      message: '中转端口转发规则已成功移除。'
    };
  }, {
    body: t.Object({
      id: t.Number()
    })
  })

  /**
   * 6. 删除中转规则 (RESTful 风格路径端点)
   */
  .delete('/relay/:id', async ({ userId, params, set }) => {
    requireAuth({ userId, set });

    const uid = BigInt(userId!);
    const ruleId = Number(params.id);

    const rules = await db.select()
      .from(relayTable)
      .where(
        and(
          eq(relayTable.id, ruleId),
          eq(relayTable.userId, uid)
        )
      )
      .limit(1);

    if (rules.length === 0) {
      set.status = 404;
      return { status: 'error', message: '规则不存在或无权删除。' };
    }

    await db.delete(relayTable).where(eq(relayTable.id, ruleId));

    return {
      status: 'success',
      message: '中转端口转发规则已成功移除。'
    };
  });
