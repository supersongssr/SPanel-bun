import { Elysia, t } from 'elysia';
import { db } from '../../config/database';
import { couponTable } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';
import { authDerive, requireAdmin } from '../../middleware/auth';

export const adminCouponController = new Elysia({ prefix: '/admin' })
  .derive(authDerive)
  /**
   * 1. 获取所有优惠券列表
   */
  .get('/coupon', async ({ userId, isAdmin, set }) => {
    requireAdmin({ userId, isAdmin, set });

    const list = await db.select()
      .from(couponTable)
      .orderBy(desc(couponTable.id));

    return {
      status: 'success',
      data: list.map(c => ({
        id: c.id,
        code: c.code,
        onetime: c.onetime === 1,
        expire: Number(c.expire),
        expire_str: new Date(Number(c.expire) * 1000).toISOString().replace('T', ' ').substring(0, 19),
        shop: c.shop,
        credit: c.credit
      }))
    };
  })

  /**
   * 2. 创建优惠券
   */
  .post('/coupon', async ({ userId, isAdmin, body, set }) => {
    requireAdmin({ userId, isAdmin, set });

    const { code, onetime, expire, shop, credit } = body;

    const result = await db.insert(couponTable).values({
      code: code,
      onetime: onetime ? 1 : 0,
      expire: BigInt(expire),
      shop: shop,
      credit: credit
    });

    return {
      status: 'success',
      message: '优惠码发布成功！',
      data: {
        id: result[0]?.insertId
      }
    };
  }, {
    body: t.Object({
      code: t.String(),
      onetime: t.Boolean(),
      expire: t.Number(), // 过期时间戳 (秒)
      shop: t.String(),   // 适用商品 ID，空字符串代表适用所有商品，或者逗号分割 "1,2,3"
      credit: t.Number()  // 折扣比例 (如 20 代表八折优惠 20% off)
    })
  })

  /**
   * 3. 删除优惠券
   */
  .delete('/coupon/:id', async ({ userId, isAdmin, params, set }) => {
    requireAdmin({ userId, isAdmin, set });

    const couponId = Number(params.id);

    const rows = await db.select().from(couponTable).where(eq(couponTable.id, couponId)).limit(1);
    if (rows.length === 0) {
      set.status = 404;
      return { status: 'error', message: '优惠券不存在。' };
    }

    await db.delete(couponTable).where(eq(couponTable.id, couponId));

    return {
      status: 'success',
      message: '优惠券已成功作废删除。'
    };
  });
