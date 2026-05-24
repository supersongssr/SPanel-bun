import { Elysia, t } from 'elysia';
import svgCaptcha from 'svg-captcha';
import { redis } from '../../config/redis';
import { randomUUID } from 'crypto';
import { handlePowRequest, handleLogin, handleSendCode, handleRegister } from './authService';

export const authController = new Elysia({ prefix: '/api/v1/auth' })
  /**
   * 1. 获取图形验证码 (用于人机校验防止恶意批量请求算力盐)
   */
  .get('/captcha', async () => {
    const captcha = svgCaptcha.create({
      size: 4,
      ignoreChars: '0o1i',
      noise: 1,
      color: false,
    });
    
    const captchaId = randomUUID();
    
    // 将验证码文本缓存至 Redis，TTL 5 分钟
    await redis.set(`captcha:${captchaId}`, captcha.text.toLowerCase(), 'EX', 300);
    
    return {
      status: 'success',
      captchaId,
      svg: captcha.data,
    };
  })

  /**
   * 2. 请求工作量挑战 (POW Challenge)
   */
  .post('/pow-challenge', async ({ body }) => {
    return await handlePowRequest(body.captchaId, body.captchaCode);
  }, {
    body: t.Object({
      captchaId: t.String(),
      captchaCode: t.String(),
    }),
  })

  /**
   * 3. 极速登录接口
   */
  .post('/login', async ({ body, set }) => {
    return await handleLogin(body, set);
  }, {
    body: t.Object({
      email: t.String(),
      password: t.String(),
      powSalt: t.String(),
      powNonce: t.String(),
    }),
  })

  /**
   * 4. 发送注册邮箱验证码 (强制验证 POW)
   */
  .post('/send-code', async ({ body }) => {
    return await handleSendCode(body);
  }, {
    body: t.Object({
      email: t.String(),
      powSalt: t.String(),
      powNonce: t.String(),
    }),
  })

  /**
   * 5. 注册账户接口 (强制验证邮箱码 + POW)
   */
  .post('/register', async ({ body, set }) => {
    return await handleRegister(body, set);
  }, {
    body: t.Object({
      email: t.String(),
      password: t.String(),
      emailCode: t.String(),
      powSalt: t.String(),
      powNonce: t.String(),
    }),
  });
