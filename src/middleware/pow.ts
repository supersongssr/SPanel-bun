import { createHash, randomBytes } from 'crypto';
import { redis } from '../config/redis';

// 基础算力挑战难度：4位十六进制前导零 (等价于二进制 16位 0 难度)
// 这对现代浏览器仅需 20ms - 200ms 的碰撞计算，但能彻底拖慢多线程 CC 机器
const BASE_DIFFICULTY = 4;

/**
 * 为客户端生成一个高熵的一次性工作量证明盐 (POW Salt)
 */
export async function generatePowChallenge(): Promise<{ salt: string; difficulty: number }> {
  const salt = randomBytes(16).toString('hex');
  
  // 将盐存入 Redis，有效期 5 分钟，一用即毁防重放
  await redis.set(`pow:salt:${salt}`, '1', 'EX', 300);
  
  return {
    salt,
    difficulty: BASE_DIFFICULTY,
  };
}

/**
 * 在服务端对客户端上报的 Nonce 进行一次性哈希校验
 */
export async function verifyPow(salt: string, nonce: string): Promise<boolean> {
  if (!salt || !nonce) return false;

  const redisKey = `pow:salt:${salt}`;
  
  // 1. 检验 salt 在 Redis 中是否存在 (必须由服务端分发)
  const exists = await redis.get(redisKey);
  if (!exists) return false;
  
  // 2. 消费该 salt，保证绝对单次使用，彻底杜绝重放攻击 (Replay Attacks)
  await redis.del(redisKey);

  // 3. 执行单次 SHA-256 哈希计算 (耗时极低，约 0.02ms，防洪成立)
  const calculatedHash = createHash('sha256')
    .update(salt + nonce)
    .digest('hex');

  // 4. 判断前导零数目是否符合 BASE_DIFFICULTY 难度指标
  const prefix = '0'.repeat(BASE_DIFFICULTY);
  return calculatedHash.startsWith(prefix);
}

/**
 * ElysiaJS 中间件：强制对 POST 关键表单提交进行 POW 验证
 */
export async function powGuardMiddleware({ body, set }: { body: any; set: any }) {
  const { powSalt, powNonce } = body || {};
  
  if (!powSalt || !powNonce) {
    set.status = 400;
    return {
      status: 'error',
      message: '安全工作量验证失败，请携带合法算力凭证。',
    };
  }

  const isValid = await verifyPow(powSalt, powNonce);
  if (!isValid) {
    set.status = 400;
    return {
      status: 'error',
      message: '工作量证明计算不匹配，算力挑战已失效或算力有误。',
    };
  }
}
