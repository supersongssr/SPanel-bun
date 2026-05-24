import { Elysia, t } from 'elysia';
import svgCaptcha from 'svg-captcha';
import { redis } from '../../config/redis';
import { randomUUID } from 'crypto';
import { handlePowRequest, handleLogin, handleSendCode, handleRegister } from './authService';
import { getConfig } from '../../config/app';

export const authController = new Elysia({ prefix: '/api/v1/auth' })
  /**
   * 1. 获取图形/极验验证码配置 (用于人机校验防止恶意批量请求算力盐)
   */
  .get('/captcha', async () => {
    const provider = getConfig('captcha_provider', 'graphic');

    if (provider === 'geetest') {
      return {
        status: 'success',
        captcha_provider: 'geetest',
        geetest_id: getConfig('geetest_id'),
      };
    }

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
      captcha_provider: 'graphic',
      captchaId,
      svg: captcha.data,
    };
  })

  /**
   * 2. 请求工作量挑战 (POW Challenge)
   */
  .post('/pow-challenge', async ({ body }) => {
    return await handlePowRequest(body);
  }, {
    body: t.Object({
      captchaId: t.Optional(t.String()),
      captchaCode: t.Optional(t.String()),
      geetestParams: t.Optional(t.Object({
        lot_number: t.String(),
        captcha_output: t.String(),
        pass_token: t.String(),
        gen_time: t.String(),
      }))
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
      userName: t.Optional(t.String()),
      imType: t.Optional(t.Union([t.String(), t.Number()])),
      imValue: t.Optional(t.String()),
      code: t.Optional(t.String()),
    }),
  });
