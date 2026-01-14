import { test, expect } from '@playwright/test';

const BASE_URL = 'https://test-spanel-bun.freessr.bid';

test.describe('Route Simplification & SSO Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear cookies/storage before each test
    await page.context().clearCookies();
    await page.goto(`${BASE_URL}/auth/`);
  });

  test('should load /user/ index page correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/user/`);
    await page.waitForLoadState('networkidle');

    // Check if we're on /user/ (nginx serves index.html as directory index)
    expect(page.url()).toContain('/user/');

    // Check if page loads without errors
    const title = await page.title();
    expect(title).toContain('用户控制台');
  });

  test('should redirect logged-in admin from /auth/login.html to /user/', async ({ page }) => {
    // Login as admin
    await page.goto(`${BASE_URL}/auth/login.html`);
    await page.waitForLoadState('networkidle');

    // Wait for Vue app to mount
    await page.waitForSelector('#app', { timeout: 5000 });
    await page.waitForTimeout(1000);

    // Fill in login form
    await page.fill('input[placeholder*="邮箱"]', 'test-spanel@ssmail.win');
    await page.fill('input[placeholder*="密码"]', 'testSpanelRsync@*');
    await page.click('button:has-text("登录")');

    // Wait for login to complete and redirect
    await page.waitForURL('**/user/**', { timeout: 10000 });

    // Verify we're on the user page
    expect(page.url()).toContain('/user/');

    // Now try to go back to login page
    await page.goto(`${BASE_URL}/auth/login.html`);

    // Should redirect back to /user/
    await page.waitForURL('**/user/**', { timeout: 5000 });
    expect(page.url()).toContain('/user/');
  });

  test('should redirect logged-in user from / to /user/', async ({ page }) => {
    // Login as regular user
    await page.goto(`${BASE_URL}/auth/login.html`);
    await page.waitForLoadState('networkidle');

    // Wait for Vue app to mount
    await page.waitForSelector('#app', { timeout: 5000 });
    await page.waitForTimeout(1000);

    await page.fill('input[placeholder*="邮箱"]', 'test-spanel@ssmail.win');
    await page.fill('input[placeholder*="密码"]', 'testSpanelRsync@*');
    await page.click('button:has-text("登录")');

    // Wait for login redirect
    await page.waitForURL('**/user/**', { timeout: 10000 });

    // Now try to go to root
    await page.goto(`${BASE_URL}/`);

    // Should redirect to /user/
    await page.waitForURL('**/user/**', { timeout: 5000 });
    expect(page.url()).toContain('/user/');
  });

  test('should load user dashboard content', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/auth/login.html`);
    await page.waitForLoadState('networkidle');

    // Wait for Vue app to mount
    await page.waitForSelector('#app', { timeout: 5000 });
    await page.waitForTimeout(1000);

    await page.fill('input[placeholder*="邮箱"]', 'test-spanel@ssmail.win');
    await page.fill('input[placeholder*="密码"]', 'testSpanelRsync@*');
    await page.click('button:has-text("登录")');

    // Wait for redirect to user index
    await page.waitForURL('**/user/**', { timeout: 10000 });

    // Check if dashboard content loads
    await page.waitForLoadState('networkidle');

    // Verify app container exists
    const app = page.locator('#app');
    await expect(app).toBeVisible();
  });
});
