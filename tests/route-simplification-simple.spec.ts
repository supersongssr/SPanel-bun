import { test, expect } from '@playwright/test';

const BASE_URL = 'https://test-spanel-bun.freessr.bid';

test.describe('Route Simplification - Basic Validation', () => {
  test('should load /user/ and serve index.html', async ({ page }) => {
    await page.goto(`${BASE_URL}/user/`);
    await page.waitForLoadState('networkidle');

    // Verify we're on /user/
    expect(page.url()).toContain('/user/');

    // Check title
    const title = await page.title();
    expect(title).toBe('用户控制台 - SPanel');

    // Verify #app container exists
    const app = page.locator('#app');
    await expect(app).toBeAttached();
  });

  test('should serve /user/index.html directly', async ({ page }) => {
    await page.goto(`${BASE_URL}/user/index.html`);
    await page.waitForLoadState('networkidle');

    // Verify title
    const title = await page.title();
    expect(title).toBe('用户控制台 - SPanel');

    // Verify #app container exists
    const app = page.locator('#app');
    await expect(app).toBeAttached();
  });

  test('should allow authenticated user to access /user/', async ({ page, context }) => {
    // First, login using API to get token
    const loginResponse = await context.request.post(`${BASE_URL}/api/auth/login`, {
      data: {
        email: 'test-spanel@ssmail.win',
        password: 'testSpanelRsync@*'
      }
    });

    const loginData = await loginResponse.json();
    expect(loginData.token).toBeDefined();
    expect(loginData.user).toBeDefined();

    // Set cookies for authentication
    await context.addCookies([
      {
        name: 'auth_token',
        value: loginData.token,
        domain: 'test-spanel-bun.freessr.bid',
        path: '/',
      }
    ]);

    // Now access /user/ page
    await page.goto(`${BASE_URL}/user/`);
    await page.waitForLoadState('networkidle');

    // Verify we can access the user dashboard
    const title = await page.title();
    expect(title).toBe('用户控制台 - SPanel');

    // Verify #app container exists
    const app = page.locator('#app');
    await expect(app).toBeAttached();
  });
});
