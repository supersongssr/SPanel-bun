import { mysqlTable, serial, int, varchar, bigint, decimal, tinyint, text, datetime } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

// 套餐商品表
export const shopTable = mysqlTable('shop', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  price: decimal('price', { precision: 12, scale: 2 }).notNull(),
  content: text('content').notNull(), // 商品描述与规格
  autoRenew: int('auto_renew').default(0).notNull(), // 是否支持自动续费
  autoResetBandwidth: int('auto_reset_bandwidth').default(0).notNull(), // 续费重置流量开关
  status: int('status').default(1).notNull(), // 1 在售，0 下架
});

// 会员已购套餐表
export const boughtTable = mysqlTable('bought', {
  id: serial('id').primaryKey(),
  userId: bigint('userid', { mode: 'bigint' }).notNull(),
  shopId: bigint('shopid', { mode: 'bigint' }).notNull(),
  datetime: bigint('datetime', { mode: 'bigint' }).notNull(), // 订购时间戳
  renew: bigint('renew', { mode: 'bigint' }).notNull(), // 下次自动扣费时间戳
  coupon: text('coupon').notNull(), // 订购时使用的优惠券
  price: decimal('price', { precision: 12, scale: 2 }).notNull(), // 实际扣费
});

// 充值与交易订单表
export const paylistTable = mysqlTable('paylist', {
  id: serial('id').primaryKey(),
  userId: bigint('userid', { mode: 'bigint' }).notNull(),
  total: decimal('total', { precision: 12, scale: 2 }).notNull(), // 充值总金额
  status: int('status').default(0).notNull(), // 0 未支付，1 已支付
  tradeno: text('tradeno'), // 支付网关交易单号
  type: int('type').default(0), // 支付渠道 (如支付宝、微信)
  url: varchar('url', { length: 255 }), // 支付网关跳转链接
  datetime: bigint('datetime', { mode: 'bigint' }).default(sql`0`).notNull(),
});

// 邀请人推广返利流水表
export const paybackTable = mysqlTable('payback', {
  id: serial('id').primaryKey(),
  total: decimal('total', { precision: 12, scale: 2 }).notNull(), // 消费总额
  userId: bigint('userid', { mode: 'bigint' }).notNull(), // 消费者 UID
  refBy: bigint('ref_by', { mode: 'bigint' }).notNull(), // 推广人 UID
  refGet: decimal('ref_get', { precision: 12, scale: 2 }).notNull(), // 推广人获取返利
  datetime: bigint('datetime', { mode: 'bigint' }).notNull(),
  callback: int('callback').default(0), // 回调状态
});

// 卡密激活表 (如余额卡密、流量卡密)
export const codeTable = mysqlTable('code', {
  id: serial('id').primaryKey(),
  code: text('code').notNull(), // 卡密原文
  type: int('type').notNull(), // 卡密类型
  number: decimal('number', { precision: 11, scale: 2 }).notNull(), // 充值面额
  isused: int('isused').default(0).notNull(), // 0 未使用，1 已使用
  userId: bigint('userid', { mode: 'bigint' }).notNull(), // 使用人 UID
  usedatetime: datetime('usedatetime').notNull(),
});

// 优惠券定义表
export const couponTable = mysqlTable('coupon', {
  id: serial('id').primaryKey(),
  code: text('code').notNull(), // 优惠券代码
  onetime: int('onetime').notNull(), // 是否一次性使用
  expire: bigint('expire', { mode: 'bigint' }).notNull(), // 过期时间戳
  shop: text('shop').notNull(), // 绑定的适用商品 ID (逗号分隔或JSON)
  credit: int('credit').notNull(), // 折扣比例 (如 20 代表 8 折，或者抵扣金额)
});

// Yft (易付通) 支付订单映射表
export const yftOrderInfoTable = mysqlTable('yft_order_info', {
  id: serial('id').primaryKey(),
  userId: int('user_id'),
  ssOrder: varchar('ss_order', { length: 50 }), // 站内本地订单号
  yftOrder: varchar('yft_order', { length: 50 }), // 易付通订单号
  price: varchar('price', { length: 10 }), // 交易总价
  state: tinyint('state').default(0), // 0 未支付，1 已支付
  createTime: datetime('create_time'), // 订单创建时间
});
