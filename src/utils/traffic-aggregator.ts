/**
 * Traffic Aggregator - Flow Deduction and Reporting System
 *
 * Features:
 * - Traffic recording and aggregation
 * - User quota deduction
 * - Node traffic statistics
 * - Rate limiting using Redis
 */

import { prisma } from '../lib/prisma'

/**
 * Traffic report interface
 */
export interface TrafficReport {
  userId: number
  nodeId: number
  upload: number // Bytes
  download: number // Bytes
  timestamp?: Date
}

/**
 * Result interface
 */
export interface TrafficResult {
  success: boolean
  remainingTraffic?: string
  usedPercent?: number
  message?: string
}

/**
 * Aggregate and deduct traffic for a user
 *
 * @param report - Traffic report data
 * @returns Result with updated traffic info
 */
export async function aggregateTraffic(report: TrafficReport): Promise<TrafficResult> {
  try {
    // 1. Get current user data
    const user = await prisma.user.findUnique({
      where: { id: report.userId },
      select: {
        id: true,
        transfer_enable: true,
        u: true,
        d: true,
        expire_in: true,
      },
    })

    if (!user) {
      return {
        success: false,
        message: 'User not found',
      }
    }

    // 2. Check if account is expired
    if (user.expire_in) {
      const expireDate = new Date(user.expire_in)
      if (expireDate < new Date()) {
        return {
          success: false,
          message: 'Account expired',
        }
      }
    }

    // 3. Calculate current traffic
    const currentUpload = BigInt(user.u || 0)
    const currentDownload = BigInt(user.d || 0)
    const newUpload = BigInt(report.upload)
    const newDownload = BigInt(report.download)

    const totalUpload = currentUpload + newUpload
    const totalDownload = currentDownload + newDownload

    // 4. Check if quota exceeded
    const totalUsed = totalUpload + totalDownload
    const totalLimit = BigInt(user.transfer_enable)

    if (totalUsed > totalLimit) {
      return {
        success: false,
        message: 'Traffic quota exceeded',
        remainingTraffic: '0',
        usedPercent: 100,
      }
    }

    // 5. Update user traffic in database
    await prisma.user.update({
      where: { id: report.userId },
      data: {
        u: totalUpload.toString(),
        d: totalDownload.toString(),
        last_checkin_time: new Date(),
      },
    })

    // 6. Update node traffic statistics (if table exists)
    try {
      // Check if traffic_log table exists
      const tableExists = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM information_schema.tables
        WHERE table_schema = DATABASE()
        AND table_name = 'user_traffic_log'
      `

      if (Array.isArray(tableExists) && tableExists.length > 0 && (tableExists[0] as any).count > 0) {
        // Insert traffic log record
        await prisma.$queryRaw`
          INSERT INTO user_traffic_log (user_id, node_id, upload, download, created_at)
          VALUES (${report.userId}, ${report.nodeId}, ${report.upload}, ${report.download}, NOW())
        `
      }
    } catch (error) {
      // Traffic log table doesn't exist or other error, ignore
      console.warn('Traffic logging skipped:', error)
    }

    // 7. Calculate remaining traffic
    const remainingBytes = totalLimit - totalUsed
    const usedPercent = Number((totalUsed * BigInt(100)) / totalLimit)

    return {
      success: true,
      remainingTraffic: remainingBytes.toString(),
      usedPercent: Number(usedPercent),
      message: 'Traffic updated successfully',
    }
  } catch (error) {
    console.error('Traffic aggregation error:', error)
    return {
      success: false,
      message: 'Internal server error',
    }
  }
}

/**
 * Batch traffic aggregation for multiple reports
 *
 * @param reports - Array of traffic reports
 * @returns Array of results
 */
export async function batchAggregateTraffic(reports: TrafficReport[]): Promise<TrafficResult[]> {
  const results = await Promise.all(
    reports.map(report => aggregateTraffic(report))
  )

  return results
}

/**
 * Get user traffic summary
 *
 * @param userId - User ID
 * @returns Traffic summary
 */
export async function getUserTrafficSummary(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      transfer_enable: true,
      u: true,
      d: true,
      expire_in: true,
    },
  })

  if (!user) {
    return null
  }

  const uploadBytes = BigInt(user.u || 0)
  const downloadBytes = BigInt(user.d || 0)
  const totalUsed = uploadBytes + downloadBytes
  const totalLimit = BigInt(user.transfer_enable)
  const remainingBytes = totalLimit - totalUsed
  const usedPercent = Number((totalUsed * BigInt(100)) / totalLimit)

  return {
    upload: uploadBytes.toString(),
    download: downloadBytes.toString(),
    totalUsed: totalUsed.toString(),
    totalLimit: totalLimit.toString(),
    remaining: remainingBytes.toString(),
    usedPercent,
    expireIn: user.expire_in,
  }
}

/**
 * Format bytes to human readable format
 *
 * @param bytes - Bytes as string or number
 * @returns Formatted string
 */
export function formatBytes(bytes: string | number | bigint): string {
  const b = typeof bytes === 'bigint' ? bytes : BigInt(Math.floor(Number(bytes)))
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  let unitIndex = 0
  let value = Number(b)

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex++
  }

  return `${value.toFixed(2)} ${units[unitIndex]}`
}
