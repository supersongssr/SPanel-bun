/**
 * Admin Authentication Middleware
 * 
 * Verifies that the user has admin privileges (is_admin === 1)
 */

import { Elysia } from 'elysia'

export const adminAuthMiddleware = new Elysia({ name: 'admin-auth' })
  .derive(async ({ jwt, request, set }) => {
    // Extract Authorization header
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
      }
    }

    // Extract token
    const token = authHeader.substring(7)
    
    // Verify token
    const payload = await jwt.verify(token)
    
    if (!payload) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      }
    }

    // Check if user is admin
    const isAdmin = (payload as any).isAdmin === true
    
    if (!isAdmin) {
      set.status = 403
      return {
        error: 'Forbidden',
        message: 'Admin privileges required',
      }
    }

    // Inject user info into context
    return {
      userId: (payload as any).userId as number,
      userEmail: (payload as any).email as string,
      userName: (payload as any).user_name as string,
      isAdmin: true,
    }
  })
