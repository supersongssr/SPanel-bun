import { Elysia, t } from 'elysia';
import { db } from '../../config/database';
import { codeTable, boughtTable, userTable, shopTable } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';
import { authDerive, requireAdmin } from '../../middleware/auth';

/**
 * 随机字符生成器 (用于卡密生成)
 */
function generateRandomCode(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const adminCodeController = new Elysia({ prefix: '/admin' })
  .derive(authDerive)
  /**
   * 1. 获取充值卡密明细列表
   */
  .get('/code', async ({ userId, isAdmin, set }) => {
    requireAdmin({ userId, isAdmin, set });

    const list = await db.select({
      id: codeTable.id,
      code: codeTable.code,
      type: codeTable.type,
      number: codeTable.number,
      isused: codeTable.isused,
      userId: codeTable.userId,
      usedatetime: codeTable.usedatetime,
      userName: userTable.userName,
      userEmail: userTable.email
    })
      .from(codeTable)
      .leftJoin(userTable, eq(codeTable.userId, userTable.id))
      .orderBy(desc(codeTable.id));

    return {
      status: 'success',
      data: list.map(c => ({
        id: c.id,
        code: c.code,
        type: c.type, // 1: 充值金额, 2: 充值流量 (GB)
        number: c.number,
        is_used: c.isused === 1,
        used_at: c.usedatetime ? c.usedatetime.toISOString().replace('T', ' ').substring(0, 19) : '',
        user: c.isused === 1 ? {
          id: c.userId.toString(),
          userName: c.userName || '未知用户',
          email: c.userEmail || 'Deleted User'
        } : null
      }))
    };
  })

  /**
   * 2. 批量生成充值卡密
   */
  .post('/code', async ({ userId, isAdmin, body, set }) => {
    requireAdmin({ userId, isAdmin, set });

    const { amount, type, count, prefix } = body;

    const insertedIds: number[] = [];

    for (let i = 0; i < count; i++) {
      const codeStr = (prefix || 'SP') + generateRandomCode(24);
      
      const result = await db.insert(codeTable).values({
        code: codeStr,
        type: type, // 1: 充值金额, 2: 流量充值 (MB/GB)
        number: amount.toString(),
        isused: 0,
        userId: 0n, // 未使用时 UID 为 0
        usedatetime: new Date('1970-01-01 00:00:00')
      });
      insertedIds.push(result[0]?.insertId);
    }

    return {
      status: 'success',
      message: `成功批量生成了 ${count} 张充值激活卡密！`,
      data: {
        ids: insertedIds
      }
    };
  }, {
    body: t.Object({
      amount: t.Number(), // 面额 (例如 10元 余额 或 100GB 流量)
      type: t.Number(),   // 1: 余额充值卡, 2: 流量充值卡
      count: t.Number(),  // 批量生成张数
      prefix: t.Optional(t.String()) // 卡密前缀
    })
  })

  /**
   * 3. 获取所有已购商品套餐记录
   */
  .get('/bought', async ({ userId, isAdmin, set }) => {
    requireAdmin({ userId, isAdmin, set });

    const list = await db.select({
      id: boughtTable.id,
      price: boughtTable.price,
      coupon: boughtTable.coupon,
      datetime: boughtTable.datetime,
      renew: boughtTable.renew,
      userId: boughtTable.userId,
      userName: userTable.userName,
      userEmail: userTable.email,
      shopId: boughtTable.shopId,
      shopName: shopTable.name
    })
      .from(boughtTable)
      .leftJoin(userTable, eq(boughtTable.userId, userTable.id))
      .leftJoin(shopTable, eq(boughtTable.shopId, shopTable.id))
      .orderBy(desc(boughtTable.id));

    return {
      status: 'success',
      data: list.map(b => ({
        id: b.id,
        price: b.price,
        coupon: b.coupon || '无',
        datetime: new Date(Number(b.datetime) * 1000).toISOString().replace('T', ' ').substring(0, 19),
        renew: b.renew > 0n ? new Date(Number(b.renew) * 1000).toISOString().replace('T', ' ').substring(0, 19) : '永久有效',
        user: {
          id: b.userId.toString(),
          userName: b.userName || '未知用户',
          email: b.userEmail || 'Deleted User'
        },
        shop: {
          id: b.shopId.toString(),
          name: b.shopName || '未知商品套餐'
        }
      }))
    };
  });
