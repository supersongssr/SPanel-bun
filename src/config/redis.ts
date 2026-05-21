import Redis from 'ioredis';

const host = process.env.REDIS_HOST || '127.0.0.1';
const port = parseInt(process.env.REDIS_PORT || '6379', 10);
const password = process.env.REDIS_PASSWORD || undefined;

// 初始化带自动重连机制的高速 Redis 客户端
export const redis = new Redis({
  host,
  port,
  password,
  maxRetriesPerRequest: null,
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.slice(0, targetError.length) === targetError) {
      return true;
    }
    return false;
  },
  retryStrategy: (times) => {
    // 指数退避式断线重连，最大延迟 2 秒
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('connect', () => {
  console.log(`[Redis] Connected successfully to ${host}:${port}`);
});

redis.on('error', (err) => {
  console.error('[Redis] Connection error:', err);
});
