import { Elysia, t } from 'elysia';
import { db } from '../../config/database';
import { shopTable } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { authDerive, requireAdmin } from '../../middleware/auth';

export const adminShopController = new Elysia({ prefix: '/admin' })
  .derive(authDerive)
  /**
   * 1. 获取所有套餐商品列表
   */
  .get('/shop', async ({ userId, isAdmin, set }) => {
    requireAdmin({ userId, isAdmin, set });

    const list = await db.select().from(shopTable);

    return {
      status: 'success',
      data: list.map(shop => ({
        id: shop.id,
        name: shop.name,
        price: shop.price,
        content: shop.content,
        auto_renew: shop.autoRenew === 1,
        auto_reset_bandwidth: shop.autoResetBandwidth === 1,
        status: shop.status === 1 ? 'on_sale' : 'hidden'
      }))
    };
  })

  /**
   * 1.5 获取单个套餐详情
   */
  .get('/shop/:id', async ({ userId, isAdmin, params, set }) => {
    requireAdmin({ userId, isAdmin, set });

    const shopId = Number(params.id);
    const rows = await db.select().from(shopTable).where(eq(shopTable.id, shopId)).limit(1);

    if (rows.length === 0) {
      set.status = 404;
      return { status: 'error', message: '商品套餐不存在。' };
    }

    const shop = rows[0];

    return {
      status: 'success',
      data: {
        id: shop.id,
        name: shop.name,
        price: shop.price,
        content: shop.content,
        auto_renew: shop.autoRenew === 1,
        auto_reset_bandwidth: shop.autoResetBandwidth === 1,
        status: shop.status === 1 ? 'on_sale' : 'hidden'
      }
    };
  })

  /**
   * 2. 创建新套餐商品
   */
  .post('/shop', async ({ userId, isAdmin, body, set }) => {
    requireAdmin({ userId, isAdmin, set });

    const { name, price, content, auto_renew, auto_reset_bandwidth, status } = body;
    const priceStr = typeof price === 'number' ? price.toFixed(2) : price;

    const result = await db.insert(shopTable).values({
      name: name,
      price: priceStr,
      content: content,
      autoRenew: auto_renew ? 1 : 0,
      autoResetBandwidth: auto_reset_bandwidth ? 1 : 0,
      status: status ? 1 : 0
    });

    return {
      status: 'success',
      message: '创建商品套餐成功！',
      data: {
        id: result[0]?.insertId
      }
    };
  }, {
    body: t.Object({
      name: t.String(),
      price: t.Union([t.String(), t.Number()]),
      content: t.String(),
      auto_renew: t.Optional(t.Boolean()),
      auto_reset_bandwidth: t.Optional(t.Boolean()),
      status: t.Optional(t.Boolean())
    })
  })

  /**
   * 3. 更新现有套餐商品
   */
  .put('/shop/:id', async ({ userId, isAdmin, params, body, set }) => {
    requireAdmin({ userId, isAdmin, set });

    const shopId = Number(params.id);
    const { name, price, content, auto_renew, auto_reset_bandwidth, status } = body;
    const priceStr = typeof price === 'number' ? price.toFixed(2) : price;

    const rows = await db.select().from(shopTable).where(eq(shopTable.id, shopId)).limit(1);
    if (rows.length === 0) {
      set.status = 404;
      return { status: 'error', message: '商品套餐不存在。' };
    }

    await db.update(shopTable)
      .set({
        name: name,
        price: priceStr,
        content: content,
        autoRenew: auto_renew ? 1 : 0,
        autoResetBandwidth: auto_reset_bandwidth ? 1 : 0,
        status: status ? 1 : 0
      })
      .where(eq(shopTable.id, shopId));

    return {
      status: 'success',
      message: '更新商品套餐成功！'
    };
  }, {
    body: t.Object({
      name: t.String(),
      price: t.Union([t.String(), t.Number()]),
      content: t.String(),
      auto_renew: t.Optional(t.Boolean()),
      auto_reset_bandwidth: t.Optional(t.Boolean()),
      status: t.Optional(t.Boolean())
    })
  })

  /**
   * 4. 删除商品套餐
   */
  .delete('/shop/:id', async ({ userId, isAdmin, params, set }) => {
    requireAdmin({ userId, isAdmin, set });

    const shopId = Number(params.id);

    const rows = await db.select().from(shopTable).where(eq(shopTable.id, shopId)).limit(1);
    if (rows.length === 0) {
      set.status = 404;
      return { status: 'error', message: '商品套餐不存在。' };
    }

    await db.delete(shopTable).where(eq(shopTable.id, shopId));

    return {
      status: 'success',
      message: '商品套餐已成功物理删除。'
    };
  });
