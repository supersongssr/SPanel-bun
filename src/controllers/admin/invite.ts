import { Elysia, t } from 'elysia';
import { db } from '../../config/database';
import { paybackTable, userTable } from '../../db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { authDerive, requireAdmin } from '../../middleware/auth';

export const adminInviteController = new Elysia({ prefix: '/admin' })
  .derive(authDerive)
  /**
   * 1. 获取全站邀请返利审计日志与指标
   */
  .get('/invite', async ({ userId, isAdmin, set }) => {
    requireAdmin({ userId, isAdmin, set });

    // A. 统计总返利金额和推广记录数
    const sumResult = await db.select({
      total_commission: sql<string>`sum(${paybackTable.refGet})`,
      count: sql<number>`count(${paybackTable.id})`
    }).from(paybackTable);

    const stats = {
      total_commission: sumResult[0]?.total_commission || '0.00',
      total_records: sumResult[0]?.count || 0
    };

    // B. 拉取具体返利记录明细并关联消费者和受益推广人
    const list = await db.select({
      id: paybackTable.id,
      total: paybackTable.total,
      refGet: paybackTable.refGet,
      datetime: paybackTable.datetime,
      consumerId: paybackTable.userId,
      consumerName: userTable.userName,
      consumerEmail: userTable.email
    })
      .from(paybackTable)
      .leftJoin(userTable, eq(paybackTable.userId, userTable.id))
      .orderBy(desc(paybackTable.id));

    // 由于 Drizzle 关联同一个表两次需要使用别名，为了保持极度轻量与高稳定，我们在内存或通过第二步关联推广人
    // 在这里我们拉取推广人
    const formattedList = await Promise.all(
      list.map(async (item) => {

        // 重新拉取一次真实的 refBy 关联
        const rawPayback = await db.select().from(paybackTable).where(eq(paybackTable.id, item.id)).limit(1);
        let promoter = { id: '0', userName: '系统/无', email: 'none' };
        
        if (rawPayback.length > 0 && rawPayback[0].refBy > 0n) {
          const promoterUser = await db.select().from(userTable).where(eq(userTable.id, Number(rawPayback[0].refBy))).limit(1);
          if (promoterUser.length > 0) {
            promoter = {
              id: promoterUser[0].id.toString(),
              userName: promoterUser[0].userName,
              email: promoterUser[0].email
            };
          }
        }

        return {
          id: item.id,
          total: item.total,
          ref_get: item.refGet,
          datetime: new Date(Number(item.datetime) * 1000).toISOString().replace('T', ' ').substring(0, 19),
          consumer: {
            id: item.consumerId.toString(),
            userName: item.consumerName || '未知用户',
            email: item.consumerEmail || 'Deleted User'
          },
          promoter
        };
      })
    );

    return {
      status: 'success',
      data: {
        stats,
        list: formattedList
      }
    };
  })

  /**
   * 2. 增加特定用户的可用邀请码链接额度 (inviteNum)
   */
  .post('/invite/add', async ({ userId, isAdmin, body, set }) => {
    requireAdmin({ userId, isAdmin, set });

    const { user_search, num } = body;

    if (num <= 0) {
      set.status = 400;
      return { status: 'error', message: '增加的邀请额度必须大于 0。' };
    }

    // 按 ID 或 邮箱 检索目标用户
    let targetUserRows;
    if (isNaN(Number(user_search))) {
      targetUserRows = await db.select().from(userTable).where(eq(userTable.email, user_search)).limit(1);
    } else {
      targetUserRows = await db.select().from(userTable).where(eq(userTable.id, Number(user_search))).limit(1);
    }

    if (targetUserRows.length === 0) {
      set.status = 404;
      return { status: 'error', message: '未找到该用户，请检查输入的用户 ID 或邮箱是否正确。' };
    }

    const targetUser = targetUserRows[0];
    const newInviteNum = targetUser.inviteNum + num;

    await db.update(userTable)
      .set({ inviteNum: newInviteNum })
      .where(eq(userTable.id, targetUser.id));

    return {
      status: 'success',
      message: `成功为用户 ${targetUser.userName} (${targetUser.email}) 增加了 ${num} 个可用邀请配额！当前配额为 ${newInviteNum}。`
    };
  }, {
    body: t.Object({
      user_search: t.String(), // 用户 ID 或邮箱
      num: t.Number()          // 增加的邀请额度数
    })
  });
