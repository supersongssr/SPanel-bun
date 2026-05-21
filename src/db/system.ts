import { mysqlTable, serial, int, varchar, bigint, decimal, text, datetime } from 'drizzle-orm/mysql-core';

// 全局动态配置表
export const configTable = mysqlTable('config', {
  name: varchar('name', { length: 255 }).primaryKey().notNull(), // 配置名称
  value: text('value'), // 配置数值 (通常以文本、JSON序列化或数字存在)
});

// 系统公告表
export const announcementTable = mysqlTable('announcement', {
  id: serial('id').primaryKey(),
  date: datetime('date').notNull(),
  content: text('content').notNull(), // HTML 渲染富文本
  markdown: text('markdown').notNull(), // MD 原始文本
});

// 客服工单表
export const ticketTable = mysqlTable('ticket', {
  id: serial('id').primaryKey(),
  title: text('title?').notNull(), // 工单标题 (旧版带有问号，对齐它)
  content: text('content').notNull(), // 工单正文 / 会话追问内容
  rootid: bigint('rootid', { mode: 'bigint' }).notNull(), // 父工单 ID (0为发起单，主键为父ID的为对话流)
  userId: bigint('userid', { mode: 'bigint' }).notNull(), // 提交会员 UID
  sort: int('sort').default(0), // 排序或优先级
  datetime: bigint('datetime', { mode: 'bigint' }).notNull(), // 时间戳
  status: int('status').default(1).notNull(), // 1 开启，0 已结单
});

// 邮箱验证验证码表
export const emailVerifyTable = mysqlTable('email_verify', {
  id: serial('id').primaryKey(),
  email: text('email').notNull(), // 目标邮箱
  ip: text('ip').notNull(), // 请求 IP
  code: text('code').notNull(), // 验证码文本
  expireIn: bigint('expire_in', { mode: 'bigint' }).notNull(), // 过期时间戳
});

// 密码重设申请表
export const ssPasswordResetTable = mysqlTable('ss_password_reset', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 32 }).notNull(),
  token: varchar('token', { length: 128 }).notNull(), // 找回密码 Token
  initTime: int('init_time').notNull(), // 发起时间戳
  expireTime: int('expire_time').notNull(), // 过期时间戳
});

// 会员登录历史审计表
export const loginIpTable = mysqlTable('login_ip', {
  id: serial('id').primaryKey(),
  userId: bigint('userid', { mode: 'bigint' }).notNull(),
  ip: text('ip').notNull(),
  datetime: bigint('datetime', { mode: 'bigint' }).notNull(),
  type: int('type').notNull(), // 登录类型 (如 Web, API 等)
});

// 节点活跃连接 IP 审计表 (用于高并发限制和防刷检测)
export const aliveIpTable = mysqlTable('alive_ip', {
  id: serial('id').primaryKey(),
  nodeId: int('nodeid').notNull(),
  userId: int('userid').notNull(),
  ip: text('ip').notNull(),
  datetime: bigint('datetime', { mode: 'bigint' }).notNull(),
});

// 流量消耗详细记录日志表
export const userTrafficLogTable = mysqlTable('user_traffic_log', {
  id: serial('id').primaryKey(),
  userId: int('user_id?').notNull(), // 旧版带有问号，对齐它
  u: bigint('u', { mode: 'bigint' }).notNull(),
  d: bigint('d', { mode: 'bigint' }).notNull(),
  nodeId: int('node_id').notNull(),
  rate: decimal('rate', { precision: 5, scale: 2 }).notNull(), // 流量扣费率
  traffic: varchar('traffic', { length: 32 }).notNull(), // 格式化流量显示
  logTime: int('log_time').notNull(),
});

// 系统自动化队列操作表
export const autoTable = mysqlTable('auto', {
  id: serial('id').primaryKey(),
  type: int('type').notNull(),
  value: text('value').notNull(),
  sign: text('sign').notNull(),
  datetime: bigint('datetime', { mode: 'bigint' }).notNull(),
});

// 订阅 Token 映射表
export const linkTable = mysqlTable('link', {
  id: serial('id').primaryKey(),
  type: int('type').notNull(),
  address: text('address').notNull(),
  port: int('port').notNull(),
  token: text('token').notNull(),
  ios: int('ios').default(0).notNull(),
  userId: bigint('userid', { mode: 'bigint' }).notNull(),
  isp: text('isp'),
  geo: int('geo'),
  method: text('method'),
});

