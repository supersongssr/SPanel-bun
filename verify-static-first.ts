#!/usr/bin/env bun
/**
 * Static-First Architecture Visual Verification
 *
 * This script takes screenshots of the pages to verify
 * the static-first architecture is working correctly.
 */

import { chromium } from 'playwright'

const BASE_URL = process.env.TEST_BASE_URL || 'https://test-spanel-bun.freessr.bid'

async function verifyStaticFirst() {
  console.log('🚀 Starting Static-First Architecture Verification\n')
  console.log(`Base URL: ${BASE_URL}\n`)

  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  })
  const page = await context.newPage()

  try {
    // Test 1: Login Page
    console.log('📸 Test 1: Login Page')
    console.log('   Loading...')
    const loginStart = Date.now()
    await page.goto(`${BASE_URL}/auth/login.html`, { waitUntil: 'domcontentloaded' })
    const loginTime = Date.now() - loginStart
    console.log(`   ✓ Loaded in ${loginTime}ms`)

    await page.waitForTimeout(500) // Wait for any JS to execute
    await page.screenshot({ path: 'test-results/login-static-first.png' })
    console.log('   ✓ Screenshot saved: test-results/login-static-first.png\n')

    // Test 2: Register Page
    console.log('📸 Test 2: Register Page')
    console.log('   Loading...')
    const registerStart = Date.now()
    await page.goto(`${BASE_URL}/auth/register.html`, { waitUntil: 'domcontentloaded' })
    const registerTime = Date.now() - registerStart
    console.log(`   ✓ Loaded in ${registerTime}ms`)

    await page.waitForTimeout(500)
    await page.screenshot({ path: 'test-results/register-static-first.png' })
    console.log('   ✓ Screenshot saved: test-results/register-static-first.png\n')

    // Test 3: Dashboard (before redirect)
    console.log('📸 Test 3: Dashboard (before auth redirect)')
    console.log('   Loading...')

    // Block JavaScript to see static HTML only
    await page.route('**/*.ts', route => route.abort())
    await page.route('**/*.js', route => route.abort())

    const dashboardStart = Date.now()
    await page.goto(`${BASE_URL}/user/dashboard.html`, { waitUntil: 'domcontentloaded' })
    const dashboardTime = Date.now() - dashboardStart
    console.log(`   ✓ Loaded in ${dashboardTime}ms`)

    await page.waitForTimeout(100)
    await page.screenshot({ path: 'test-results/dashboard-static-only.png' })
    console.log('   ✓ Screenshot saved: test-results/dashboard-static-only.png (no JS)\n')

    // Test 4: Dashboard with JavaScript
    console.log('📸 Test 4: Dashboard (with JavaScript)')
    console.log('   Creating new context...')

    const page2 = await context.newPage()
    const dashboardJsStart = Date.now()
    await page2.goto(`${BASE_URL}/user/dashboard.html`, { waitUntil: 'domcontentloaded' })
    const dashboardJsTime = Date.now() - dashboardJsStart
    console.log(`   ✓ Loaded in ${dashboardJsTime}ms`)

    // Wait a bit for the redirect
    await page2.waitForTimeout(2000)
    await page2.screenshot({ path: 'test-results/dashboard-with-js.png' })
    console.log('   ✓ Screenshot saved: test-results/dashboard-with-js.png\n')

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📊 Performance Summary')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`Login Page:     ${loginTime}ms`)
    console.log(`Register Page:  ${registerTime}ms`)
    console.log(`Dashboard (static): ${dashboardTime}ms`)
    console.log(`Dashboard (JS):     ${dashboardJsTime}ms`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\n✅ All screenshots captured successfully!')
    console.log('\n📁 Screenshots saved to test-results/')
    console.log('\n💡 To verify:')
    console.log('   1. Check login-static-first.png - Should show form immediately')
    console.log('   2. Check register-static-first.png - Should show form immediately')
    console.log('   3. Check dashboard-static-only.png - Should show skeleton (no redirect)')
    console.log('   4. Check dashboard-with-js.png - Should redirect to login')

  } catch (error) {
    console.error('❌ Error during verification:', error)
    process.exit(1)
  } finally {
    await browser.close()
  }
}

// Run verification
verifyStaticFirst()
