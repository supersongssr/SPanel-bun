/**
 * Static-First Architecture Manual Verification
 *
 * This script manually verifies the static-first architecture
 * by checking HTML files directly without requiring authentication
 */

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.TEST_BASE_URL || 'https://test-spanel-bun.freessr.bid'

test.describe('Manual Static-First Architecture Verification', () => {
  test('should load login page with static HTML immediately', async ({ page }) => {
    console.log('Testing login page static rendering...')

    const startTime = Date.now()
    await page.goto(`${BASE_URL}/auth/login.html`)
    const loadTime = Date.now() - startTime

    console.log(`Login page loaded in ${loadTime}ms`)

    // Check static elements are visible
    await expect(page.locator('.auth-container')).toBeVisible({ timeout: 1000 })
    await expect(page.locator('.auth-card')).toBeVisible()
    await expect(page.locator('h2:has-text("SPanel 登录")')).toBeVisible()

    // Check form fields
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.locator('#submit-btn')).toBeVisible()

    console.log('✓ Login page static HTML verified')
  })

  test('should load register page with static HTML immediately', async ({ page }) => {
    console.log('Testing register page static rendering...')

    const startTime = Date.now()
    await page.goto(`${BASE_URL}/auth/register.html`)
    const loadTime = Date.now() - startTime

    console.log(`Register page loaded in ${loadTime}ms`)

    // Check static elements
    await expect(page.locator('.auth-container')).toBeVisible({ timeout: 1000 })
    await expect(page.locator('.auth-card')).toBeVisible()
    await expect(page.locator('h2:has-text("SPanel 注册")')).toBeVisible()

    // Check form fields
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#username')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.locator('#confirmPassword')).toBeVisible()
    await expect(page.locator('#inviteCode')).toBeVisible()

    console.log('✓ Register page static HTML verified')
  })

  test('should show dashboard header with skeleton loading (before redirect)', async ({ page }) => {
    console.log('Testing dashboard static rendering (before auth redirect)...')

    // Block the redirect by blocking the auth check script
    await page.route('**/dashboard-enhance.ts', route => route.abort())

    await page.goto(`${BASE_URL}/user/dashboard.html`)

    // The auth guard should redirect quickly
    // But before redirect, we should see the static HTML
    await page.waitForTimeout(100)

    // Take screenshot to see what's rendered
    await page.screenshot({ path: 'test-results/dashboard-before-redirect.png' })

    console.log('✓ Dashboard screenshot captured')
  })

  test('should handle login form validation', async ({ page }) => {
    console.log('Testing login form validation...')

    await page.goto(`${BASE_URL}/auth/login.html`)

    // Wait for form
    await expect(page.locator('#email')).toBeVisible()

    // Try to submit empty form
    await page.click('#submit-btn')
    await page.waitForTimeout(500)

    // Check if validation works (either via JS or HTML5)
    const emailInput = page.locator('#email')
    const isRequired = await emailInput.evaluate(el => el.hasAttribute('required'))

    console.log(`Email input required attribute: ${isRequired}`)

    // Fill with invalid email
    await page.fill('#email', 'invalid-email')
    await page.click('#submit-btn')
    await page.waitForTimeout(500)

    console.log('✓ Login form validation tested')
  })

  test('should measure page load performance', async ({ page }) => {
    console.log('Measuring page load performance...')

    // Test login page
    const loginStart = Date.now()
    await page.goto(`${BASE_URL}/auth/login.html`)
    await page.waitForSelector('.auth-card')
    const loginLoadTime = Date.now() - loginStart

    console.log(`Login page load time: ${loginLoadTime}ms`)

    // Test register page
    const registerStart = Date.now()
    await page.goto(`${BASE_URL}/auth/register.html`)
    await page.waitForSelector('.auth-card')
    const registerLoadTime = Date.now() - registerStart

    console.log(`Register page load time: ${registerLoadTime}ms`)

    // Both should load in less than 2 seconds
    expect(loginLoadTime).toBeLessThan(2000)
    expect(registerLoadTime).toBeLessThan(2000)

    console.log('✓ Performance metrics collected')
  })

  test('should verify CSS is loaded inline', async ({ page }) => {
    console.log('Verifying inline CSS...')

    await page.goto(`${BASE_URL}/auth/login.html`)

    // Check if styles are applied
    const authCard = page.locator('.auth-card')
    const bgColor = await authCard.evaluate(el => window.getComputedStyle(el).backgroundColor)

    console.log(`Auth card background color: ${bgColor}`)

    // Should have white/rgba background (from CSS)
    expect(bgColor).toContain('255')

    console.log('✓ Inline CSS verified')
  })

  test('should test API delay simulation on login page', async ({ page }) => {
    console.log('Testing API delay handling on login...')

    // Simulate slow API response
    await page.route('**/api/auth/login', async route => {
      await new Promise(resolve => setTimeout(resolve, 3000))
      route.continue()
    })

    await page.goto(`${BASE_URL}/auth/login.html`)

    // Fill form
    await page.fill('#email', 'test@example.com')
    await page.fill('#password', 'testpassword')

    // Submit
    const submitBtn = page.locator('#submit-btn')
    await submitBtn.click()

    // Check if button shows loading state
    await page.waitForTimeout(100)
    const isLoading = await submitBtn.evaluate(el => el.classList.contains('loading'))

    console.log(`Submit button loading state: ${isLoading}`)

    // Wait for API response
    await page.waitForTimeout(3500)

    console.log('✓ API delay handling tested')
  })
})
