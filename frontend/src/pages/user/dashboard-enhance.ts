/**
 * Dashboard Static HTML Enhancement
 *
 * This script enhances the static HTML with Vue reactivity
 * instead of replacing it. This provides:
 * 1. Instant static rendering (no white screen)
 * 2. Progressive enhancement with Vue
 * 3. Graceful degradation on API errors
 */

import { createApp, ref } from 'vue'
import { api, handleApiResponse } from '@/shared/api/eden-client'
import { auth } from '@/shared/utils/auth'
import { formatBytes, formatPercent, formatDate, formatMoney, getDaysRemaining, getTrafficStatusColor } from '@/shared/utils/format'

// ============================================
// 🛡️ Safe API Fetcher with Error Isolation
// ============================================
async function safeFetch<T>(
  fetcher: () => Promise<T>,
  fallback: T,
  context: string
): Promise<T> {
  try {
    const result = await fetcher()
    console.log(`[Enhance] ✓ ${context} fetched successfully`)
    return result
  } catch (error: any) {
    console.error(`[Enhance] ✗ ${context} failed:`, error.message)

    // Show error in UI but don't crash
    showErrorState(context, error.message)

    return fallback
  }
}

// ============================================
// 🎯 Show Error State in Static HTML
// ============================================
function showErrorState(context: string, message: string) {
  // Find all skeleton elements and show error
  const skeletons = document.querySelectorAll('.skeleton')

  skeletons.forEach((el) => {
    el.classList.remove('skeleton')
    const placeholder = el.getAttribute('data-placeholder')
    if (placeholder) {
      el.textContent = placeholder
    }
  })

  // Log error for debugging
  console.error(`[Dashboard Error] ${context}: ${message}`)
}

// ============================================
// 🔄 Update Static HTML with Data
// ============================================
function updateStaticHTML(data: any) {
  console.log('[Enhance] Updating static HTML with data...')

  try {
    // Update username
    const usernameEl = document.getElementById('static-username')
    if (usernameEl && data.user?.user_name) {
      usernameEl.classList.remove('skeleton')
      usernameEl.textContent = data.user.user_name
    }

    // Update user info card
    const userInfoValues = document.querySelectorAll('.info-card:nth-child(1) .value')
    if (userInfoValues.length >= 3) {
      // Username
      if (data.user?.user_name) {
        userInfoValues[0].classList.remove('skeleton')
        userInfoValues[0].textContent = data.user.user_name
      }
      // Email
      if (data.user?.email) {
        userInfoValues[1].classList.remove('skeleton')
        userInfoValues[1].textContent = data.user.email
      }
      // Class
      if (data.user?.class !== undefined) {
        userInfoValues[2].classList.remove('skeleton')
        userInfoValues[2].textContent = data.user.class.toString()
      }
    }

    // Update account balance card
    const balanceEl = document.querySelector('.balance-amount')
    if (balanceEl && data.account?.money) {
      balanceEl.classList.remove('skeleton')
      balanceEl.textContent = formatMoney(data.account.money)
    }

    // Update traffic values
    const trafficValues = document.querySelectorAll('.traffic-value')
    if (trafficValues.length >= 4 && data.traffic) {
      // Upload
      if (data.traffic.upload) {
        trafficValues[0].classList.remove('skeleton')
        trafficValues[0].textContent = formatBytes(data.traffic.upload)
      }
      // Download
      if (data.traffic.download) {
        trafficValues[1].classList.remove('skeleton')
        trafficValues[1].textContent = formatBytes(data.traffic.download)
      }
      // Total Used
      if (data.traffic.total_used) {
        trafficValues[2].classList.remove('skeleton')
        trafficValues[2].textContent = formatBytes(data.traffic.total_used)
      }
      // Remaining
      if (data.traffic.available) {
        trafficValues[3].classList.remove('skeleton')
        trafficValues[3].textContent = formatBytes(data.traffic.available)
      }
    }

    // Update progress bar
    if (data.traffic?.used_percent !== undefined) {
      const percent = data.traffic.used_percent
      const progressFill = document.getElementById('progress-fill')
      const progressPercent = document.getElementById('progress-percent')

      if (progressFill) {
        progressFill.style.width = `${percent}%`
        const color = getTrafficStatusColor(percent)
        progressFill.style.background = color
      }

      if (progressPercent) {
        progressPercent.classList.remove('skeleton')
        progressPercent.textContent = formatPercent(percent)
      }
    }

    // Enable buttons
    const btnNodes = document.getElementById('btn-nodes')
    const btnRefresh = document.getElementById('btn-refresh')

    if (btnNodes) {
      btnNodes.removeAttribute('disabled')
      btnNodes.addEventListener('click', () => {
        window.location.href = '/user/nodes.html'
      })
    }

    if (btnRefresh) {
      btnRefresh.removeAttribute('disabled')
      btnRefresh.addEventListener('click', () => {
        window.location.reload()
      })
    }

    console.log('[Enhance] ✓ Static HTML updated successfully')
  } catch (error) {
    console.error('[Enhance] ✗ Failed to update static HTML:', error)
  }
}

// ============================================
// 🚀 Main Enhancement Logic
// ============================================
async function enhanceDashboard() {
  console.log('[Enhance] Starting dashboard enhancement...')

  // Check authentication
  if (!auth.isLoggedIn()) {
    console.warn('[Enhance] User not authenticated, redirecting...')
    auth.logout()
    return
  }

  console.log('[Enhance] User authenticated, fetching data...')

  // Fetch user data with error isolation
  const userData = await safeFetch(
    async () => {
      const response = await handleApiResponse(api.api.user.info.get()) as any
      return response
    },
    {},
    'User Info'
  )

  // Fetch traffic data with error isolation
  const trafficData = await safeFetch(
    async () => {
      const response = await handleApiResponse(api.api.user.traffic.get()) as any
      return response
    },
    {},
    'Traffic Data'
  )

  // Combine data
  const combinedData = {
    ...userData,
    traffic: trafficData.daily_traffic || userData.traffic
  }

  // Update static HTML with fetched data
  if (Object.keys(combinedData).length > 0) {
    updateStaticHTML(combinedData)
  } else {
    console.warn('[Enhance] No data fetched, showing placeholder values')
    showErrorState('API', '无法获取数据')
  }
}

// ============================================
// 🎬 Start Enhancement
// ============================================
// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', enhanceDashboard)
} else {
  enhanceDashboard()
}

// Export for testing
export { enhanceDashboard, updateStaticHTML }
