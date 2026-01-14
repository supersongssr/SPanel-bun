/**
 * Eden Client - Type-Safe API Client with Auth
 *
 * Integrates with AuthManager to automatically inject JWT tokens
 */

import { edenTreaty } from '@elysiajs/eden'
import { auth } from '../utils/auth'
// Temporarily disable type import for frontend build
// import type { App } from '../../../../../backend/src/index'

// Base URL for API
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://test-spanel-bun.freessr.bid'

/**
 * Create Eden Client with automatic token injection
 */
export const api: any = edenTreaty(API_BASE_URL, {
  fetcher: {
    fetch: async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
      // Get token from AuthManager
      const token = auth.getToken()

      // Merge headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(init.headers as Record<string, string>),
      }

      // Add auth header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      // Make fetch request with auth header
      return fetch(input, {
        ...init,
        headers,
      })
    },
  },
})

/**
 * Helper function to check if response has error
 */
export function hasError<T>(response: { data?: T; error?: any }): response is { error: any } {
  return !!response.error
}

/**
 * Helper function to handle 401 errors
 */
export async function handleApiResponse<T>(promise: Promise<{ data?: T; error?: any }>): Promise<T> {
  const response = await promise

  if (hasError(response)) {
    // Check for 401 Unauthorized
    if (response.error?.message?.includes('Unauthorized') || 
        response.error?.message?.includes('Invalid or expired token')) {
      // Token expired or invalid - logout user
      auth.logout()
      throw new Error('Authentication failed. Please login again.')
    }

    // Other errors
    throw new Error(response.error?.message || 'API request failed')
  }

  if (!response.data) {
    throw new Error('No data returned from API')
  }

  return response.data
}
