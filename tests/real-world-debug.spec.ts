/**
 * Real-World Blackbox Debugging
 *
 * This test ACTUALLY visits the production URL and captures
 * console errors, network failures, and screenshots.
 */

import { test, expect } from '@playwright/test'

const PROD_URL = 'https://test-spanel-bun.freessr.bid'

test.describe('REAL-WORLD DEBUG: Production Environment', () => {
  test('should capture console errors and network failures on /user/index.html', async ({ page }) => {
    console.log('\n========================================')
    console.log('DEBUGGING REAL PRODUCTION URL')
    console.log('========================================')
    console.log(`URL: ${PROD_URL}/user/index.html\n`)

    // Collect all console messages
    const consoleLogs: string[] = []
    const consoleErrors: string[] = []
    const networkErrors: string[] = []

    page.on('console', msg => {
      const text = msg.text()
      const type = msg.type()

      consoleLogs.push(`[${type}] ${text}`)

      if (type === 'error') {
        consoleErrors.push(text)
        console.log('❌ CONSOLE ERROR:', text)
      }
    })

    page.on('response', response => {
      if (response.status() >= 400) {
        const error = `${response.url()} - ${response.status()} ${response.statusText()}`
        networkErrors.push(error)
        console.log('❌ NETWORK ERROR:', error)
      }
    })

    page.on('requestfailed', request => {
      const failure = request.failure()
      const error = `${request.url()} - ${failure?.errorText}`
      networkErrors.push(error)
      console.log('❌ REQUEST FAILED:', error)
    })

    // Navigate to REAL production URL
    console.log('📸 Navigating to production URL...')
    try {
      const response = await page.goto(`${PROD_URL}/user/index.html`, {
        waitUntil: 'networkidle',
        timeout: 10000
      })

      console.log(`✓ Response status: ${response?.status()}`)
      console.log(`✓ Final URL: ${page.url()}`)
    } catch (error) {
      console.log('❌ NAVIGATION ERROR:', error)
    }

    // Wait a bit for any delayed errors
    await page.waitForTimeout(3000)

    // Take screenshot IMMEDIATELY
    console.log('📸 Taking screenshot...')
    await page.screenshot({
      path: 'test-results/PRODUCTION-user-index-REAL.png',
      fullPage: true
    })

    // Check if page is actually empty
    const bodyText = await page.evaluate(() => document.body.innerText)
    console.log('\n📄 Page text content length:', bodyText.length)
    console.log('First 200 chars:', bodyText.substring(0, 200))

    // Check for specific error indicators
    const hasVueApp = await page.locator('#app').count()
    const hasStaticContent = await page.locator('.dashboard-header').count()
    const hasAnyContent = bodyText.length > 0

    console.log('\n🔍 Page Analysis:')
    console.log('  - #app elements:', hasVueApp)
    console.log('  - .dashboard-header elements:', hasStaticContent)
    console.log('  - Has text content:', hasAnyContent)

    // Print all console logs
    console.log('\n📋 All Console Logs:')
    consoleLogs.forEach(log => console.log('  ', log))

    // Print summary
    console.log('\n========================================')
    console.log('DEBUG SUMMARY')
    console.log('========================================')
    console.log(`Console Errors: ${consoleErrors.length}`)
    console.log(`Network Errors: ${networkErrors.length}`)
    console.log(`Final URL: ${page.url()}`)

    if (consoleErrors.length > 0) {
      console.log('\n❌ CONSOLE ERRORS:')
      consoleErrors.forEach(err => console.log('  -', err))
    }

    if (networkErrors.length > 0) {
      console.log('\n❌ NETWORK ERRORS:')
      networkErrors.forEach(err => console.log('  -', err))
    }

    console.log('\n📸 Screenshot saved to: test-results/PRODUCTION-user-index-REAL.png')
    console.log('========================================\n')

    // Assertions to expose the truth
    expect(hasAnyContent, 'Page should have SOME content').toBe(true)

    // This will likely fail - that's the point!
    // We want to SEE the failure
  })

  test('should check auth/login.html for comparison', async ({ page }) => {
    console.log('\n========================================')
    console.log('CHECKING LOGIN PAGE (for comparison)')
    console.log('========================================\n')

    const consoleErrors: string[] = []

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto(`${PROD_URL}/auth/login.html`, {
      waitUntil: 'networkidle',
      timeout: 10000
    })

    await page.waitForTimeout(2000)

    await page.screenshot({
      path: 'test-results/PRODUCTION-login-REAL.png',
      fullPage: true
    })

    const bodyText = await page.evaluate(() => document.body.innerText)
    const hasForm = await page.locator('#login-form').count()

    console.log('Login page analysis:')
    console.log('  - Has login form:', hasForm > 0)
    console.log('  - Text length:', bodyText.length)
    console.log('  - Console errors:', consoleErrors.length)

    if (consoleErrors.length > 0) {
      console.log('\nLogin page console errors:')
      consoleErrors.forEach(err => console.log('  -', err))
    }

    console.log('\n📸 Screenshot saved to: test-results/PRODUCTION-login-REAL.png')
  })

  test('should check main index page', async ({ page }) => {
    console.log('\n========================================')
    console.log('CHECKING MAIN INDEX PAGE')
    console.log('========================================\n')

    await page.goto(`${PROD_URL}/`, {
      waitUntil: 'networkidle',
      timeout: 10000
    })

    await page.waitForTimeout(2000)

    await page.screenshot({
      path: 'test-results/PRODUCTION-index-REAL.png',
      fullPage: true
    })

    const bodyText = await page.evaluate(() => document.body.innerText)
    console.log('Main page text length:', bodyText.length)
    console.log('Final URL:', page.url())
    console.log('\n📸 Screenshot saved to: test-results/PRODUCTION-index-REAL.png')
  })
})
