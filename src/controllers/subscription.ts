import { Elysia } from 'elysia';
import { db } from '../config/database';
import { redis } from '../config/redis';
import { linkTable, userTable, nodeTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { ipDerive } from '../middleware/ip';
import {
  classifyUserAgent,
  parseAll,
  renderUri,
  renderClash,
  renderSingBox,
  renderLoon,
  renderSurfboard,
  renderQuanX,
  NormalizedNode
} from '../services/subscription';

/**
 * 构造并统一格式化分发订阅警告节点
 */
function sendWarningSubscription(warningNode: NormalizedNode, ua: string, set: any): string {
  const format = classifyUserAgent(ua);
  let content = '';

  set.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate';

  if (format === 'clash') {
    set.headers['Content-Type'] = 'text/yaml; charset=utf-8';
    set.headers['Content-Disposition'] = 'inline; filename="SPanel-Warning-Clash.yaml"';
    content = renderClash([warningNode], { v2rayUuid: '' });
  } else if (format === 'singbox') {
    set.headers['Content-Type'] = 'application/json; charset=utf-8';
    content = renderSingBox([warningNode], { v2rayUuid: '' });
  } else if (format === 'quanx') {
    set.headers['Content-Type'] = 'text/plain; charset=utf-8';
    content = renderQuanX([warningNode], { v2rayUuid: '' });
  } else if (format === 'surfboard') {
    set.headers['Content-Type'] = 'text/plain; charset=utf-8';
    content = renderSurfboard([warningNode], { v2rayUuid: '' });
  } else if (format === 'loon') {
    set.headers['Content-Type'] = 'text/plain; charset=utf-8';
    content = renderLoon([warningNode], { v2rayUuid: '' });
  } else {
    set.headers['Content-Type'] = 'text/plain; charset=utf-8';
    const uriText = renderUri([warningNode], { passwd: '' });
    content = Buffer.from(uriText).toString('base64');
  }

  return content;
}

export const subscriptionController = new Elysia()
  .derive(ipDerive)
  .get('/link/:token', async ({ params, headers, ip, set }) => {
    const { token } = params;
    const ua = headers['user-agent'] || '';

    // 1. 安全防CC滑动窗口限流验证 (Redis 计数与集合)
    const now = Date.now();
    const keyMin = `rss_rate_limit_minute:${token}`;
    const keyHour = `rss_rate_limit_hour:${token}`;
    const keyIp = `rss_rate_limit_ip_hour:${token}`;

    // 1.1 sliding-window minute sliding window (11 requests/min)
    await redis.zremrangebyscore(keyMin, 0, now - 60000);
    const countMin = await redis.zcard(keyMin);

    // 1.2 sliding-window hour sliding window (30 requests/hour)
    await redis.zremrangebyscore(keyHour, 0, now - 3600000);
    const countHour = await redis.zcard(keyHour);

    // 1.3 unique IPs hourly limit check (16 unique IPs/hour)
    const isExistingIp = await redis.sismember(keyIp, ip);
    const ipCount = await redis.scard(keyIp);

    let isRateLimited = false;
    if (countMin >= 11 || countHour >= 30) {
      isRateLimited = true;
    } else if (!isExistingIp && ipCount >= 16) {
      isRateLimited = true;
    }

    if (isRateLimited) {
      const warningNode: NormalizedNode = {
        sort: 0,
        address: '127.0.0.1',
        port: '10086',
        password: 'warning',
        encryption: 'aes-128-gcm',
        isV2: '1',
        isWarning: true,
        isGemini: false,
        isNews: false,
        displayName: '⚠️ 订阅请求过于频繁(CC限流)，请稍后再试',
        trafficRate: 1,
        tlsEnabled: false
      };
      return sendWarningSubscription(warningNode, ua, set);
    }

    // 2. 数据库检索订阅映射记录
    const links = await db.select().from(linkTable).where(eq(linkTable.token, token)).limit(1);
    if (links.length === 0) {
      set.status = 404;
      return { status: 'error', message: '订阅地址无效或已失效，请重新获取。' };
    }

    const userId = Number(links[0].userId);
    const users = await db.select().from(userTable).where(eq(userTable.id, userId)).limit(1);
    if (users.length === 0) {
      set.status = 404;
      return { status: 'error', message: '关联的用户账号不存在。' };
    }

    const user = users[0];

    // 3. 校验账号启用状态 (若禁用返回警告节点)
    if (user.enable === 0) {
      const warningNode: NormalizedNode = {
        sort: 0,
        address: '127.0.0.1',
        port: '10086',
        password: 'warning',
        encryption: 'aes-128-gcm',
        isV2: '1',
        isWarning: true,
        isGemini: false,
        isNews: false,
        displayName: '⚠️ 您的账户已被禁用，请登录官网激活或联系管理员',
        trafficRate: 1,
        tlsEnabled: false
      };
      return sendWarningSubscription(warningNode, ua, set);
    }

    // 4. 统计并追加当前有效的请求限制计数
    await redis.zadd(keyMin, now, now.toString());
    await redis.expire(keyMin, 120);

    await redis.zadd(keyHour, now, now.toString());
    await redis.expire(keyHour, 7200);

    await redis.sadd(keyIp, ip);
    const ttl = await redis.ttl(keyIp);
    if (ttl < 0) {
      await redis.expire(keyIp, 3600);
    }

    // 5. 校验用户等级是否过期，若过期则在过滤节点时临时将等级降为 0
    let userClass = user.class;
    if (user.classExpire && new Date(user.classExpire).getTime() < now) {
      userClass = 0;
    }

    // 6. 获取数据库中所有可用展示物理节点 (type = 1 且 customRss = 1)
    const allDbNodes = await db.select().from(nodeTable).where(eq(nodeTable.type, 1));
    const allowedNodes = allDbNodes.filter(node => {
      // 过滤非 RSS 可用节点
      if (node.customRss !== 1) return false;
      // nodeGroup 匹配：0 为公共，或者匹配用户 nodeGroup
      const groupMatch = node.nodeGroup === 0 || node.nodeGroup === user.nodeGroup;
      // class 匹配：用户 class 必须 >= 节点要求的最低 nodeClass
      const classMatch = userClass >= node.nodeClass;
      return groupMatch && classMatch;
    });

    // 7. 解析所有节点并生成对应格式数据
    const format = classifyUserAgent(ua);
    const normalizedNodes = parseAll(allowedNodes, user, format, []);

    // 8. 挂载标准响应 Headers 与缓存策略
    const expireTime = user.classExpire ? Math.floor(new Date(user.classExpire).getTime() / 1000) : 0;
    set.headers['Subscription-Userinfo'] = `upload=${user.u}; download=${user.d}; total=${user.transferEnable}; expire=${expireTime}`;
    set.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate';

    let body = '';
    if (format === 'clash') {
      set.headers['Content-Type'] = 'text/yaml; charset=utf-8';
      set.headers['Content-Disposition'] = 'inline; filename="SPanel-Clash.yaml"';
      body = renderClash(normalizedNodes, user);
    } else if (format === 'singbox') {
      set.headers['Content-Type'] = 'application/json; charset=utf-8';
      body = renderSingBox(normalizedNodes, user);
    } else if (format === 'quanx') {
      set.headers['Content-Type'] = 'text/plain; charset=utf-8';
      body = renderQuanX(normalizedNodes, user);
    } else if (format === 'surfboard') {
      set.headers['Content-Type'] = 'text/plain; charset=utf-8';
      body = renderSurfboard(normalizedNodes, user);
    } else if (format === 'loon') {
      set.headers['Content-Type'] = 'text/plain; charset=utf-8';
      body = renderLoon(normalizedNodes, user);
    } else {
      set.headers['Content-Type'] = 'text/plain; charset=utf-8';
      const uriText = renderUri(normalizedNodes, user);
      body = Buffer.from(uriText).toString('base64');
    }

    return body;
  });
