import { Elysia, t } from 'elysia';
import { db } from '../../config/database';
import { shopTable, boughtTable, couponTable, userTable } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { authDerive, requireAuth } from '../../middleware/auth';
import { Decimal } from 'decimal.js';

export const userShopController = new Elysia({ prefix: '/user' })
  .derive(authDerive)
  /**
   * 1. 获取所有在售套餐商品列表
   */
  .get('/shop', async ({ userId, set }) => {
    requireAuth({ userId, set });

    const activeShops = await db.select()
      .from(shopTable)
      .where(eq(shopTable.status, 1));

    return {
      status: 'success',
      data: activeShops.map(shop => ({
        id: shop.id,
        name: shop.name,
        price: shop.price,
        content: shop.content,
        auto_renew: shop.autoRenew === 1,
        auto_reset_bandwidth: shop.autoResetBandwidth === 1
      }))
    };
  })

  /**
   * 2. 校验优惠券是否可用及折扣数
   */
  .post('/coupon/check', async ({ userId, body, set }) => {
    requireAuth({ userId, set });

    const { code, shop_id } = body;

    const coupons = await db.select()
      .from(couponTable)
      .where(eq(couponTable.code, code))
      .limit(1);

    if (coupons.length === 0) {
      set.status = 400;
      return { status: 'error', message: '优惠券不存在。' };
    }

    const coupon = coupons[0];
    const nowSec = Math.floor(Date.now() / 1000);

    // 校验过期时间
    if (Number(coupon.expire) < nowSec) {
      set.status = 400;
      return { status: 'error', message: '该优惠券已过期。' };
    }

    // 校验适用商品
    const shopList = coupon.shop.split(',');
    if (coupon.shop !== '*' && !shopList.includes(shop_id.toString())) {
      set.status = 400;
      return { status: 'error', message: '该优惠券不适用于所选套餐。' };
    }

    return {
      status: 'success',
      data: {
        id: coupon.id,
        code: coupon.code,
        credit: coupon.credit
      }
    };
  }, {
    body: t.Object({
      code: t.String(),
      shop_id: t.Number()
    })
  })

  /**
   * 3. 购买商品下单接口 (使用事务和行级排他锁防高并发重复刷取，高精度财务计算)
   */
  .post('/buy', async ({ userId, body, set }) => {
    requireAuth({ userId, set });

    const uid = userId!;
    const { shop_id, coupon_code } = body;

    try {
      const result = await db.transaction(async (tx) => {
        // A. 锁定用户并验证
        const users = await tx.select()
          .from(userTable)
          .where(eq(userTable.id, uid))
          .for('update');

        if (users.length === 0) {
          throw new Error('用户账号不存在。');
        }

        const user = users[0];
        if (user.enable === 0) {
          throw new Error('您的账户已被禁用，无法购买商品。');
        }

        // B. 获取商品并验证
        const shops = await tx.select()
          .from(shopTable)
          .where(eq(shopTable.id, shop_id))
          .limit(1);

        if (shops.length === 0 || shops[0].status === 0) {
          throw new Error('商品不存在或已下架。');
        }

        const shop = shops[0];

        // C. 优惠券校验与最终价格计算
        let finalPrice = new Decimal(shop.price);
        let usedCoupon = '';

        if (coupon_code) {
          const coupons = await tx.select()
            .from(couponTable)
            .where(eq(couponTable.code, coupon_code))
            .limit(1);

          if (coupons.length === 0) {
            throw new Error('优惠券代码不存在。');
          }

          const coupon = coupons[0];
          const nowSec = Math.floor(Date.now() / 1000);

          if (Number(coupon.expire) < nowSec) {
            throw new Error('该优惠券已过期。');
          }

          const shopList = coupon.shop.split(',');
          if (coupon.shop !== '*' && !shopList.includes(shop_id.toString())) {
            throw new Error('该优惠券不适用于所选商品。');
          }

          const credit = new Decimal(coupon.credit);
          if (credit.gt(0) && credit.lt(100)) {
            // 百分比折扣
            finalPrice = finalPrice.times(new Decimal(100).minus(credit).div(100));
          } else if (credit.gte(100)) {
            // 抵扣固定金额
            finalPrice = finalPrice.minus(credit);
          }

          if (finalPrice.lt(0)) {
            finalPrice = new Decimal(0);
          }

          usedCoupon = coupon.code;
        }

        // D. 校验余额
        const userMoney = new Decimal(user.money);
        if (userMoney.lt(finalPrice)) {
          throw new Error('余额不足，请先充值。');
        }

        const nextMoneyStr = userMoney.minus(finalPrice).toFixed(2);

        // E. 解析商品 content 并核算服务权益
        let giftBandwidthBytes = 0n;
        let setClass = user.class;
        let classExpireDays = 30; // 默认增加/覆盖 30 天等级

        try {
          // 尝试以 JSON 格式解析 shop.content
          const parsed = JSON.parse(shop.content);
          if (parsed.bandwidth) {
            const bw = Number(parsed.bandwidth);
            giftBandwidthBytes = BigInt(bw) * (bw < 50000 ? 1024n * 1024n * 1024n : 1n);
          }
          if (parsed.class !== undefined) {
            setClass = Number(parsed.class);
          }
          if (parsed.expire !== undefined) {
            classExpireDays = Number(parsed.expire);
          }
        } catch (e) {
          // 兼容非 JSON 纯文本形式 (使用正则匹配提取)
          const bwMatch = shop.content.match(/(?:bandwidth|流量|kb|mb|gb|tb)[:：\s]+(\d+)(gb|mb|tb|g|m|t)?/i);
          if (bwMatch) {
            const bwVal = BigInt(bwMatch[1]);
            const unit = (bwMatch[2] || '').toLowerCase();
            if (unit.startsWith('t')) {
              giftBandwidthBytes = bwVal * 1024n * 1024n * 1024n * 1024n;
            } else if (unit.startsWith('g') || unit === '') {
              giftBandwidthBytes = bwVal * 1024n * 1024n * 1024n;
            } else if (unit.startsWith('m')) {
              giftBandwidthBytes = bwVal * 1024n * 1024n;
            }
          }
          const classMatch = shop.content.match(/(?:class|等级)[:：\s]+(\d+)/i);
          if (classMatch) {
            setClass = Number(classMatch[1]);
          }
          const expireMatch = shop.content.match(/(?:expire|days|天数|时长)[:：\s]+(\d+)/i);
          if (expireMatch) {
            classExpireDays = Number(expireMatch[1]);
          }
        }

        // F. 计算新的等级过期时间
        let baseDate = new Date();
        if (user.class === setClass && user.classExpire && user.classExpire.getTime() > Date.now()) {
          baseDate = new Date(user.classExpire);
        }
        const newClassExpire = new Date(baseDate.getTime() + classExpireDays * 24 * 60 * 60 * 1000);

        // G. 扣费、充实流量及续期操作
        const newTransferEnable = giftBandwidthBytes > 0n ? giftBandwidthBytes : user.transferEnable;
        
        await tx.update(userTable)
          .set({
            money: nextMoneyStr,
            class: setClass,
            classExpire: newClassExpire,
            transferEnable: newTransferEnable,
            u: 0n, // 重置流量计数器
            d: 0n
          })
          .where(eq(userTable.id, user.id));

        // H. 插入已购记录 bought
        await tx.insert(boughtTable).values({
          userId: BigInt(user.id),
          shopId: BigInt(shop.id),
          datetime: BigInt(Math.floor(Date.now() / 1000)),
          renew: BigInt(Math.floor(Date.now() / 1000) + 30 * 86400), // 下次续费时间 30 天后
          coupon: usedCoupon,
          price: finalPrice.toFixed(2)
        });

        return {
          money: nextMoneyStr,
          class: setClass,
          classExpire: newClassExpire.toISOString().replace('T', ' ').substring(0, 19)
        };
      });

      return {
        status: 'success',
        message: '购买成功！已成功扣费并充实您的账户权益。',
        data: result
      };
    } catch (err: any) {
      set.status = 400;
      return {
        status: 'error',
        message: err.message || '购买套餐失败，请稍后再试。'
      };
    }
  }, {
    body: t.Object({
      shop_id: t.Number(),
      coupon_code: t.Optional(t.String())
    })
  });
