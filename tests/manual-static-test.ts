/**
 * Manual Static-First Architecture Test
 *
 * Run this with: bun run tests/manual-static-test.ts
 *
 * This script performs automated browser testing to verify:
 * 1. Static HTML renders immediately
 * 2. API delays don't cause white screens
 * 3. API errors show graceful fallbacks
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright'

const BASE_URL = process.env.TEST_BASE_URL || 'http://test-spanel-bun.freessr.bid'

// ============================================
// Test Helpers
// ============================================
async function createBrowser(): Promise<Browser> {
  return await chromium.launch({
    headless: false, // Show browser for visual verification
    slowMo: 100 // Slow down for visibility
  })
}

async function setupPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  })
  const page = await context.newPage()

  // Log console messages
  page.on('console', msg => {
    const type = msg.type()
    const text = msg.text()
    console.log(`[Browser ${type.toUpperCase()}]`, text)
  })

  // Log network errors
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`[Network Error] ${response.url()} - ${response.status()}`)
    }
  })

  return page
}

// ============================================
// Test Scenarios
// ============================================
async function testScenarioA_DelayedAPI() {
  console.log('\n=== Scenario A: Testing API Delay (5 seconds) ===')

  const browser = await createBrowser()
  const page = await setupPage(browser)

  try {
    // Intercept API calls and add 5 second delay
    await page.route('**/api/user/info', async route => {
      console.log('[Test] Intercepting API call, delaying 5 seconds...')
      await new Promise(resolve => setTimeout(resolve, 5000))
      route.continue()
    })

    // Navigate to dashboard
    console.log('[Test] Navigating to dashboard...')
    const startTime = Date.now()

    await page.goto(`${BASE_URL}/user/dashboard.html`)

    // IMMEDIATELY check for static elements (within 100ms)
    const initialLoadTime = Date.now() - startTime
    console.log(`[Test] Initial load time: ${initialLoadTime}ms`)

    // Check if header is visible
    const headerVisible = await page.locator('.dashboard-header').isVisible({ timeout: 100 })
    console.log(`[Test] Header visible immediately: ${headerVisible}`)

    if (!headerVisible) {
      console.error('❌ FAILED: Header not visible within 100ms')
    } else {
      console.log('✅ PASSED: Header visible within 100ms')
    }

    // Check for card framework
    const cardVisible = await page.locator('.info-card').first().isVisible({ timeout: 100 })
    console.log(`[Test] Card framework visible: ${cardVisible}`)

    if (!cardVisible) {
      console.error('❌ FAILED: Card framework not visible within 100ms')
    } else {
      console.log('✅ PASSED: Card framework visible within 100ms')
    }

    // Check for skeleton loading states
    const skeletonCount = await page.locator('.skeleton').count()
    console.log(`[Test] Skeleton elements found: ${skeletonCount}`)

    if (skeletonCount > 0) {
      console.log('✅ PASSED: Skeleton loading states present')
    } else {
      console.error('❌ FAILED: No skeleton loading states found')
    }

    // Wait for API to complete
    console.log('[Test] Waiting for API to complete (5 seconds)...')
    await page.waitForTimeout(6000)

    // Check if data was loaded
    const finalSkeletonCount = await page.locator('.skeleton').count()
    console.log(`[Test] Final skeleton count: ${finalSkeletonCount}`)

    if (finalSkeletonCount === 0) {
      console.log('✅ PASSED: Data loaded successfully')
    } else {
      console.warn('⚠️  WARNING: Some skeletons still present')
    }

    // Take screenshot
    await page.screenshot({ path: 'test-results/scenario-a-delayed-api.png' })
    console.log('[Test] Screenshot saved to test-results/scenario-a-delayed-api.png')

  } catch (error) {
    console.error('❌ Scenario A FAILED:', error)
  } finally {
    await browser.close()
  }
}

