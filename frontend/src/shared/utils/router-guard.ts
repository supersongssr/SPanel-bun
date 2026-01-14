/**
 * Router Guard - Global Authentication Check
 *
 * Call this function in each page's main.ts to enforce authentication
 */

import { auth } from './auth'

/**
 * Pages that don't require authentication
 */
const PUBLIC_PAGES = [
  '/login.html',
  '/register.html',
  '/user/login.html',
  '/user/register.html',
]

/**
 * Admin pages that require admin privileges
 */
const ADMIN_PAGES = [
  '/admin/',
  '/admin/index.html',
  '/admin/dashboard.html',
  '/admin/users.html',
]

/**
 * Check if current page is public (no auth required)
 */
function isPublicPage(): boolean {
  const currentPath = window.location.pathname

  return PUBLIC_PAGES.some(page => {
    // Exact match or starts with path
    return currentPath === page || currentPath.startsWith(page)
  })
}

/**
 * Check if current page is admin page
 */
function isAdminPage(): boolean {
  const currentPath = window.location.pathname

  return ADMIN_PAGES.some(page => currentPath.startsWith(page))
}

/**
 * Main authentication guard function
 *
 * Call this in your main.ts or App.vue before mounting the app
 *
 * @returns true if authenticated, false if redirected
 */
export function checkAuth(): boolean {
  // Skip check for public pages
  if (isPublicPage()) {
    return true
  }

  // Check if user is logged in
  if (!auth.isLoggedIn()) {
    // Not logged in - redirect to login
    const currentUrl = window.location.href
    const loginUrl = isAdminPage() ? '/admin/login.html' : '/user/login.html'

    console.warn('User not authenticated, redirecting to login...')

    // Store intended destination for redirect after login
    if (currentUrl && !currentUrl.includes('login.html')) {
      sessionStorage.setItem('redirect_after_login', currentUrl)
    }

    window.location.href = loginUrl
    return false
  }

  // Check if token is expired
  if (auth.isTokenExpired()) {
    console.warn('Token expired, logging out...')
    auth.logout()
    return false
  }

  // For admin pages, check if user has admin privileges
  if (isAdminPage()) {
    if (!auth.isAdmin()) {
      console.warn('Access denied: Admin privileges required')
      alert('需要管理员权限才能访问此页面')
      window.location.href = '/index.html'
      return false
    }
  }

  // User is authenticated
  return true
}

/**
 * Setup periodic token expiry check
 * 
 * Checks every minute if token is about to expire
 * Shows warning 5 minutes before expiry
 */
export function setupTokenExpiryCheck(): void {
  setInterval(() => {
    const payload = auth.parseToken()
    if (!payload || !payload.exp) return

    const expirationTime = payload.exp * 1000
    const timeUntilExpiry = expirationTime - Date.now()
    
    // Warn 5 minutes before expiry
    if (timeUntilExpiry > 0 && timeUntilExpiry < 5 * 60 * 1000) {
      const minutesLeft = Math.ceil(timeUntilExpiry / (60 * 1000))
      
      console.warn(`Token will expire in ${minutesLeft} minute(s)`)
      
      // You could show a toast notification here
      // For now, just log to console
    }
  }, 60 * 1000) // Check every minute
}

/**
 * Redirect back after login
 * 
 * Call this after successful login to redirect to intended page
 */
export function redirectToPreviousPage(): void {
  const redirectUrl = sessionStorage.getItem('redirect_after_login')
  sessionStorage.removeItem('redirect_after_login')
  
  if (redirectUrl) {
    window.location.href = redirectUrl
  } else {
    // Default to dashboard
    window.location.href = '/index.html'
  }
}
