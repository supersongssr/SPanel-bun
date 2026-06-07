import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  console.log('\n=== Task 1: Test User Dashboard (Without Auth) ===\n');
  const userPage = await context.newPage();
  await userPage.goto('https://test-spanel-bun.freessr.bid/user/', {
    waitUntil: 'networkidle',
    timeout: 15000
  });
  await userPage.waitForTimeout(3000);

  const userUrl = userPage.url();
  console.log('Current URL after /user/ redirect:', userUrl);

  if (userUrl.includes('/auth/login.html')) {
    console.log('✅ Router-guard redirect working correctly!');
  } else {
    console.log('❌ Router-guard redirect NOT working');
  }

  await userPage.screenshot({ path: 'user-redirect-test.png' });
  console.log('📸 Screenshot saved to user-redirect-test.png');

  console.log('\n=== Task 2: Test Login Error Feedback ===\n');
  const loginPage = await context.newPage();
  await loginPage.goto('https://test-spanel-bun.freessr.bid/auth/login.html', {
    waitUntil: 'networkidle',
    timeout: 10000
  });
  await loginPage.waitForTimeout(1000);

  // Fill in wrong credentials
  await loginPage.fill('input[type="email"]', 'wrong@example.com');
  await loginPage.fill('input[type="password"]', 'wrongpassword');

  // Click login button (using text content)
  await loginPage.click('button:has-text("登录")');
  await loginPage.waitForTimeout(3000);

  // Check for error message
  const errorVisible = await loginPage.locator('.el-message--error').isVisible().catch(() => false);
  if (errorVisible) {
    const errorMessage = await loginPage.locator('.el-message--error').textContent();
    console.log('✅ Error message displayed:', errorMessage);
  } else {
    console.log('❌ No error message found');
  }

  await loginPage.screenshot({ path: 'login-error-feedback.png' });
  console.log('📸 Screenshot saved to login-error-feedback.png');

  console.log('\n=== Task 3: Test Login with Valid Credentials ===\n');
  // Clear and fill correct credentials
  await loginPage.fill('input[type="email"]', 'test-spanel@ssmail.win');
  await loginPage.fill('input[type="password"]', 'testSpanelRsync@*');

  // Click login button
  await loginPage.click('button:has-text("登录")');

  // Wait for redirect
  await loginPage.waitForTimeout(5000);

  const finalUrl = loginPage.url();
  console.log('Final URL after login:', finalUrl);

  if (finalUrl.includes('/user/')) {
    console.log('✅ Login successful, redirected to user dashboard!');

    // Wait for dashboard to load
    await loginPage.waitForTimeout(2000);

    // Check if dashboard content loaded
    const appText = await loginPage.locator('#app').textContent();
    if (appText && (appText.includes('用户仪表盘') || appText.includes('用户信息'))) {
      console.log('✅ Dashboard content loaded successfully!');
    } else {
      console.log('⚠️ Dashboard content may still be loading...');
    }

    await loginPage.screenshot({ path: 'user-dashboard-success.png', fullPage: true });
    console.log('📸 Screenshot saved to user-dashboard-success.png');
  } else {
    console.log('❌ Login may have failed or redirected elsewhere');
    await loginPage.screenshot({ path: 'login-result.png' });
  }

  await browser.close();
  console.log('\n✅ All tests completed!');
})();
