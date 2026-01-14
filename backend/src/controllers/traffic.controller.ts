/**
 * Traffic Controller - Traffic Reporting and Testing
 *
 * Provides endpoints for:
 * - Traffic reporting simulation
 * - Traffic quota checking
 * - Testing traffic deduction
 */

import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { verifyJWT } from '../lib/jwt'
import { aggregateTraffic, getUserTrafficSummary, formatBytes } from '../utils/traffic-aggregator'

export const trafficController = new Elysia({ prefix: '/traffic' })

/**
 * POST /api/traffic/report
 *
 * Report traffic usage (for testing and actual node reporting)
 *
 * Authentication: Bearer token
 * Body:
 * - nodeId: Node ID
 * - upload: Upload bytes
 * - download: Download bytes
 *
 * Returns updated traffic info
 */
trafficController.post('/report', async ({ set, request, body }) => {
  try {
    // Verify JWT
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
      }
    }

    const token = authHeader.substring(7)
    const payload = await verifyJWT(token)

    if (!payload) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      }
    }

    const userId = payload.userId
    const { nodeId, upload, download } = body as any

    // Validate input
    if (!nodeId || upload === undefined || download === undefined) {
      set.status = 400
      return {
        error: 'Bad Request',
        message: 'Missing required fields: nodeId, upload, download',
      }
    }

    // Aggregate traffic
    const result = await aggregateTraffic({
      userId,
      nodeId: parseInt(nodeId),
      upload: BigInt(upload),
      download: BigInt(download),
    })

    if (result.success) {
      return {
        message: result.message,
        remainingTraffic: result.remainingTraffic,
        remainingTrafficFormatted: formatBytes(result.remainingTraffic || '0'),
        usedPercent: result.usedPercent,
      }
    } else {
      set.status = 400
      return {
        error: result.message,
      }
    }
  } catch (error) {
    console.error('Traffic report error:', error)
    set.status = 500
    return {
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}, {
  body: t.Object({
    nodeId: t.Number(),
    upload: t.Integer(),
    download: t.Integer(),
  }),
})

/**
 * GET /api/traffic/summary
 *
 * Get user traffic summary
 *
 * Authentication: Bearer token
 *
 * Returns traffic usage summary
 */
trafficController.get('/summary', async ({ set, request }) => {
  try {
    // Verify JWT
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
      }
    }

    const token = authHeader.substring(7)
    const payload = await verifyJWT(token)

    if (!payload) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      }
    }

    const userId = payload.userId

    // Get traffic summary
    const summary = await getUserTrafficSummary(userId)

    if (!summary) {
      set.status = 404
      return {
        error: 'Not Found',
        message: 'User not found',
      }
    }

    return {
      user: {
        id: userId,
      },
      traffic: {
        upload: summary.upload,
        download: summary.download,
        uploadFormatted: formatBytes(summary.upload),
        downloadFormatted: formatBytes(summary.download),
        totalUsed: summary.totalUsed,
        totalUsedFormatted: formatBytes(summary.totalUsed),
        totalLimit: summary.totalLimit,
        totalLimitFormatted: formatBytes(summary.totalLimit),
        remaining: summary.remaining,
        remainingFormatted: formatBytes(summary.remaining),
        usedPercent: summary.usedPercent,
      },
      account: {
        expireIn: summary.expireIn,
      },
    }
  } catch (error) {
    console.error('Traffic summary error:', error)
    set.status = 500
    return {
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
})
