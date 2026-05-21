import { db } from './database';
import { configTable } from '../db/schema';
import { redis } from './redis';
import { eq } from 'drizzle-orm';

// 内存配置高速缓冲器
const configCache = new Map<string, string>();

/**
 * 从数据库加载所有系统配置并同步缓存
 */
export async function loadConfig(): Promise<void> {
  try {
    const dbConfigs = await db.select().from(configTable);
    configCache.clear();

    const pipeline = redis.pipeline();
    
    for (const conf of dbConfigs) {
      const val = conf.value || '';
      configCache.set(conf.name, val);
      pipeline.hset('spanel:configs', conf.name, val);
    }
    
    await pipeline.exec();
    console.log(`[Config] Loaded ${configCache.size} configuration settings from database.`);
  } catch (error) {
    console.error('[Config] Failed to load configuration from database, trying Redis fallbacks...', error);
    
    // 如果数据库加载失败，尝试从 Redis 缓存降级读取
    const redisConfigs = await redis.hgetall('spanel:configs');
    if (Object.keys(redisConfigs).length > 0) {
      for (const [name, value] of Object.entries(redisConfigs)) {
        configCache.set(name, value);
      }
      console.log(`[Config] Recovered ${configCache.size} settings from Redis cache fallback.`);
    } else {
      console.warn('[Config] DB and Redis are both empty. Bootstrapping with clean memory.');
    }
  }
}

/**
 * 同步从内存中获取系统全局设置
 */
export function getConfig(name: string, defaultValue = ''): string {
  return configCache.get(name) ?? defaultValue;
}

/**
 * 动态修改并持久化特定系统配置
 */
export async function setConfig(name: string, value: string): Promise<void> {
  configCache.set(name, value);
  await redis.hset('spanel:configs', name, value);
  
  // 更新或插入数据库记录 (MySQL 5.6 兼容的 ON DUPLICATE KEY 逻辑)
  const exists = await db.select().from(configTable).where(eq(configTable.name, name)).limit(1);
  if (exists.length > 0) {
    await db.update(configTable)
      .set({ value })
      .where(eq(configTable.name, name));
  } else {
    await db.insert(configTable)
      .values({ name, value });
  }
  
  // 触发全局 Redis 动态发布订阅以实现多节点热刷新（后续可扩展）
  await redis.publish('spanel:config:update', JSON.stringify({ name, value }));
}
