import { createHmac } from 'crypto';
import { getConfig } from '../config/app';

/**
 * 校验极验 v4 验证码凭证是否合法
 * 签名规则: Hmac-SHA256(lot_number, geetest_key)
 */
export async function verifyGeetest(
  lotNumber: string,
  captchaOutput: string,
  passToken: string,
  genTime: string
): Promise<boolean> {
  const captchaId = getConfig('geetest_id');
  const captchaKey = getConfig('geetest_key');

  if (!captchaId || !captchaKey) {
    console.error('[Geetest] geetest_id or geetest_key is not configured in database config.');
    return false;
  }

  // 1. 生成签名 token 进行本地一致性比对
  const signToken = createHmac('sha256', captchaKey)
    .update(lotNumber)
    .digest('hex');

  // 2. 调用极验官方 v4 接口进行最终安全确认
  const url = `https://gcaptcha4.geetest.com/validate?captcha_id=${encodeURIComponent(captchaId)}`;
  
  const params = new URLSearchParams();
  params.append('lot_number', lotNumber);
  params.append('captcha_output', captchaOutput);
  params.append('pass_token', passToken);
  params.append('gen_time', genTime);
  params.append('sign_token', signToken);
  params.append('captcha_id', captchaId);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (response.status !== 200) {
      console.warn(`[Geetest] API validation returned non-200 status: ${response.status}`);
      return false;
    }

    const resJson = (await response.json()) as any;
    
    // 极验返回 {"result": "success"} 或者 {"result": "fail", "reason": "..."}
    const isSuccess = !!(resJson && resJson.result === 'success');
    if (!isSuccess) {
      console.warn(`[Geetest] Verification failed. Response:`, JSON.stringify(resJson));
    }
    return isSuccess;
  } catch (error) {
    console.error('[Geetest] Verification exception (failing open for disaster recovery):', error);
    // 极验接口出现故障或网络超时时，采用安全降级容灾，默认通过
    return true;
  }
}
