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
  '/auth/login.html',
  '/auth/register.html',
  '/auth/resetpassword.html',
]

/**
 * Pages where logged-in users should be redirected based on role (SSO)
 *
 * IMPORTANT: Root path '/' is NOT in this list - it's the public portal/landing page
 * and should always be accessible regardless of authentication status
 */
const SSO_REDIRECT_PAGES = [
  // '/',  // REMOVED: Root path is public portal, never redirect
  // '/index.html',  // REMOVED: Same as root path
  '/auth/',
  '/auth/index.html',
  '/auth/login.html',
  '/auth/register.html',
  '/auth/resetpassword.html',
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
 * Check if current page should trigger SSO redirect
 */
function shouldSSORedirect(): boolean {
  const currentPath = window.location.pathname

  return SSO_REDIRECT_PAGES.some(page => {
    return currentPath === page || currentPath.startsWith(page)
  })
}

/**
 * SSO Auto-redirect based on user role
 * Redirects logged-in users to their appropriate dashboard
 * User-first approach: All users (including admins) go to /user/index by default
 */
function handleSSORedirect(): void {
  const currentUrl = window.location.href

  // Don't redirect if already on a dashboard page
  if (currentUrl.includes('/user/index.html') || currentUrl.includes('/admin/index.html')) {
    return
  }

  // User-first SSO: All logged-in users redirect to /user/index.html
  // Admins can access admin panel via navigation from user dashboard
  console.log('SSO: User logged in, redirecting to /user/index.html')
  window.location.href = '/user/index.html'
}

/**
 * Main authentication guard function
 *
 * Call this in your main.ts or App.vue before mounting the app
 *
 * @returns true if authenticated, false if redirected
 */
export function checkAuth(): boolean {
  const currentUrl = window.location.href

  // Check if user is logged in
  if (!auth.isLoggedIn()) {
    // Not logged in - only allow public pages
    if (isPublicPage()) {
      return true
    }

    // Redirect to login - FIXED: Always use /auth/login.html
    const loginUrl = '/auth/login.html'

    console.warn('User not authenticated, redirecting to login...')

    // Store intended destination for redirect after login
    if (currentUrl && !currentUrl.includes('login.html')) {
      sessionStorage.setItem('redirect_after_login', currentUrl)
    }

    window.location.href = loginUrl
    return false
  }

  // User is logged in - check for SSO redirect
  if (shouldSSORedirect()) {
    console.log('SSO: User logged in on public/auth page, redirecting to dashboard...')
    handleSSORedirect()
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
      window.location.href = '/user/index.html'
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
