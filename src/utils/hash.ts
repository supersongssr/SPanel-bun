import { createHash } from 'crypto';
import { getConfig } from '../config/app';

/**
 * MD5 带盐加密
 */
function md5WithSalt(pwd: string, salt: string): string {
  return createHash('md5')
    .update(pwd + salt)
    .digest('hex');
}

/**
 * SHA-256 带盐加密
 */
function sha256WithSalt(pwd: string, salt: string): string {
  return createHash('sha256')
    .update(pwd + salt)
    .digest('hex');
}

/**
 * 对齐旧版 SPanel 密码加密规范
 */
export function passwordHash(pwd: string): string {
  const method = getConfig('pwdMethod', 'sha256');
  const salt = getConfig('salt', '');

  switch (method) {
    case 'md5':
      return md5WithSalt(pwd, salt);
    case 'sha256':
      return sha256WithSalt(pwd, salt);
    default:
      return sha256WithSalt(pwd, salt);
  }
}

/**
 * 校验用户输入的密码是否与数据库存储的密码哈希匹配
 */
export function checkPassword(hashedPassword: string, inputPassword: string): boolean {
  return hashedPassword === passwordHash(inputPassword);
}
