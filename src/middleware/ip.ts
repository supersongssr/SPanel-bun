/**
 * 从多级反代及 CDN 标头中精准解析出客户端的物理真实 IP
 */
export function getClientIp(request: Request): string {
  // 1. 优先获取 Cloudflare 节点转发的真实客户端 IP
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();

  // 2. 其次获取多级代理转发标头 (取最左侧的 IP)
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const ips = xForwardedFor.split(',');
    if (ips.length > 0) {
      return ips[0].trim();
    }
  }

  // 3. 兜底获取常规代理或本地环回 IP
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return '127.0.0.1';
}

/**
 * ElysiaJS IP 真实解析与动态状态派生拦截器
 */
export function ipDerive({ request }: { request: Request }) {
  const ip = getClientIp(request);
  return { ip };
}

/**
 * 对恶意高频刷单或特定被拉黑的 IP 执行实时 403 阻断
 * 可在未来与 Redis 的封禁 IP ZSet 列表实时挂钩
 */
export async function ipBlockGuard({ ip, set }: { ip: string; set: any }) {
  // 此处可扩展读取 Redis 禁封库：const isBanned = await redis.sismember('spanel:banned:ips', ip);
  const isBanned = false; // 占位，可在阶段四进行全面实装
  
  if (isBanned) {
    set.status = 403;
    return {
      status: 'error',
      message: '访问拒绝：由于检测到异常请求行为，您的 IP 已被系统安全拦截封禁。',
    };
  }
}
