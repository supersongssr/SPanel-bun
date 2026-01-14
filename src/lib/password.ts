/**
 * Password hashing utility - Compatible with legacy PHP SPanel
 *
 * Legacy SPanel supports multiple password hashing methods:
 * - MD5 with salt
 * - SHA256 with salt
 * - Argon2i (wrapped in SHA256)
 *
 * New users will use bcrypt (Bun native)
 */

import { createHash } from 'crypto'

// Get salt from environment (same as PHP's $System_Config['salt'])
// Important: Empty string is valid for old SPanel installations
const SALT = process.env.PASSWORD_SALT !== undefined ? process.env.PASSWORD_SALT : ''

// Password method: 'md5' | 'sha256' | 'argon2i' | 'bcrypt'
const PASSWORD_METHOD = process.env.PASSWORD_METHOD || 'sha256'

/**
 * Hash password using legacy SPanel method
 */
export function hashPassword(password: string): string {
  switch (PASSWORD_METHOD) {
    case 'md5':
      return md5WithSalt(password)
    case 'sha256':
      return sha256WithSalt(password)
    case 'argon2i':
      // Argon2i wrapped in SHA256 (due to database field length limit)
      return sha256WithSalt(password) // Fallback to SHA256 for now
    case 'bcrypt':
      // Use Bun's native bcrypt for new users
      return Bun.password.hash(password)
    default:
      return md5WithSalt(password)
  }
}

/**
 * Verify password against hash
 * Supports both legacy (MD5/SHA256) and new (bcrypt) hashes
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Try Bun's native verify first (for bcrypt)
  try {
    if (await Bun.password.verify(password, hash)) {
      return true
    }
  } catch {
    // Not a bcrypt hash, try legacy methods
  }

  // Try legacy MD5
  if (md5WithSalt(password) === hash) {
    return true
  }

  // Try legacy SHA256
  if (sha256WithSalt(password) === hash) {
    return true
  }

  return false
}

/**
 * Hash password using MD5 with salt (Legacy)
 */
function md5WithSalt(password: string): string {
  return createHash('md5').update(password + SALT).digest('hex')
}

/**
 * Hash password using SHA256 with salt (Legacy - Default)
 */
function sha256WithSalt(password: string): string {
  return createHash('sha256').update(password + SALT).digest('hex')
}

/**
 * Hash cookie/token
 */
export function hashCookie(str: string): string {
  const SECRET_KEY = process.env.JWT_SECRET || 'default-secret'
  return createHash('sha256').update(str + SECRET_KEY).digest('hex').substring(5, 50)
}

/**
 * Generate UUID for user
 */
export function generateUUID(): string {
  return crypto.randomUUID()
}
