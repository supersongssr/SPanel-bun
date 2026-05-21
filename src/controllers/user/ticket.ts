import { Elysia, t } from 'elysia';
import { db } from '../../config/database';
import { ticketTable } from '../../db/schema';
import { eq, and, asc, desc } from 'drizzle-orm';
import { authDerive, requireAuth } from '../../middleware/auth';

export const userTicketController = new Elysia({ prefix: '/user' })
  .derive(authDerive)
  /**
   * 1. 拉取用户发起的所有工单列表
   */
  .get('/ticket', async ({ userId, set }) => {
    requireAuth({ userId, set });

    const uid = BigInt(userId!);

    const list = await db.select()
      .from(ticketTable)
      .where(
        and(
          eq(ticketTable.userId, uid),
          eq(ticketTable.rootid, 0n)
        )
      )
      .orderBy(desc(ticketTable.id));

    return {
      status: 'success',
      data: list.map(tkt => ({
        id: tkt.id,
        title: tkt.title,
        status: tkt.status === 1 ? 'open' : 'closed',
        datetime: new Date(Number(tkt.datetime) * 1000).toISOString().replace('T', ' ').substring(0, 19)
      }))
    };
  })

  /**
   * 2. 提交创建新客服工单
   */
  .post('/ticket', async ({ userId, body, set }) => {
    requireAuth({ userId, set });

    const uid = BigInt(userId!);
    const { title, content } = body;

    if (!title.trim() || !content.trim()) {
      set.status = 400;
      return { status: 'error', message: '工单标题和内容不能为空。' };
    }

    const result = await db.insert(ticketTable).values({
      title: title,
      content: content,
      rootid: 0n,
      userId: uid,
      datetime: BigInt(Math.floor(Date.now() / 1000)),
      status: 1
    });

    return {
      status: 'success',
      message: '工单已提交成功，客服会尽快处理您的诉求。',
      data: {
        id: result[0]?.insertId
      }
    };
  }, {
    body: t.Object({
      title: t.String(),
      content: t.String()
    })
  })

  /**
   * 3. 查看某个工单详情及全追加追问对话记录
   */
  .get('/ticket/:id', async ({ userId, params, set }) => {
    requireAuth({ userId, set });

    const uid = BigInt(userId!);
    const tktId = BigInt(params.id);

    // A. 抓取主工单
    const mainTkts = await db.select()
      .from(ticketTable)
      .where(
        and(
          eq(ticketTable.id, Number(tktId)),
          eq(ticketTable.userId, uid),
          eq(ticketTable.rootid, 0n)
        )
      )
      .limit(1);

    if (mainTkts.length === 0) {
      set.status = 404;
      return { status: 'error', message: '工单不存在或无权访问该工单。' };
    }

    const mainTkt = mainTkts[0];

    // B. 抓取所有追加对话 (子工单)
    const replies = await db.select()
      .from(ticketTable)
      .where(eq(ticketTable.rootid, tktId))
      .orderBy(asc(ticketTable.id));

    // 合并主工单首发内容与回复流
    const chatFlow = [
      {
        id: mainTkt.id,
        role: 'user',
        content: mainTkt.content,
        datetime: new Date(Number(mainTkt.datetime) * 1000).toISOString().replace('T', ' ').substring(0, 19)
      },
      ...replies.map(rep => {
        // 如果回复中的 userId 等于当前 uid 则说明是用户自己追问的，否则是客服/管理员回复的
        const isSelf = rep.userId === uid;
        return {
          id: rep.id,
          role: isSelf ? 'user' : 'support',
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
   * 4. 追加工单回复 (追问)
   */
  .put('/ticket/:id', async ({ userId, params, body, set }) => {
    requireAuth({ userId, set });

    const uid = BigInt(userId!);
    const tktId = BigInt(params.id);
    const { content } = body;

    if (!content.trim()) {
      set.status = 400;
      return { status: 'error', message: '回复内容不能为空。' };
    }

    // 验证主工单是否存在且属于自己
    const mainTkts = await db.select()
      .from(ticketTable)
      .where(
        and(
          eq(ticketTable.id, Number(tktId)),
          eq(ticketTable.userId, uid),
          eq(ticketTable.rootid, 0n)
        )
      )
      .limit(1);

    if (mainTkts.length === 0) {
      set.status = 404;
      return { status: 'error', message: '工单不存在或无权访问该工单。' };
    }

    const nowSec = BigInt(Math.floor(Date.now() / 1000));

    // A. 插入追加会话记录
    await db.insert(ticketTable).values({
      title: '', // 追加回复无需标题
      content: content,
      rootid: tktId,
      userId: uid,
      datetime: nowSec,
      status: 1
    });

    // B. 将主工单的状态更新为 1 (若已被结单，用户追加则重新开启)
    await db.update(ticketTable)
      .set({ status: 1 })
      .where(eq(ticketTable.id, Number(tktId)));

    return {
      status: 'success',
      message: '回复提交成功！'
    };
  }, {
    body: t.Object({
      content: t.String()
    })
  });
