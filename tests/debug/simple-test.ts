import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log('Testing login and dashboard access...');

  // Navigate to login
  await page.goto('https://test-spanel-bun.freessr.bid/auth/login.html');
  await page.waitForTimeout(1000);

  // Login
  await page.fill('input[type="email"]', 'test-spanel@ssmail.win');
  await page.fill('input[type="password"]', 'testSpanelRsync@*');
  await page.click('button:has-text("登录")');

  // Wait for redirect
  await page.waitForTimeout(5000);

  const url = page.url();
  console.log('Redirected to:', url);

  // Take screenshot
  const filename = url.includes('admin') ? 'admin-dashboard.png' : 'user-dashboard.png';
  await page.screenshot({ path: filename, fullPage: true });
  console.log('✅ Screenshot saved:', filename);

  // Check content
  const content = await page.locator('#app').textContent();
  if (content?.includes('仪表盘') || content?.includes('用户')) {
    console.log('✅ Dashboard loaded successfully!');
  }

  await browser.close();
})();
