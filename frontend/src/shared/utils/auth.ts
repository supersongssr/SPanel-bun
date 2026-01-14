/**
 * Authentication Utility Class
 * 
 * Manages JWT token storage and authentication state across MPA pages
 * 
 * Features:
 * - Token persistence using localStorage
 * - Login state checking
 * - Automatic token injection in API calls
 * - Logout with redirect
 */

export class AuthManager {
  private static readonly TOKEN_KEY = 'spanel_jwt_token'
  private static readonly USER_KEY = 'spanel_user_info'

  /**
   * Store JWT token in localStorage
   */
  static setToken(token: string): void {
    try {
      localStorage.setItem(this.TOKEN_KEY, token)
    } catch (error) {
      console.error('Failed to store token:', error)
    }
  }

  /**
   * Get JWT token from localStorage
   */
  static getToken(): string | null {
    try {
      return localStorage.getItem(this.TOKEN_KEY)
    } catch (error) {
      console.error('Failed to retrieve token:', error)
      return null
    }
  }

  /**
   * Check if user is logged in (has valid token)
   */
  static isLoggedIn(): boolean {
    const token = this.getToken()
    return token !== null && token !== ''
  }

  /**
   * Store user info in localStorage
   */
  static setUserInfo(user: any): void {
    try {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user))
    } catch (error) {
      console.error('Failed to store user info:', error)
    }
  }

  /**
   * Get user info from localStorage
   */
  static getUserInfo(): any | null {
    try {
      const userStr = localStorage.getItem(this.USER_KEY)
      return userStr ? JSON.parse(userStr) : null
    } catch (error) {
      console.error('Failed to retrieve user info:', error)
      return null
    }
  }

  /**
   * Clear token and user info, redirect to login
   */
  static logout(): void {
    try {
      localStorage.removeItem(this.TOKEN_KEY)
      localStorage.removeItem(this.USER_KEY)
      
      // Redirect to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/user/login.html'
      }
    } catch (error) {
      console.error('Failed to logout:', error)
    }
  }

  /**
   * Get Authorization header value for API requests
   */
  static getAuthHeader(): { Authorization: string } | {} {
    const token = this.getToken()
    if (token) {
      return { Authorization: `Bearer ${token}` }
    }
    return {}
  }

  /**
   * Parse JWT token (without verification - for UI only)
   * Returns payload if valid, null otherwise
   */
  static parseToken(token?: string): any | null {
    try {
      const jwtToken = token || this.getToken()
      if (!jwtToken) return null

      // JWT format: header.payload.signature
      const parts = jwtToken.split('.')
      if (parts.length !== 3) return null

      // Decode payload (base64url)
      const payload = parts[1]
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
      return JSON.parse(decoded)
    } catch (error) {
      console.error('Failed to parse token:', error)
      return null
    }
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(): boolean {
    const payload = this.parseToken()
    if (!payload || !payload.exp) return false

    const expirationTime = payload.exp * 1000 // Convert to milliseconds
    return Date.now() >= expirationTime
  }

  /**
   * Get user ID from token
   */
  static getUserId(): number | null {
    const payload = this.parseToken()
    return payload?.userId || null
  }

  /**
   * Get user name from token
   */
  static getUserName(): string | null {
    const payload = this.parseToken()
    return payload?.user_name || null
  }

  /**
   * Check if user is admin
   */
  static isAdmin(): boolean {
    const payload = this.parseToken()
    return payload?.isAdmin === true
  }
}

// Export singleton instance
export const auth = AuthManager
