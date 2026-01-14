/**
 * Formatting Utilities
 * 
 * Common formatting functions for displaying data
 */

/**
 * Format bytes to human-readable format
 * 
 * @param bytes - Number of bytes
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string (e.g., "1.00 GB")
 */
export function formatBytes(bytes: string | number, decimals: number = 2): string {
  const bytesNum = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes
  
  if (bytesNum === 0) return '0 B'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']

  const i = Math.floor(Math.log(bytesNum) / Math.log(k))

  return parseFloat((bytesNum / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

/**
 * Format percentage with sign
 * 
 * @param value - Percentage value (0-100)
 * @returns Formatted string (e.g., "75.5%")
 */
export function formatPercent(value: number): string {
  return value.toFixed(2) + '%'
}

/**
 * Format date to locale string
 * 
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
export function formatDate(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  
  if (isNaN(date.getTime())) return 'N/A'
  
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format money (CNY)
 * 
 * @param amount - Amount in string or number
 * @returns Formatted string (e.g., "¥100.00")
 */
export function formatMoney(amount: string | number): string {
  const amountNum = typeof amount === 'string' ? parseFloat(amount) : amount
  
  return '¥' + amountNum.toFixed(2)
}

/**
 * Format node type to readable name
 * 
 * @param type - Node type number
 * @returns Node type name
 */
export function formatNodeType(type: number): string {
  const types: Record<number, string> = {
    1: 'Shadowsocks',
    2: 'ShadowsocksR',
    11: 'V2Ray',
    7: 'V2Ray (旧版)',
  }
  
  return types[type] || `Unknown (${type})`
}

/**
 * Calculate traffic status color
 * 
 * @param percent - Usage percentage (0-100)
 * @returns Color class name for Element Plus
 */
export function getTrafficStatusColor(percent: number): string {
  if (percent >= 90) return '#f56c6c' // red
  if (percent >= 70) return '#e6a23c' // orange
  if (percent >= 50) return '#409eff' // blue
  return '#67c23a' // green
}

/**
 * Calculate days remaining until expiration
 * 
 * @param dateString - Expiration date string
 * @returns Number of days, or null if invalid
 */
export function getDaysRemaining(dateString: string | null): number | null {
  if (!dateString) return null
  
  const expireDate = new Date(dateString)
  const now = new Date()
  
  if (isNaN(expireDate.getTime())) return null
  
  const diff = expireDate.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  
  return days > 0 ? days : 0
}
