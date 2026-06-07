import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  // Test Login Page
  console.log('Testing Login Page...');
  const loginPage = await context.newPage();
  await loginPage.goto('https://test-spanel-bun.freessr.bid/auth/login.html', {
    waitUntil: 'networkidle',
    timeout: 10000
  });
  await loginPage.waitForTimeout(2000);
  await loginPage.screenshot({ path: 'login-page-final.png', fullPage: true });
  console.log('✅ Login page screenshot saved to login-page-final.png');

  // Test Register Page
  console.log('Testing Register Page...');
  const registerPage = await context.newPage();
  await registerPage.goto('https://test-spanel-bun.freessr.bid/auth/register.html', {
    waitUntil: 'networkidle',
    timeout: 10000
  });
  await registerPage.waitForTimeout(2000);
  await registerPage.screenshot({ path: 'register-page-final.png', fullPage: true });
  console.log('✅ Register page screenshot saved to register-page-final.png');

  await browser.close();
  console.log('\n✅ All screenshots completed!');
})();
