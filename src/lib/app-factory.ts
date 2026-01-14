/**
 * App Factory - Create pre-configured Elysia instances
 *
 * Creates Elysia instances with common plugins already registered
 */

import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'
import { signJWT, verifyJWT, JWTPayload } from './jwt'

/**
 * Create an Elysia instance with JWT capability
 * This ensures all instances can use the same JWT functions
 */
export function createAuthenticatedApp(prefix?: string) {
  const app = new Elysia({ prefix })

  // Register JWT plugin with the same secret as main app
  app.use(jwt({
    name: 'jwt',
    secret: process.env.JWT_SECRET || 'spanel-jwt-secret-key-2024-change-in-production',
  }))

  return app
}

/**
 * Helper to verify JWT from Authorization header
 * Works consistently across all controllers
 */
export async function verifyAuth(authHeader: string | null): Promise<JWTPayload | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  return await verifyJWT(token)
}
