/**
 * Authentication Middleware
 *
 * Provides JWT verification middleware for protected routes
 */

import { verifyJWT } from './jwt'

export interface AuthContext {
  userId: number
  email: string
  user_name: string
  isAdmin: boolean
}

/**
 * Verify JWT and return decoded payload
 */
export async function authenticate(token: string): Promise<AuthContext | null> {
  const payload = await verifyJWT(token)
  if (!payload) return null

  return {
    userId: payload.userId,
    email: payload.email,
    user_name: payload.user_name,
    isAdmin: payload.isAdmin || false,
  }
}

/**
 * Extract token from Authorization header
 */
export function extractToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}
