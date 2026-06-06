import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const consoleLogs: string[] = [];
  const pageErrors: string[] = [];

  page.on('console', msg => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    console.log('Console:', msg.text());
  });

  page.on('pageerror', error => {
    pageErrors.push(error.message);
    console.error('Page Error:', error.message);
  });

  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`HTTP ${response.status()}:`, response.url());
    }
  });

  try {
    console.log('Testing admin dashboard after login...');

    // First login
    await page.goto('https://test-spanel-bun.freessr.bid/auth/login.html');
    await page.waitForTimeout(500);
    await page.fill('input[type="email"]', 'test-spanel@ssmail.win');
    await page.fill('input[type="password"]', 'testSpanelRsync@*');
    await page.click('button:has-text("登录")');
    await page.waitForTimeout(5000);

    const url = page.url();
    console.log('Redirected to:', url);

    // Check if content loaded
    const appContent = await page.locator('#app').innerHTML();
    console.log('App content length:', appContent.length);

    if (appContent.length > 0) {
      console.log('✅ Content loaded!');
      console.log('Preview:', appContent.substring(0, 500));
    } else {
      console.log('❌ No content loaded');
    }

    await page.screenshot({ path: 'admin-debug.png', fullPage: true });
    console.log('📸 Screenshot saved');

    console.log('\n=== Errors Summary ===');
    console.log(`Console logs: ${consoleLogs.length}`);
    console.log(`Page errors: ${pageErrors.length}`);

    if (pageErrors.length > 0) {
      console.log('\nPage Errors:');
      pageErrors.forEach((err, i) => console.log(`${i + 1}. ${err}`));
    }

  } catch (error: any) {
    console.error('Test failed:', error.message);
  } finally {
    await browser.close();
  }
})();