async function testScenarioB_APIError() {
  console.log('\n=== Scenario B: Testing API Error (500) ===')

  const browser = await createBrowser()
  const page = await setupPage(browser)

  try {
    // Intercept API calls and return 500 error
    await page.route('**/api/user/info', route => {
      console.log('[Test] Intercepting API call, returning 500 error...')
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal Server Error' })
      })
    })

    // Navigate to dashboard
    console.log('[Test] Navigating to dashboard...')
    await page.goto(`${BASE_URL}/user/dashboard.html`)

    // Check for static elements immediately
    const headerVisible = await page.locator('.dashboard-header').isVisible({ timeout: 100 })
    console.log(`[Test] Header visible immediately: ${headerVisible}`)

    if (!headerVisible) {
      console.error('❌ FAILED: Header not visible within 100ms')
    } else {
      console.log('✅ PASSED: Header visible within 100ms')
    }

    // Wait for API to fail
    console.log('[Test] Waiting for API error...')
    await page.waitForTimeout(2000)

    // Check if framework is still visible
    const cardVisible = await page.locator('.info-card').first().isVisible()
    console.log(`[Test] Card framework still visible: ${cardVisible}`)

    if (!cardVisible) {
      console.error('❌ FAILED: Framework not visible after API error')
    } else {
      console.log('✅ PASSED: Framework survives API error')
    }

    // Take screenshot
    await page.screenshot({ path: 'test-results/scenario-b-api-error.png' })
    console.log('[Test] Screenshot saved to test-results/scenario-b-api-error.png')

  } catch (error) {
    console.error('❌ Scenario B FAILED:', error)
  } finally {
    await browser.close()
  }
}

async function testScenarioC_AuthPages() {
  console.log('\n=== Scenario C: Testing Auth Pages Static Rendering ===')

  const browser = await createBrowser()
  const page = await setupPage(browser)

  try {
    // Test login page
    console.log('[Test] Testing login page...')
    await page.goto(`${BASE_URL}/auth/login.html`)

    const loginFormVisible = await page.locator('.auth-card').isVisible({ timeout: 100 })
    console.log(`[Test] Login form visible: ${loginFormVisible}`)

    if (!loginFormVisible) {
      console.error('❌ FAILED: Login form not visible within 100ms')
    } else {
      console.log('✅ PASSED: Login form visible within 100ms')
    }

    // Test register page
    console.log('[Test] Testing register page...')
    await page.goto(`${BASE_URL}/auth/register.html`)

    const registerFormVisible = await page.locator('.auth-card').isVisible({ timeout: 100 })
    console.log(`[Test] Register form visible: ${registerFormVisible}`)

    if (!registerFormVisible) {
      console.error('❌ FAILED: Register form not visible within 100ms')
    } else {
      console.log('✅ PASSED: Register form visible within 100ms')
    }

    // Take screenshot
    await page.screenshot({ path: 'test-results/scenario-c-auth-pages.png' })
    console.log('[Test] Screenshot saved to test-results/scenario-c-auth-pages.png')

  } catch (error) {
    console.error('❌ Scenario C FAILED:', error)
  } finally {
    await browser.close()
  }
}

// ============================================
// Main Test Runner
// ============================================
async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════╗')
  console.log('║   Static-First Architecture Verification Tests         ║')
  console.log('╚════════════════════════════════════════════════════════╝')
  console.log(`\nBase URL: ${BASE_URL}`)
  console.log('\nStarting tests...\n')

  try {
    await testScenarioA_DelayedAPI()
    await testScenarioB_APIError()
    await testScenarioC_AuthPages()

    console.log('\n╔════════════════════════════════════════════════════════╗')
    console.log('║   All Tests Complete!                                 ║')
    console.log('╚════════════════════════════════════════════════════════╝')
  } catch (error) {
    console.error('\n❌ Test suite failed:', error)
    process.exit(1)
  }
}

// Run tests
runAllTests()
