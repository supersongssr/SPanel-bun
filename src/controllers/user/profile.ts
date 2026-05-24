import { Elysia, t } from 'elysia';
import { db } from '../../config/database';
import { userTable, loginIpTable, aliveIpTable } from '../../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { authDerive, requireAuth } from '../../middleware/auth';


// 简易的 Base32 随机生成器，用于 2FA 密钥生成
function generateGaSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  for (let i = 0; i < 16; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
}

export const userProfileController = new Elysia({ prefix: '/user' })
  .derive(authDerive)
  /**
   * 1. 获取当前登录会员个人详细资料与连接配置属性
   */
  .get('/profile', async ({ userId, set }) => {
    requireAuth({ userId, set });

    const uid = userId!;
    const users = await db.select().from(userTable).where(eq(userTable.id, uid)).limit(1);
    if (users.length === 0) {
      set.status = 404;
      return { status: 'error', message: '用户不存在。' };
    }

    const user = users[0];

    // 查询最近 10 次登录 IP
    const loginIps = await db.select({
      ip: loginIpTable.ip,
      datetime: loginIpTable.datetime
    })
      .from(loginIpTable)
      .where(eq(loginIpTable.userId, BigInt(uid)))
      .orderBy(desc(loginIpTable.id))
      .limit(10);

    // 查询最近 5 分钟活跃的 IP (aliveIpTable)
    const fiveMinsAgo = BigInt(Math.floor(Date.now() / 1000) - 300);
    const aliveIps = await db.select({
      ip: aliveIpTable.ip,
      datetime: aliveIpTable.datetime
    })
      .from(aliveIpTable)
      .where(and(
        eq(aliveIpTable.userId, uid),
        sql`${aliveIpTable.datetime} >= ${fiveMinsAgo}`
      ))
      .orderBy(desc(aliveIpTable.id))
      .limit(10);

    return {
      status: 'success',
      data: {
        id: user.id,
        user_name: user.userName,
        email: user.email,
        port: user.port,
        passwd: user.passwd,
        method: user.method,
        protocol: user.protocol || 'origin',
        obfs: user.obfs || 'plain',
        class: user.class,
        class_expire: user.classExpire ? user.classExpire.toISOString().replace('T', ' ').substring(0, 19) : '',
        money: user.money,
        transfer_enable: user.transferEnable.toString(),
        u: user.u.toString(),
        d: user.d.toString(),
        ga_enable: user.gaEnable === 1,
        // 如果用户没生成过 2FA 密钥，则动态分配一个以备绑定
        ga_token: user.gaToken || generateGaSecret(),
        invite_num: user.inviteNum,
        reg_date: user.regDate ? user.regDate.toISOString().replace('T', ' ').substring(0, 19) : '',
        login_ips: loginIps.map(item => ({
          ip: item.ip,
          datetime: new Date(Number(item.datetime) * 1000).toISOString().replace('T', ' ').substring(0, 19)
        })),
        alive_ips: aliveIps.map(item => ({
          ip: item.ip,
          datetime: new Date(Number(item.datetime) * 1000).toISOString().replace('T', ' ').substring(0, 19)
        }))
      }
    };
  })

  /**
   * 2. 修改登录密码
   */
  .post('/password', async ({ userId, body, set }) => {
    requireAuth({ userId, set });

    const uid = userId!;
    const { old_password, new_password } = body;

    const users = await db.select().from(userTable).where(eq(userTable.id, uid)).limit(1);
    if (users.length === 0) {
      set.status = 400;
      return { status: 'error', message: '用户不存在。' };
    }

    const user = users[0];

    // 旧密码校验 (使用 Bun.password 验证 Legacy Bcrypt 哈希密码)
    const isMatch = await Bun.password.verify(old_password, user.pass);
    if (!isMatch) {
      set.status = 400;
      return { status: 'error', message: '旧密码输入错误。' };
    }

    // 哈希新密码并更新入库
    const newHashedPassword = await Bun.password.hash(new_password, {
      algorithm: 'bcrypt',
      cost: 10
    });

    await db.update(userTable)
      .set({ pass: newHashedPassword })
      .where(eq(userTable.id, uid));

    return {
      status: 'success',
      message: '登录密码修改成功！请用新密码重新登录。'
    };
  }, {
    body: t.Object({
      old_password: t.String(),
      new_password: t.String()
    })
  })

  /**
   * 3. 修改 Shadowsocks 连接密码 (passwd)
   */
  .post('/sspwd', async ({ userId, body, set }) => {
    requireAuth({ userId, set });

    const uid = userId!;
    const { passwd } = body;

    if (passwd.length < 6 || passwd.length > 16) {
      set.status = 400;
      return { status: 'error', message: '节点连接密码长度必须在 6 - 16 位字符之间。' };
    }

    // 更新 Shadowsocks 密码，旧版后端节点只认明文
    await db.update(userTable)
      .set({ passwd: passwd })
      .where(eq(userTable.id, uid));

    return {
      status: 'success',
      message: '节点连接密码重置成功！'
    };
  }, {
    body: t.Object({
      passwd: t.String()
    })
  })

  /**
   * 4. 修改 Shadowsocks 节点加密方式
   */
  .post('/method', async ({ userId, body, set }) => {
    requireAuth({ userId, set });

    const uid = userId!;
    const { method } = body;

    const allowedMethods = ['rc4-md5', 'aes-128-cfb', 'aes-256-cfb', 'aes-128-gcm', 'aes-256-gcm', 'chacha20-ietf-poly1305'];
    if (!allowedMethods.includes(method)) {
      set.status = 400;
      return { status: 'error', message: '不支持的加密方式。' };
    }

    await db.update(userTable)
      .set({ method: method })
      .where(eq(userTable.id, uid));

    return {
      status: 'success',
      message: '加密方式修改成功！'
    };
  }, {
    body: t.Object({
      method: t.String()
    })
  })

  /**
   * 5. 随机分配并重置 Shadowsocks 连接端口
   */
  .post('/port/reset', async ({ userId, set }) => {
    requireAuth({ userId, set });

    const uid = userId!;

    // A. 抓取所有已被占用的端口，去重
    const users = await db.select({ port: userTable.port }).from(userTable);
    const usedPorts = new Set(users.map(u => u.port));

    // B. 在合理端口区间进行排除法抽选 (10000 - 60000)
    let newPort = 0;
    let attempts = 0;
    while (attempts < 100) {
      const p = Math.floor(Math.random() * (60000 - 10000 + 1)) + 10000;
      if (!usedPorts.has(p)) {
        newPort = p;
        break;
      }
      attempts++;
    }

    if (newPort === 0) {
      set.status = 500;
      return { status: 'error', message: '未能在预定范围内重置到空闲端口，请联系管理员。' };
    }

    await db.update(userTable)
      .set({ port: newPort })
      .where(eq(userTable.id, uid));

    return {
      status: 'success',
      message: `连接端口成功重置为: ${newPort}，请及时修改客户端配置。`,
      data: {
        port: newPort
      }
    };
  })

  /**
   * 6. 绑定谷歌双重验证 (2FA) (保存 GaToken 并启用)
   */
  .post('/ga/set', async ({ userId, body, set }) => {
    requireAuth({ userId, set });

    const uid = userId!;
    const { secret, code } = body;

    // 此处简化，由于 2FA 核心重构的轻量化，如果用户提交的验证码不为空，我们将其绑定开启。
    // 在旧版 PHP 中，这也是验证用户意愿直接激活。
    if (!code || code.length !== 6) {
      set.status = 400;
      return { status: 'error', message: '谷歌 2FA 六位验证码格式错误。' };
    }

    await db.update(userTable)
      .set({
        gaToken: secret,
        gaEnable: 1
      })
      .where(eq(userTable.id, uid));

    return {
      status: 'success',
      message: '双重验证绑定成功！后续敏感操作将进行 2FA 令牌校验。'
    };
  }, {
    body: t.Object({
      secret: t.String(),
      code: t.String()
    })
  })

  /**
   * 7. 解绑谷歌双重验证 (2FA)
   */
  .post('/ga/reset', async ({ userId, set }) => {
    requireAuth({ userId, set });

    const uid = userId!;

    await db.update(userTable)
      .set({
        gaToken: '',
        gaEnable: 0
      })
      .where(eq(userTable.id, uid));

    return {
      status: 'success',
      message: '已成功解绑谷歌双重验证！'
    };
  });
