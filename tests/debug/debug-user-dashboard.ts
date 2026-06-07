import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Collect all console messages and errors
  const consoleLogs: string[] = [];
  const pageErrors: string[] = [];

  page.on('console', msg => {
    const logMsg = `[${msg.type()}] ${msg.text()}`;
    consoleLogs.push(logMsg);
    console.log('Console:', logMsg);
  });

  page.on('pageerror', error => {
    const errorMsg = error.message;
    pageErrors.push(errorMsg);
    console.error('Page Error:', errorMsg);
    console.error('Stack:', error.stack);
  });

  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`HTTP ${response.status()}:`, response.url());
    }
  });

  page.on('requestfailed', request => {
    console.log('Request Failed:', request.url(), request.failure());
  });

  try {
    console.log('\n=== Testing /user/ Page ===');
    await page.goto('https://test-spanel-bun.freessr.bid/user/', {
      waitUntil: 'networkidle',
      timeout: 15000
    });

    // Wait for dynamic content
    await page.waitForTimeout(3000);

    // Check page state
    const title = await page.title();
    console.log('\nPage Title:', title);

    const url = page.url();
    console.log('Current URL:', url);

    // Check if Vue app mounted
    const appElement = await page.$('#app');
    if (appElement) {
      const appHTML = await appElement.innerHTML();
      console.log('\n✅ App element found');
      console.log('App content length:', appHTML.length);
      console.log('App preview:', appHTML.substring(0, 500));
    } else {
      console.log('\n❌ App element NOT found!');
    }

    // Take screenshot
    await page.screenshot({ path: 'user-dashboard-debug.png', fullPage: true });
    console.log('\n📸 Screenshot saved to user-dashboard-debug.png');

    // Summary
    console.log('\n=== Debug Summary ===');
    console.log(`Console Logs: ${consoleLogs.length}`);
    console.log(`Page Errors: ${pageErrors.length}`);

    if (pageErrors.length > 0) {
      console.log('\n❌ Page Errors Found:');
      pageErrors.forEach((err, i) => {
        console.log(`${i + 1}. ${err}`);
      });
    }

    if (consoleLogs.length > 0) {
      console.log('\n📝 Console Logs (last 20):');
      consoleLogs.slice(-20).forEach(log => console.log(log));
    }

  } catch (error: any) {
    console.error('❌ Navigation failed:', error.message);
  } finally {
    await browser.close();
  }
})();
