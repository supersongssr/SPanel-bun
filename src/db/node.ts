import { mysqlTable, serial, int, varchar, bigint, decimal, tinyint, text } from 'drizzle-orm/mysql-core';

// 边缘物理节点表
export const nodeTable = mysqlTable('ss_node', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 128 }).notNull(),
  type: int('type').default(1).notNull(), // 1显示 0不显示
  server: varchar('server', { length: 500 }).notNull(),
  method: varchar('method', { length: 64 }).notNull(),
  info: varchar('info', { length: 128 }).notNull(),
  status: varchar('status', { length: 128 }).notNull(),
  sort: int('sort').default(0).notNull(),
  customMethod: tinyint('custom_method').default(0).notNull(),
  trafficRate: decimal('traffic_rate', { precision: 5, scale: 2 }).default('1.00').notNull(),
  nodeSpeedlimit: decimal('node_speedlimit', { precision: 12, scale: 2 }).default('0.00').notNull(),
  nodeConnector: int('node_connector').default(0).notNull(),
  nodeBandwidth: decimal('node_bandwidth', { precision: 12, scale: 2 }).default('0.00').notNull(),
  nodeHeartbeat: bigint('node_heartbeat', { mode: 'bigint' }).default(0n).notNull(),
  nodeIp: varchar('node_ip', { length: 255 }),
  nodeGroup: int('node_group').default(0).notNull(),
  customRss: int('custom_rss').default(0).notNull(),
  muOnly: int('mu_only').default(0),
  nodeRxtx: varchar('node_rxtx', { length: 10 }).default('tx').notNull(), // 'rx', 'tx', 'rxtx'
  trafficResetDay: int('traffic_reset_day').default(0).notNull(),
  nodeCost: int('node_cost').default(5).notNull(),
  nodeOnline: int('node_online').default(1).notNull(),
  nodeOncost: decimal('node_oncost', { precision: 5, scale: 2 }).default('0.00').notNull(),
  nodeSort: int('node_sort').default(0),
  cncdn: tinyint('cncdn'),
  isClone: int('is_clone').default(0),
  trafficUsed: bigint('traffic_used', { mode: 'bigint' }).default(0n),
  trafficLeft: bigint('traffic_left', { mode: 'bigint' }).default(0n),
  trafficUsedDaily: bigint('traffic_used_daily', { mode: 'bigint' }).default(0n),
  trafficLeftDaily: bigint('traffic_left_daily', { mode: 'bigint' }).default(0n),
  trafficLimit: bigint('traffic_limit', { mode: 'bigint' }).default(0n).notNull(),
  trafficRawTotal: bigint('traffic_raw_total', { mode: 'bigint' }).default(0n).notNull(),
  nodeIds: text('node_ids'),
  nodeUnlock: varchar('node_unlock', { length: 500 }).default(''),
  countryCode: varchar('country_code', { length: 32 }).default(''),
  serverUptime: int('server_uptime').default(0).notNull(),
});

// 节点运行状况监控表
export const nodeInfoTable = mysqlTable('ss_node_info', {
  id: serial('id').primaryKey(),
  nodeId: int('node_id').notNull(),
  uptime: decimal('uptime', { precision: 12, scale: 4 }).notNull(),
  load: varchar('load', { length: 32 }).notNull(),
  logTime: int('log_time').notNull(),
});

// 节点在线人数历史记录表
export const nodeOnlineLogTable = mysqlTable('ss_node_online_log', {
  id: serial('id').primaryKey(),
  nodeId: int('node_id').notNull(),
  onlineUser: int('online_user').notNull(),
  logTime: int('log_time').notNull(),
});

// 端口中转/转发规则表
export const relayTable = mysqlTable('relay', {
  id: serial('id').primaryKey(),
  userId: bigint('user_id', { mode: 'bigint' }).notNull(),
  sourceNodeId: bigint('source_node_id', { mode: 'bigint' }).notNull(),
  distNodeId: bigint('dist_node_id', { mode: 'bigint' }).notNull(),
  distIp: text('dist_ip').notNull(),
  port: int('port').notNull(),
  priority: int('priority').notNull(),
});

// DNS 智能解析规则表
export const dnsRecordsTable = mysqlTable('dns_records', {
  id: serial('id').primaryKey(),
  nodeId: int('node_id').notNull(),
  recordType: varchar('record_type', { length: 10 }).default('A').notNull(), // 'A', 'AAAA'
  subdomain: varchar('subdomain', { length: 255 }).notNull(),
  rootDomain: varchar('root_domain', { length: 255 }).notNull(),
  content: varchar('content', { length: 255 }).notNull(),
  proxied: tinyint('proxied').default(0).notNull(),
  ttl: int('ttl').default(120).notNull(),
  cfRecordId: varchar('cf_record_id', { length: 128 }),
  updatedAt: int('updated_at').default(0).notNull(),
});
