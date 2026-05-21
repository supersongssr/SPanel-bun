import { Elysia, t } from 'elysia';
import { db } from '../../config/database';
import { ticketTable, userTable } from '../../db/schema';
import { eq, and, asc, desc } from 'drizzle-orm';
import { authDerive, requireAdmin } from '../../middleware/auth';

export const adminTicketController = new Elysia({ prefix: '/admin' })
  .derive(authDerive)
  /**
   * 1. 拉取所有主工单列表 (含提交用户信息)
   */
  .get('/ticket', async ({ userId, isAdmin, set }) => {
    requireAdmin({ userId, isAdmin, set });

    // 查询所有 rootid = 0 的主工单
    const list = await db.select({
      id: ticketTable.id,
      title: ticketTable.title,
      status: ticketTable.status,
      datetime: ticketTable.datetime,
      userId: ticketTable.userId,
      userEmail: userTable.email,
      userName: userTable.userName,
    })
      .from(ticketTable)
      .leftJoin(userTable, eq(ticketTable.userId, userTable.id))
      .where(eq(ticketTable.rootid, 0n))
      .orderBy(desc(ticketTable.id));

    return {
      status: 'success',
      data: list.map(tkt => ({
        id: tkt.id,
        title: tkt.title,
        status: tkt.status === 1 ? 'open' : 'closed',
        datetime: new Date(Number(tkt.datetime) * 1000).toISOString().replace('T', ' ').substring(0, 19),
        user: {
          id: tkt.userId.toString(),
          email: tkt.userEmail || 'Deleted User',
          userName: tkt.userName || '未知用户',
        }
      }))
    };
  })

  /**
   * 2. 查看工单对话详情
   */
  .get('/ticket/:id', async ({ userId, isAdmin, params, set }) => {
    requireAdmin({ userId, isAdmin, set });

    const tktId = BigInt(params.id);

    // A. 抓取主工单
    const mainTkts = await db.select({
      id: ticketTable.id,
      title: ticketTable.title,
      status: ticketTable.status,
      content: ticketTable.content,
      datetime: ticketTable.datetime,
      userId: ticketTable.userId,
      userEmail: userTable.email,
      userName: userTable.userName,
    })
      .from(ticketTable)
      .leftJoin(userTable, eq(ticketTable.userId, userTable.id))
      .where(
        and(
          eq(ticketTable.id, Number(tktId)),
          eq(ticketTable.rootid, 0n)
        )
      )
      .limit(1);

    if (mainTkts.length === 0) {
      set.status = 404;
      return { status: 'error', message: '工单不存在。' };
    }

    const mainTkt = mainTkts[0];

    // B. 抓取所有追加对话 (子工单) 并关联回复人信息
    const replies = await db.select({
      id: ticketTable.id,
      content: ticketTable.content,
      datetime: ticketTable.datetime,
      userId: ticketTable.userId,
      userEmail: userTable.email,
      userName: userTable.userName,
      isAdmin: userTable.isAdmin,
    })
      .from(ticketTable)
      .leftJoin(userTable, eq(ticketTable.userId, userTable.id))
      .where(eq(ticketTable.rootid, tktId))
      .orderBy(asc(ticketTable.id));

    // 合并首发与回复流
    const chatFlow = [
      {
        id: mainTkt.id,
        role: 'user',
        sender: mainTkt.userName || mainTkt.userEmail || '未知用户',
        content: mainTkt.content,
        datetime: new Date(Number(mainTkt.datetime) * 1000).toISOString().replace('T', ' ').substring(0, 19)
      },
      ...replies.map(rep => {
        const isSupport = rep.isAdmin === 1 || rep.userId !== mainTkt.userId;
        return {
          id: rep.id,
          role: isSupport ? 'support' : 'user',
          sender: rep.userName || rep.userEmail || (isSupport ? '系统客服' : '未知用户'),
          content: rep.content,
          datetime: new Date(Number(rep.datetime) * 1000).toISOString().replace('T', ' ').substring(0, 19)
        };
      })
    ];

    return {
      status: 'success',
      data: {
        id: mainTkt.id,
        title: mainTkt.title,
        status: mainTkt.status === 1 ? 'open' : 'closed',
        chat_flow: chatFlow
      }
    };
  })

  /**
   * 3. 客服/管理员回复工单
   */
  .put('/ticket/:id', async ({ userId, isAdmin, params, body, set }) => {
    requireAdmin({ userId, isAdmin, set });

    const adminUid = BigInt(userId!);
    const tktId = BigInt(params.id);
    const { content } = body;

    if (!content.trim()) {
      set.status = 400;
      return { status: 'error', message: '回复内容不能为空。' };
    }

    // 验证主工单是否存在
    const mainTkts = await db.select()
      .from(ticketTable)
      .where(
        and(
          eq(ticketTable.id, Number(tktId)),
          eq(ticketTable.rootid, 0n)
        )
      )
      .limit(1);

    if (mainTkts.length === 0) {
      set.status = 404;
      return { status: 'error', message: '工单不存在。' };
    }

    const nowSec = BigInt(Math.floor(Date.now() / 1000));

    // A. 插入客服追加回复记录
    await db.insert(ticketTable).values({
      title: '',
      content: content,
      rootid: tktId,
      userId: adminUid,
      datetime: nowSec,
      status: 1
    });

    // B. 更新主工单状态为开启 (1)
    await db.update(ticketTable)
      .set({ status: 1 })
      .where(eq(ticketTable.id, Number(tktId)));

    return {
      status: 'success',
      message: '工单回复成功。'
    };
  }, {
    body: t.Object({
      content: t.String()
    })
  })

  /**
   * 4. 关闭工单 (结单)
   */
  .delete('/ticket/:id', async ({ userId, isAdmin, params, set }) => {
    requireAdmin({ userId, isAdmin, set });

    const tktId = BigInt(params.id);

    // 验证主工单是否存在
    const mainTkts = await db.select()
      .from(ticketTable)
      .where(
        and(
          eq(ticketTable.id, Number(tktId)),
          eq(ticketTable.rootid, 0n)
        )
      )
      .limit(1);

    if (mainTkts.length === 0) {
      set.status = 404;
      return { status: 'error', message: '工单不存在。' };
    }

    // 更新主工单状态为 0 (已结单)
    await db.update(ticketTable)
      .set({ status: 0 })
      .where(eq(ticketTable.id, Number(tktId)));

    return {
      status: 'success',
      message: '工单结单成功。'
    };
  });
