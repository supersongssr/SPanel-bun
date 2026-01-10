import { Context, Next } from 'hono'
import { verifyToken, extractToken } from '../utils/jwt.js'

/**
 * Authentication middleware - verify JWT token
 */
export async function authMiddleware(c: Context, next: Next) {
  try {
    const token = extractToken(c)

    if (!token) {
      return c.json({
        error: 'Unauthorized',
        message: 'No token provided'
      }, 401)
    }

    const payload = await verifyToken(token)

    // Attach user info to context
    c.set('userId', payload.userId)
    c.set('userEmail', payload.email)
    c.set('isAdmin', payload.isAdmin)

    await next()
  } catch (error) {
    return c.json({
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    }, 401)
  }
}

/**
 * Admin only middleware
 */
export async function adminMiddleware(c: Context, next: Next) {
  const isAdmin = c.get('isAdmin')

  if (!isAdmin) {
    return c.json({
      error: 'Forbidden',
      message: 'Admin access required'
    }, 403)
  }

  await next()
}

/**
 * Optional auth middleware - attach user info if token exists
 */
export async function optionalAuthMiddleware(c: Context, next: Next) {
  try {
    const token = extractToken(c)

    if (token) {
      const payload = await verifyToken(token)
      c.set('userId', payload.userId)
      c.set('userEmail', payload.email)
      c.set('isAdmin', payload.isAdmin)
    }

    await next()
  } catch (error) {
    // Continue without auth
    await next()
  }
}
