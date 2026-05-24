import { db } from '../../config/database';
import { userTable, loginIpTable, emailVerifyTable } from '../../db/schema';
import { redis } from '../../config/redis';
import { eq, desc } from 'drizzle-orm';
import { checkPassword, passwordHash } from '../../utils/hash';
import { signToken } from '../../middleware/auth';
import { verifyPow } from '../../middleware/pow';
import { randomBytes, randomUUID } from 'crypto';
import { getConfig } from '../../config/app';
import { verifyGeetest } from '../../utils/geetest';

/**
 * 校验图形验证码或极验验证码并分发算力挑战 (POW Challenge)
 */
export async function handlePowRequest(body: any) {
  const provider = getConfig('captcha_provider', 'graphic');

  if (provider === 'geetest') {
    const { lot_number, captcha_output, pass_token, gen_time } = body.geetestParams || {};
    if (!lot_number || !captcha_output || !pass_token || !gen_time) {
      throw new Error('极验人机验证校验失败：验证参数不全。');
    }
    const isValid = await verifyGeetest(lot_number, captcha_output, pass_token, gen_time);
    if (!isValid) {
      throw new Error('极验人机校验未通过，请重新进行滑块校验。');
    }
  } else {
    const { captchaId, captchaCode } = body;
    if (!captchaId || !captchaCode) {
      throw new Error('图形验证码校验失败：参数不全。');
    }

    const redisKey = `captcha:${captchaId}`;
    const storedCode = await redis.get(redisKey);
    
    if (!storedCode || storedCode !== captchaCode.toLowerCase()) {
      throw new Error('图形验证码有误或已过期，请重新获取。');
    }

    // 验证码验证成功即销毁，防刷
    await redis.del(redisKey);
  }

  // 授权并下发 POW 算力挑战盐 (difficulty: 4)
  const salt = randomBytes(16).toString('hex');
  const powDifficulty = Number(getConfig('pow_difficulty', '4'));
  await redis.set(`pow:salt:${salt}`, '1', 'EX', 300);

  return {
    status: 'success',
    data: {
      powSalt: salt,
      difficulty: powDifficulty,
    }
  };
}

/**
 * 处理用户登录逻辑 (验证 POW + 验证邮箱密码)
 */
export async function handleLogin(body: any, set: any) {
  const { email, password, powSalt, powNonce } = body;

  // 1. 强验证 L7 CC 防御算力凭证
  const isPowValid = await verifyPow(powSalt, powNonce);
  if (!isPowValid) {
    set.status = 400;
    return { status: 'error', message: '算力验证未通过，请重新获取挑战。' };
  }

  // 2. 查询用户是否存在
  const users = await db.select().from(userTable).where(eq(userTable.email, email)).limit(1);
  if (users.length === 0) {
    set.status = 401;
    return { status: 'error', message: '邮箱或密码不正确，请重新输入。' };
  }

  const user = users[0];

  // 3. 校验密码是否匹配
  const isPasswordCorrect = checkPassword(user.pass, password);
  if (!isPasswordCorrect) {
    set.status = 401;
    return { status: 'error', message: '邮箱或密码不正确，请重新输入。' };
  }

  // 4. 账户状态审计
  if (user.enable === 0) {
    set.status = 403;
    return { status: 'error', message: '您的账户已被禁用，请联系管理员。' };
  }

  // 5. 记录登录 IP 历史日志
  const clientIp = '127.0.0.1'; // 真实IP可通过派生上下文追加
  await db.insert(loginIpTable).values({
    userId: BigInt(user.id),
    ip: clientIp,
    datetime: BigInt(Math.floor(Date.now() / 1000)),
    type: 0, // Web 登录
  });

  // 6. 签署 JWT 授权凭据
  const token = await signToken(user.id, user.isAdmin === 1);

  return {
    status: 'success',
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        userName: user.userName,
        class: user.class,
        isAdmin: user.isAdmin,
      }
    }
  };
}

/**
 * 极速发送邮箱验证码 (强制 POW)
 */
