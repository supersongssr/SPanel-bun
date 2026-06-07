import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../db/schema';

// 检查必要的环境变量
const host = process.env.MYSQL_HOST || '127.0.0.1';
const port = parseInt(process.env.MYSQL_PORT || '3306', 10);
const user = process.env.MYSQL_USER || 'spanel';
const password = process.env.MYSQL_PASSWORD || '';
const database = process.env.MYSQL_DATABASE || 'spanel';

// 建立带 Keep-Alive 的高性能 MySQL 连接池，兼容 MySQL 5.6
const poolConnection = mysql.createPool({
  host,
  port,
  user,
  password,
  database,
  connectionLimit: 50, // 并发连接最大数
  maxIdle: 10, // 最大空闲连接数
  idleTimeout: 30000, // 30秒无活动则断开空闲连接
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

// 绑定强类型 ORM schema 实例
export const db = drizzle(poolConnection, { schema, mode: 'default' });
export { poolConnection };
