import { mysqlTable, serial, int, varchar, bigint, decimal, tinyint, datetime } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

// 核心用户表
export const userTable = mysqlTable('user', {
  id: serial('id').primaryKey(),
  userName: varchar('user_name', { length: 128 }).notNull(),
  email: varchar('email', { length: 64 }).notNull().unique(),
  pass: varchar('pass', { length: 64 }).notNull(), // API 密码哈希
  passwd: varchar('passwd', { length: 16 }).notNull(), // SS 连接密码
  v2rayUuid: varchar('v2ray_uuid', { length: 64 }), // V2Ray UUID
  t: int('t').default(0).notNull(), // 上次连接时间
  u: bigint('u', { mode: 'bigint' }).notNull(), // 上行流量 (bytes)
  d: bigint('d', { mode: 'bigint' }).notNull(), // 下行流量 (bytes)
  plan: varchar('plan', { length: 2 }).default('A').notNull(),
  transferEnable: bigint('transfer_enable', { mode: 'bigint' }).notNull(), // 总可用流量 (bytes)
  transferLimit: bigint('transfer_limit', { mode: 'bigint' }).default(sql`1073741824`), // 旧版带宽限额 (bytes)
  port: int('port').notNull(), // 连接端口
  switch: tinyint('switch').default(1).notNull(), // 用户连接开关
  enable: tinyint('enable').default(1).notNull(), // 账户可用开关
  type: tinyint('type').default(1).notNull(), // 用户加密模式
  lastGetGiftTime: int('last_get_gift_time').default(0).notNull(),
  lastCheckInTime: int('last_check_in_time').default(0).notNull(),
  lastRestPassTime: int('last_rest_pass_time').default(0).notNull(),
  regDate: datetime('reg_date').notNull(),
  inviteNum: int('invite_num').notNull(),
  money: decimal('money', { precision: 12, scale: 2 }).notNull(), // 余额
  refBy: int('ref_by').default(0).notNull(), // 邀请人 UID
  score: int('score').default(0), // 积分
  expireTime: int('expire_time').default(0).notNull(),
  method: varchar('method', { length: 64 }).default('rc4-md5').notNull(), // SS 加密方法
  isEmailVerify: tinyint('is_email_verify').default(0).notNull(),
  regIp: varchar('reg_ip', { length: 128 }).default('127.0.0.1').notNull(),
  nodeSpeedlimit: decimal('node_speedlimit', { precision: 12, scale: 2 }).default('0.00').notNull(),
  nodeConnector: int('node_connector').default(0).notNull(),
  isAdmin: int('is_admin').default(0).notNull(), // 管理员标志
  imType: int('im_type').default(1),
  imValue: varchar('im_value', { length: 255 }),
  lastDayT: bigint('last_day_t', { mode: 'bigint' }).default(sql`0`).notNull(),
  isEdu: varchar('is_edu', { length: 64 }).default('0'),
  sendDailyMail: int('sendDailyMail').default(0).notNull(),
  class: int('class').default(0).notNull(), // 会员等级
  renew: int('renew').default(0), // 自动续费开关
  classExpire: datetime('class_expire').$defaultFn(() => new Date('1989-06-04 00:05:00')).notNull(), // 等级过期时间
  expireIn: datetime('expire_in').$defaultFn(() => new Date('2099-06-04 00:05:00')).notNull(), // 账户过期时间
  theme: varchar('theme', { length: 255 }).default('default').notNull(),
  gaToken: varchar('ga_token', { length: 255 }).default('').notNull(), // 2FA Token
  gaEnable: int('ga_enable').default(0).notNull(),
  pac: varchar('pac', { length: 255 }),
  remark: varchar('remark', { length: 255 }),
  nodeGroup: int('node_group').default(0).notNull(),
  autoResetDay: int('auto_reset_day').default(0).notNull(),
  autoResetBandwidth: decimal('auto_reset_bandwidth', { precision: 12, scale: 2 }).default('0.00').notNull(),
  protocol: varchar('protocol', { length: 128 }).default('origin'),
  protocolParam: varchar('protocol_param', { length: 128 }),
  obfs: varchar('obfs', { length: 128 }).default('plain'),
  obfsParam: varchar('obfs_param', { length: 128 }),
  forbiddenIp: varchar('forbidden_ip', { length: 255 }),
  forbiddenPort: varchar('forbidden_port', { length: 255 }),
  disconnectIp: varchar('disconnect_ip', { length: 255 }),
  isHide: int('is_hide').default(0).notNull(),
  isMultiUser: int('is_multi_user').default(0).notNull(),
  telegramId: bigint('telegram_id', { mode: 'bigint' }),
  banTimes: int('ban_times').default(0).notNull(),
  subLimit: int('sub_limit').default(16).notNull(),
  rssIp: varchar('rss_ip', { length: 64 }),
  rssCount: int('rss_count').default(0),
  rssCountLastday: int('rss_count_lastday').default(0),
  rssIpsCount: int('rss_ips_count').default(0),
  rssIpsLastday: int('rss_ips_lastday').default(0),
  cncdn: varchar('cncdn', { length: 64 }).default('0'),
  cfcdn: varchar('cfcdn', { length: 64 }).default('0'),
  renewTime: int('renew_time').default(0),
});

// 用户登录令牌表 (兼容旧版 PHP 临时会话验证)
export const userTokenTable = mysqlTable('user_token', {
  id: serial('id').primaryKey(),
  token: varchar('token', { length: 255 }).notNull(),
  userId: int('user_id').notNull(),
  createTime: int('create_time').notNull(),
  expireTime: int('expire_time').notNull(),
});
