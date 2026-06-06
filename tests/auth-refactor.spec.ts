/**
 * Auth Refactor Verification Test
 *
 * Tests the complete authentication flow after global refactor:
 * 1. Registration with correct field names
 * 2. Login with credentials
 * 3. Redirect logic verification (always to /auth/login.html)
 * 4. UI element verification (Flex layout links)
 *
 * Run with: bunx playwright test auth-refactor.spec.ts
 */

import { test, expect } from '@playwright/test'

const BASE_URL = 'https://test-spanel-bun.freessr.bid'
const API_BASE = 'http://localhost:3000/api'

// Helper: Generate random test user
function generateTestUser() {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 10000)
  return {
    email: `refactor-test-${timestamp}-${random}@test.com`,
    username: `refactoruser${timestamp}${random}`,
    password: 'RefactorTest123!',
  }
}

test.describe('Auth Refactor Verification', () => {
  let testUser: ReturnType<typeof generateTestUser>

  test.beforeEach(async () => {
    testUser = generateTestUser()
  })

  test('REG-REFACTOR-001: Registration with correct API field names', async ({ page, request }) => {
    console.log(`\n📝 Testing registration API refactor for: ${testUser.email}`)

    // Test API directly with correct field names
    const registerResponse = await request.post(`${API_BASE}/auth/register`, {
      data: {
        email: testUser.email,
        user_name: testUser.username,
        password: testUser.password,
      },
    })

    console.log(`📌 Registration API status: ${registerResponse.status()}`)

    expect(registerResponse.ok()).toBeTruthy()

    const registerData = await registerResponse.json()
    expect(registerData.message).toContain('success')
    console.log(`✅ Registration successful with correct field names`)
  })

  test('REG-UI-001: Registration page UI elements', async ({ page }) => {
    console.log('\n🎨 Testing registration page UI')

    await page.goto(`${BASE_URL}/auth/register.html`)
    await page.waitForLoadState('networkidle')

    // Check title
    await expect(page).toHaveTitle(/注册.*SPanel/)
    console.log('✅ Register page title correct')

    // Verify Flex layout links
    const linksContainer = page.locator('.links')
    await expect(linksContainer).toBeVisible()

    // Check flex layout
    const justifyContent = await linksContainer.evaluate((el: any) =>
      window.getComputedStyle(el).justifyContent
    )
    expect(justifyContent).toBe('space-between')
    console.log('✅ Links using Flex layout with space-between')

    // Check margin-top
    const marginTop = await linksContainer.evaluate((el: any) =>
      window.getComputedStyle(el).marginTop
    )
    expect(marginTop).toBe('20px')
    console.log('✅ Links have 20px top margin')

    // Verify Element Plus links
    const registerLink = page.locator('.links .el-link[href="/auth/login.html"]')
    await expect(registerLink).toBeVisible()
    console.log('✅ Element Plus link component visible')
  })

  test('LOGIN-UI-001: Login page UI elements', async ({ page }) => {
    console.log('\n🎨 Testing login page UI')

    await page.goto(`${BASE_URL}/auth/login.html`)
    await page.waitForLoadState('networkidle')

    // Check title
    await expect(page).toHaveTitle(/登录.*SPanel/)
    console.log('✅ Login page title correct')

    // Verify Flex layout links
    const linksContainer = page.locator('.links')
    await expect(linksContainer).toBeVisible()

    const justifyContent = await linksContainer.evaluate((el: any) =>
      window.getComputedStyle(el).justifyContent
    )
    expect(justifyContent).toBe('space-between')
    console.log('✅ Links using Flex layout with space-between')

    // Verify both links exist
    const registerLink = page.locator('.links .el-link[href="/auth/register.html"]')
    const resetLink = page.locator('.links .el-link[href="/auth/resetpassword.html"]')

    await expect(registerLink).toBeVisible()
    await expect(resetLink).toBeVisible()
    console.log('✅ Both "Register" and "Forgot Password" links visible')
  })

  test('REDIRECT-001: Verify all redirects go to /auth/login.html', async ({ page }) => {
    console.log('\n🔀 Testing redirect logic')

    // Create a user first
    await page.request.post(`${API_BASE}/auth/register`, {
      data: {
        email: testUser.email,
        user_name: testUser.username,
        password: testUser.password,
      },
    })

    // Test 1: Access protected route without token
    await page.goto(`${BASE_URL}/user/`)
    await page.waitForTimeout(2000)

    const currentUrl = page.url()
    console.log(`📌 Redirected to: ${currentUrl}`)

    // Should redirect to /auth/login.html
    expect(currentUrl).toContain('/auth/login.html')
    console.log('✅ Redirect to /auth/login.html confirmed')
  })

  test('FULL-FLOW-001: Complete registration to login flow', async ({ page }) => {
    console.log('\n🔄 Testing complete auth flow')

    // Step 1: Visit registration page
    await page.goto(`${BASE_URL}/auth/register.html`)
    await page.waitForLoadState('networkidle')
    console.log('✅ Step 1: On registration page')

    // Step 2: Fill registration form
    await page.fill('input[placeholder*="邮箱"]', testUser.email)
    await page.fill('input[placeholder*="用户名"]', testUser.username)
    await page.fill('input[placeholder*="密码（至少8位）"]', testUser.password)
    await page.fill('input[placeholder*="再次输入密码"]', testUser.password)
    console.log('✅ Step 2: Form filled')

    // Step 3: Submit registration
    await page.click('button:has-text("注册")')
    await page.waitForTimeout(3000)
    console.log('✅ Step 3: Registration submitted')

    // Step 4: Should redirect to login or show success
    const currentUrl = page.url()
    console.log(`📌 After registration, URL: ${currentUrl}`)

    // Step 5: Go to login page
    await page.goto(`${BASE_URL}/auth/login.html`)
    await page.waitForLoadState('networkidle')
    console.log('✅ Step 5: On login page')

    // Step 6: Fill login form
    await page.fill('input[placeholder*="邮箱"]', testUser.email)
    await page.fill('input[placeholder*="密码"]', testUser.password)
    console.log('✅ Step 6: Login form filled')

    // Step 7: Submit login
    await page.click('button:has-text("登录")')
    await page.waitForTimeout(3000)
    console.log('✅ Step 7: Login submitted')

    // Step 8: Verify redirect to dashboard
    const finalUrl = page.url()
    console.log(`📌 After login, URL: ${finalUrl}`)

    expect(finalUrl).toContain('/user')
    expect(finalUrl).not.toContain('403')
    expect(finalUrl).not.toContain('404')
    console.log('✅ Step 8: Redirected to user dashboard (no 403/404)')
  })

  test('CLEANUP-001: Verify no legacy login.html references', async ({ page }) => {
    console.log('\n🧹 Testing for legacy file cleanup')

    // Try to access legacy login.html - should NOT exist (404 or redirect)
    const response = await page.request.get(`${BASE_URL}/login.html`)

    // Should get 404 or be redirected to /auth/login.html
    const status = response.status()
    console.log(`📌 /login.html status: ${status}`)

    // Either 404 (file deleted) or redirect to /auth/login.html
    expect(status === 404 || response.url().includes('/auth/login.html')).toBeTruthy()
    console.log('✅ Legacy login.html properly cleaned up')
  })
})
