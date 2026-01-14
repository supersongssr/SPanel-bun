/**
 * JWT Utility - Shared JWT functions
 *
 * Provides sign and verify functions that can be used
 * across all controllers without relying on Elysia context
 *
 * Uses the same jose library as @elysiajs/jwt for compatibility
 */

import { SignJWT, jwtVerify, jwtVerify as joseJwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'spanel-jwt-secret-key-2024-change-in-production'
)

export interface JWTPayload {
  userId: number
  email: string
  user_name: string
  isAdmin: boolean
  iat?: number
}

/**
 * Sign a JWT token (compatible with @elysiajs/jwt)
 */
export async function signJWT(payload: Omit<JWTPayload, 'iat'>): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .sign(JWT_SECRET)

  return token
}

/**
 * Verify a JWT token (compatible with @elysiajs/jwt)
 */
export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    console.log('JWT verify - Token start:', token.substring(0, 50))
    const { payload } = await joseJwtVerify(token, JWT_SECRET)
    console.log('JWT verify - Success:', payload)
    return payload as unknown as JWTPayload
  } catch (error) {
    console.error('JWT verification failed - Error:', error)
    return null
  }
}
