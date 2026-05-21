import { SignJWT, jwtVerify } from 'jose';

// 安全读取或兜底 JWT 秘钥
const JWT_SECRET_STR = process.env.JWT_SECRET || 'spanel-bun-super-long-jwt-signing-secret-key-fallback';
const JWT_KEY = new TextEncoder().encode(JWT_SECRET_STR);

/**
 * 为已成功鉴权的用户签署 JWT 会话令牌
 * 有效期设为 7 天，兼顾运维便利与基本安全
 */
export async function signToken(userId: number, isAdmin: boolean): Promise<string> {
  return await new SignJWT({ userId, isAdmin: isAdmin ? 1 : 0 })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_KEY);
}

/**
 * 校验并解密 JWT，获得载荷
 */
export async function verifyToken(token: string): Promise<{ userId: number; isAdmin: boolean } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_KEY);
    return {
      userId: payload.userId as number,
      isAdmin: payload.isAdmin === 1,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Elysia 专用的声明式 JWT 会话派生中间件
 */
export async function authDerive({ request, set }: { request: Request; set: any }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { userId: null, isAdmin: false };
  }

  const token = authHeader.substring(7);
  const payload = await verifyToken(token);
  
  if (!payload) {
    return { userId: null, isAdmin: false };
  }

  return {
    userId: payload.userId,
    isAdmin: payload.isAdmin,
  };
}

/**
 * 强力阻断未登录请求的安全校验器
 */
export function requireAuth(context: { userId: number | null; set: any }) {
  if (!context.userId) {
    context.set.status = 401;
    throw new Error('未授权访问：请先登录系统获取合法凭证。');
  }
}

/**
 * 强力阻断非管理员请求的管理高特权校验器
 */
export function requireAdmin(context: { userId: number | null; isAdmin: boolean; set: any }) {
  if (!context.userId) {
    context.set.status = 401;
    throw new Error('未授权访问：请先登录。');
  }
  if (!context.isAdmin) {
    context.set.status = 403;
    throw new Error('权限不足：本操作仅限系统超级管理员执行。');
  }
}
