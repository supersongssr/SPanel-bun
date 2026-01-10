import Redis from 'ioredis'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  lazyConnect: true,
})

redis.on('error', (err) => {
  console.error('Redis Client Error:', err)
})

redis.on('connect', () => {
  console.log('✅ Redis connected successfully')
})

/**
 * Set cache with expiration
 */
export async function setCache(key: string, value: any, ttl: number = 3600) {
  await redis.setex(key, ttl, JSON.stringify(value))
}

/**
 * Get cache
 */
export async function getCache<T>(key: string): Promise<T | null> {
  const data = await redis.get(key)
  if (!data) return null
  return JSON.parse(data) as T
}

/**
 * Delete cache
 */
export async function deleteCache(key: string) {
  await redis.del(key)
}

/**
 * Delete cache by pattern
 */
export async function deleteCachePattern(pattern: string) {
  const keys = await redis.keys(pattern)
  if (keys.length > 0) {
    await redis.del(...keys)
  }
}
