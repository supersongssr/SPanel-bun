/**
 * Auth Guard Verification Test
 * Tests the automatic redirect behavior for authentication guards
 */

import { test, expect } from '@playwright/test';

test.describe('Auth Guard - Automatic Redirects', () => {

  test('should redirect logged-in user from login page to dashboard', async ({ page }) => {
    // Set a fake JWT token in localStorage
    await page.goto('https://test-spanel-bun.freessr.bid/auth/login.html');

    // Inject a fake token before the page loads
    await page.addInitScript(() => {
      localStorage.setItem('spanel_jwt_token', 'fake_test_token_' + Date.now());
    });

    // Reload the page to trigger the auth guard
    await page.reload();

    // Should redirect to user dashboard
    await page.waitForURL('**/user/index.html', { timeout: 3000 });
    expect(page.url()).toContain('user/index.html');
  });

  test('should redirect unauthenticated user from dashboard to login', async ({ page, context }) => {
    // Ensure no token is stored
    await context.clearCookies();

    // Try to access user dashboard directly
    await page.goto('https://test-spanel-bun.freessr.bid/user/index.html');

    // Should redirect to login page
    await page.waitForURL('**/auth/login.html', { timeout: 3000 });
    expect(page.url()).toContain('auth/login.html');
  });

  test('should allow access to login page when not authenticated', async ({ page, context }) => {
    // Clear any existing authentication
    await context.clearCookies();
    await page.addInitScript(() => {
      localStorage.removeItem('spanel_jwt_token');
    });

    // Navigate to login page
    await page.goto('https://test-spanel-bun.freessr.bid/auth/login.html');

    // Should stay on login page (no redirect)
    expect(page.url()).toContain('auth/login.html');
    await page.waitForSelector('#email', { timeout: 2000 });
  });

  test('should allow access to user dashboard when authenticated', async ({ page }) => {
    // First, perform a real login
    await page.goto('https://test-spanel-bun.freessr.bid/auth/login.html');

    // Fill in login credentials
    await page.fill('#email', 'test-spanel@ssmail.win');
    await page.fill('#passwd', 'testSpanelRsync@*');

    // Submit login
    await page.click('#login');

    // Wait for successful login and redirect
    await page.waitForURL('**/user/index.html', { timeout: 10000 });
    expect(page.url()).toContain('user/index.html');

    // Verify token was saved
    const token = await page.evaluate(() => localStorage.getItem('spanel_jwt_token'));
    expect(token).toBeTruthy();
  });
});
