import { Elysia } from 'elysia';
import { db } from '../../config/database';
import { paybackTable, userTable } from '../../db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { authDerive, requireAuth } from '../../middleware/auth';

/**
 * 辅助函数：脱敏邮箱地址，保障用户隐私
 */
function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length < 2) return email;
  const name = parts[0];
  const domain = parts[1];
  if (name.length <= 2) return name.charAt(0) + '***@' + domain;
  return name.substring(0, 2) + '****' + name.substring(name.length - 1) + '@' + domain;
}

export const userInviteController = new Elysia({ prefix: '/user' })
  .derive(authDerive)
  /**
   * 获取当前用户的邀请和推广返利对账明细
   */
  .get('/invite', async ({ userId, set }) => {
    requireAuth({ userId, set });

    const uid = userId!;

    // 1. 获取当前用户基本信息（邀请配额）
    const users = await db.select().from(userTable).where(eq(userTable.id, uid)).limit(1);
    if (users.length === 0) {
      set.status = 404;
      return { status: 'error', message: '用户账号不存在。' };
    }
    const user = users[0];

    // 2. 统计累积推广返利总金额
    const sumResult = await db.select({
      total_earned: sql<string>`sum(${paybackTable.refGet})`
    })
      .from(paybackTable)
      .where(eq(paybackTable.refBy, BigInt(uid)));
    
    const totalEarned = sumResult[0]?.total_earned || '0.00';

    // 3. 获取所有被当前用户邀请的下线用户列表 (Referred Friends)
    const downlineList = await db.select({
      id: userTable.id,
      userName: userTable.userName,
      email: userTable.email,
      regDate: userTable.regDate
    })
      .from(userTable)
      .where(eq(userTable.refBy, uid))
      .orderBy(desc(userTable.id))
      .limit(100);

    const formattedDownlines = downlineList.map(friend => ({
      id: friend.id.toString(),
      user_name: friend.userName,
      email: maskEmail(friend.email),
      reg_date: friend.regDate ? friend.regDate.toISOString().replace('T', ' ').substring(0, 19) : ''
    }));

    // 4. 获取推广返佣历史记录明细流水 (Rebate Payback Logs)
    const rebateList = await db.select({
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
      .where(eq(paybackTable.refBy, BigInt(uid)))
      .orderBy(desc(paybackTable.id))
      .limit(100);

    const formattedRebates = rebateList.map(reb => ({
      id: reb.id,
      total: reb.total,
      ref_get: reb.refGet,
      datetime: new Date(Number(reb.datetime) * 1000).toISOString().replace('T', ' ').substring(0, 19),
      consumer: {
        id: reb.consumerId.toString(),
        userName: reb.consumerName || '已注销用户',
        email: reb.consumerEmail ? maskEmail(reb.consumerEmail!) : 'Deleted User'
      }
    }));

    return {
      status: 'success',
      data: {
        invite_num: user.inviteNum,
        total_earned: totalEarned,
        invite_url: `/auth/register.html?ref=${uid}`,
        downlines: formattedDownlines,
        rebates: formattedRebates
      }
    };
  });
