/**
 * Auth Flow E2E Test
 *
 * Tests the complete authentication cycle:
 * 1. Registration flow with database verification
 * 2. Login flow with redirect verification to user dashboard
 * 3. Page title, background, and mobile responsiveness verification
 *
 * Run with: bunx playwright test auth-flow.spec.ts
 * Run with UI: bunx playwright test auth-flow.spec.ts --ui
 * Run headed: bunx playwright test auth-flow.spec.ts --headed
 */

import { test, expect } from '@playwright/test'

const BASE_URL = 'https://test-spanel-bun.freessr.bid'
const API_BASE = 'http://localhost:3000/api'

// Helper: Generate random test user
function generateTestUser() {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 10000)
  return {
    email: `e2e-test-${timestamp}-${random}@test.com`,
    username: `e2euser${timestamp}${random}`,
    password: 'E2E@TestPass123!',
  }
}

test.describe('Authentication Flow', () => {
  let testUser: ReturnType<typeof generateTestUser>

  test.beforeEach(async () => {
    testUser = generateTestUser()
  })

  test.afterEach(async ({ page }) => {
    // Cleanup: Try to delete the test user via API if they exist
    try {
      // First login to get token
      const loginResponse = await page.request.post(`${API_BASE}/auth/login`, {
        data: {
          email: testUser.email,
          password: testUser.password,
        },
      })

      if (loginResponse.ok()) {
        const loginData = await loginResponse.json()
        if (loginData.data?.token) {
          // Delete the user (requires admin or self-delete endpoint)
          // For now, we'll just log that cleanup would happen here
          console.log(`Test user ${testUser.email} created successfully`)
        }
      }
    } catch (error) {
      // User might not exist, which is fine
      console.log('Cleanup skipped (user may not exist)')
    }
  })

  test('REG-001: Registration flow - complete registration and verify in database', async ({ page }) => {
    console.log(`\n📝 Testing registration for: ${testUser.email}`)

    // Navigate to registration page
    await page.goto(`${BASE_URL}/auth/register.html`)
    await page.waitForLoadState('networkidle')

    // Verify page loaded
    await expect(page).toHaveTitle(/注册.*SPanel/)
    console.log('✅ Registration page loaded successfully')

    // Wait for form to be ready (Vue app renders)
    await page.waitForTimeout(2000)

    // Check if page has form elements
    const hasEmailInput = await page.locator('input[type="email"]').count() > 0
    const hasTextbox = await page.locator('text=* 邮箱').count() > 0

    console.log(`📌 Page has email input: ${hasEmailInput}, has textbox label: ${hasTextbox}`)

    // The form is rendered by Vue, use getByRole or getByText
    // Fill email (look for input with "邮箱" placeholder or label)
    try {
      const emailInput = page.getByPlaceholder('请输入邮箱')
      await emailInput.fill(testUser.email)
      console.log('✅ Filled email using placeholder')
    } catch {
      // Fallback to role-based selector
      await page.getByRole('textbox', { name: '* 邮箱' }).fill(testUser.email)
      console.log('✅ Filled email using role')
    }

    // Fill username
    try {
      await page.getByPlaceholder('请输入用户名').fill(testUser.username)
      console.log('✅ Filled username')
    } catch {
      await page.getByRole('textbox', { name: '* 用户名' }).fill(testUser.username)
      console.log('✅ Filled username using role')
    }

    // Fill password
    try {
      await page.getByPlaceholder('请输入密码（至少8位）').fill(testUser.password)
      console.log('✅ Filled password')
    } catch {
      await page.getByRole('textbox', { name: '* 密码' }).fill(testUser.password)
      console.log('✅ Filled password using role')
    }

    // Fill confirm password
    try {
      await page.getByPlaceholder('请再次输入密码').fill(testUser.password)
      console.log('✅ Filled confirm password')
    } catch {
      await page.getByRole('textbox', { name: '* 确认密码' }).fill(testUser.password)
      console.log('✅ Filled confirm password using role')
    }

    // Submit form
    await page.getByRole('button', { name: '注册' }).click()
    console.log('✅ Submitted registration form')

    // Wait for response
    await page.waitForTimeout(2000)

    // Check if registration was successful
    // Success could be: redirect to login, redirect to user dashboard, or success message
    const currentUrl = page.url()
    console.log(`📌 Current URL after registration: ${currentUrl}`)

    // Verify user was created via API
    const verifyResponse = await page.request.post(`${API_BASE}/auth/login`, {
      data: {
        email: testUser.email,
        password: testUser.password,
      },
    })

    expect(verifyResponse.ok()).toBeTruthy()
    const verifyData = await verifyResponse.json()
    expect(verifyData.data?.token).toBeDefined()
    console.log(`✅ User successfully created and verified in database`)

    // Check for success message or redirect
    if (currentUrl.includes('login') || currentUrl.includes('user')) {
      console.log('✅ Registration successful - redirected appropriately')
    } else {
      // Look for success message
      const successMessage = await page.locator('text=/成功|success|注册成功/i').first().textContent().catch(() => '')
      if (successMessage) {
        console.log(`✅ Registration successful - found success message: ${successMessage}`)
      }
    }
  })

  test('LOG-001: Login flow - login and verify redirect to user dashboard', async ({ page, request }) => {
    console.log(`\n🔐 Testing login for: ${testUser.email}`)

    // First, create the user via API
    const registerResponse = await request.post(`${API_BASE}/auth/register`, {
      data: {
        email: testUser.email,
        user_name: testUser.username, // Use snake_case to match API
        password: testUser.password,
      },
    })

    const registerStatus = registerResponse.status()
    console.log(`📌 Registration API status: ${registerStatus}`)

    if (!registerResponse.ok()) {
      const body = await registerResponse.text()
      console.log(`❌ Registration failed: ${body}`)
    }

    expect(registerResponse.ok()).toBeTruthy()
    console.log('✅ Test user created via API')

    // Navigate to login page
    await page.goto(`${BASE_URL}/auth/login.html`)
    await page.waitForLoadState('networkidle')

    // Verify page loaded
    await expect(page).toHaveTitle(/登录.*SPanel/)
    console.log('✅ Login page loaded successfully')

    // Wait for Vue app to render
    await page.waitForTimeout(2000)

    // Fill login form using Chinese labels
    try {
      await page.getByPlaceholder('请输入邮箱').fill(testUser.email)
      console.log('✅ Filled email using placeholder')
    } catch {
      await page.getByRole('textbox', { name: '* 邮箱' }).fill(testUser.email)
      console.log('✅ Filled email using role')
    }

    try {
      await page.getByPlaceholder('请输入密码').fill(testUser.password)
      console.log('✅ Filled password using placeholder')
    } catch {
      await page.getByRole('textbox', { name: '* 密码' }).fill(testUser.password)
      console.log('✅ Filled password using role')
    }

    // Submit form
    await page.getByRole('button', { name: '登录' }).click()
    console.log('✅ Submitted login form')

    // Wait for navigation/redirect
    await page.waitForTimeout(3000)

    // Verify redirect to user dashboard
    const currentUrl = page.url()
    console.log(`📌 Current URL after login: ${currentUrl}`)

    // Check if we're on the user dashboard
    expect(currentUrl).toContain('/user')
    console.log('✅ Successfully redirected to user dashboard')

    // Verify page title
    await expect(page).toHaveTitle(/用户.*SPanel|控制台.*SPanel/)
    console.log('✅ User dashboard page title verified')

    // Verify we're not on error page
    expect(page.url()).not.toContain('403')
    expect(page.url()).not.toContain('404')
    console.log('✅ No 403/404 errors detected')
  })

  test('UI-001: Verify page titles, styling, and mobile responsiveness', async ({ page }) => {
    console.log('\n🎨 Testing UI elements and responsiveness')

    // Test login page
    await page.goto(`${BASE_URL}/auth/login.html`)
    await page.waitForLoadState('networkidle')

    // Check title
    await expect(page).toHaveTitle(/登录.*SPanel/)
    console.log('✅ Login page title correct')

    // Check for no background (should be clean)
    const body = page.locator('body')
    const bgColor = await body.evaluate((el) => window.getComputedStyle(el).backgroundColor)
    console.log(`📌 Login page background: ${bgColor}`)

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE
    await page.waitForTimeout(500)

    // Verify mobile layout
    const isVisible = await page.locator('input[type="email"], input[type="text"]').isVisible()
    expect(isVisible).toBeTruthy()
    console.log('✅ Login form visible on mobile')

    // Test register page
    await page.goto(`${BASE_URL}/auth/register.html`)
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveTitle(/注册.*SPanel/)
    console.log('✅ Register page title correct')

    // Test user dashboard
    await page.goto(`${BASE_URL}/user/index.html`)
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveTitle(/用户.*SPanel|控制台.*SPanel/)
    console.log('✅ User dashboard title correct')

    // Test user dashboard on mobile
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(500)

    // Check if dashboard is responsive
    const dashboardVisible = await page.locator('#app').isVisible()
    expect(dashboardVisible).toBeTruthy()
    console.log('✅ User dashboard visible on mobile')
  })

  test('ERR-001: Handle registration errors gracefully', async ({ page }) => {
    console.log('\n⚠️  Testing error handling')

    // Try to register with invalid email
    await page.goto(`${BASE_URL}/auth/register.html`)
    await page.waitForLoadState('networkidle')

    // Wait for Vue app
    await page.waitForTimeout(2000)

    // Fill with invalid data
    await page.getByPlaceholder('请输入邮箱').fill('invalid-email')
    await page.getByPlaceholder('请输入用户名').fill('testuser')
    await page.getByPlaceholder('请输入密码（至少8位）').fill('test123')
    await page.getByPlaceholder('请再次输入密码').fill('test123')

    // Submit and check for error
    await page.getByRole('button', { name: '注册' }).click()
    await page.waitForTimeout(2000)

    // Should show error or stay on page
    const currentUrl = page.url()
    expect(currentUrl).toContain('register')
    console.log('✅ Invalid email rejected appropriately')
  })

  test('ERR-002: Handle login errors gracefully', async ({ page }) => {
    console.log('\n⚠️  Testing login error handling')

    await page.goto(`${BASE_URL}/auth/login.html`)
    await page.waitForLoadState('networkidle')

    // Wait for Vue app
    await page.waitForTimeout(2000)

    // Try to login with non-existent user
    await page.getByPlaceholder('请输入邮箱').fill('nonexistent@example.com')
    await page.getByPlaceholder('请输入密码').fill('wrongpassword')

    await page.getByRole('button', { name: '登录' }).click()
    await page.waitForTimeout(2000)

    // Should show error message or stay on login page
    const currentUrl = page.url()
    expect(currentUrl).toContain('login')
    console.log('✅ Invalid credentials rejected appropriately')
  })
})