export async function handleSendCode(body: any) {
  const { email, powSalt, powNonce } = body;

  // 1. 强验证 POW
  const isPowValid = await verifyPow(powSalt, powNonce);
  if (!isPowValid) {
    throw new Error('算力挑战验证失败，请刷新重新请求。');
  }

  // 2. 限流校验 (每分钟单IP单邮箱1次)
  const rateKey = `spanel:sendcode:limit:${email}`;
  const isTooFrequent = await redis.get(rateKey);
  if (isTooFrequent) {
    throw new Error('发送频率过快，请在一分钟后再试。');
  }

  // 3. 生成 6 位随机纯数字验证码
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expireTime = BigInt(Math.floor(Date.now() / 1000) + 600); // 10分钟有效

  // 4. 写入 email_verify 验证表
  await db.insert(emailVerifyTable).values({
    email,
    ip: '127.0.0.1',
    code,
    expireIn: expireTime,
  });

  // 5. 锁死 Redis 频率限制 60s
  await redis.set(rateKey, '1', 'EX', 60);

  // LOG 模拟发送 (生产环境在此处拉起 SMTP/邮发引擎发送邮件)
  console.log(`[Mail Send] Email Code sent to ${email}. Verification Code: [ ${code} ]`);

  return {
    status: 'success',
    message: '邮箱验证码发送成功，有效时间为 10 分钟。',
  };
}

/**
 * 核心用户注册逻辑
 */
export async function handleRegister(body: any, set: any) {
  const { email, password, emailCode, powSalt, powNonce, userName: inputUserName, imType, imValue, code } = body;

  // 1. 验证 POW
  const isPowValid = await verifyPow(powSalt, powNonce);
  if (!isPowValid) {
    set.status = 400;
    return { status: 'error', message: '算力验证未通过。' };
  }

  // 2. 校对邮箱验证码 (取最后一条记录)
  const verifications = await db.select()
    .from(emailVerifyTable)
    .where(eq(emailVerifyTable.email, email))
    .orderBy(desc(emailVerifyTable.id))
    .limit(1);

  if (verifications.length === 0) {
    set.status = 400;
    return { status: 'error', message: '邮箱未进行验证，请先获取验证码。' };
  }

  const ver = verifications[0];
  const now = BigInt(Math.floor(Date.now() / 1000));
  
  if (ver.code !== emailCode || ver.expireIn < now) {
    set.status = 400;
    return { status: 'error', message: '邮箱验证码错误或已过期，请重新核对。' };
  }

  // 3. 校验邮箱冲突
  const existingUsers = await db.select().from(userTable).where(eq(userTable.email, email)).limit(1);
  if (existingUsers.length > 0) {
    set.status = 400;
    return { status: 'error', message: '该邮箱已被注册，请直接登录。' };
  }

  // 4. 自动端口递增分配逻辑 (从 10000 开始，防冲突)
  const maxPortUsers = await db.select()
    .from(userTable)
    .orderBy(desc(userTable.port))
    .limit(1);

  let nextPort = 10001;
  if (maxPortUsers.length > 0) {
    nextPort = maxPortUsers[0].port + 1;
    if (nextPort >= 65535) nextPort = 10001; // 端口环回
  }

  // 5. 生成高兼容的默认字段与加密散列
  const finalUserName = inputUserName || email.split('@')[0];
  const passHash = passwordHash(password);
  const ssPasswd = randomBytes(6).toString('hex'); // Shadowsocks 密码
  const v2rayUuid = randomUUID(); // V2Ray 客户端 UUID
  const regDate = new Date();
  
  // 默认注册流量: 10GB = 10737418240 字节
  const defaultTraffic = 10737418240n;

  // 邀请码验证
  let refBy = 0;
  if (code) {
    const inviterId = Number(code);
    if (!isNaN(inviterId) && inviterId > 0) {
      const inviter = await db.select().from(userTable).where(eq(userTable.id, inviterId)).limit(1);
      if (inviter.length > 0) {
        refBy = inviter[0].id;
      }
    }
  }

  // 6. 执行写入用户注册
  await db.insert(userTable).values({
    userName: finalUserName,
    email,
    pass: passHash,
    passwd: ssPasswd,
    v2rayUuid,
    port: nextPort,
    u: 0n,
    d: 0n,
    transferEnable: defaultTraffic,
    money: '0.00',
    inviteNum: 0,
    regDate,
    refBy,
    imType: Number(imType || 1),
    imValue: imValue || '',
  });

  return {
    status: 'success',
    message: '恭喜您，注册成功！',
  };
}
