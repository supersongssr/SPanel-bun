import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Listen for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Console Error:', msg.text());
    }
  });

  page.on('pageerror', error => {
    console.log('Page Error:', error.message);
  });

  page.on('response', response => {
    if (response.status() === 404) {
      console.log('404 Response:', response.url());
    }
  });

  try {
    console.log('Navigating to https://test-spanel-bun.freessr.bid/auth/');
    await page.goto('https://test-spanel-bun.freessr.bid/auth/', {
      waitUntil: 'networkidle',
      timeout: 10000
    });

    // Wait a bit for any dynamic content
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: 'auth-page-screenshot.png', fullPage: true });
    console.log('Screenshot saved to auth-page-screenshot.png');

    // Get page title and content
    const title = await page.title();
    console.log('Page Title:', title);

    const bodyText = await page.evaluate(() => {
      return document.body.innerText;
    });
    console.log('Page content:', bodyText.substring(0, 500));

    // Check if Vue app mounted
    const appElement = await page.$('#app');
    if (appElement) {
      const appContent = await appElement.innerHTML();
      console.log('App element found. Content length:', appContent.length);
      console.log('App innerHTML preview:', appContent.substring(0, 500));
    } else {
      console.log('App element NOT found!');
    }

  } catch (error) {
    console.error('Error during navigation:', error);
  } finally {
    await browser.close();
  }
})();
