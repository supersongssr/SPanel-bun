import { chromium } from 'playwright'

const url = 'https://test-spanel-bun.freessr.bid/auth/login.html'

console.log('🎯 Testing 1:1 Auth Login Page Replication...')

const browser = await chromium.launch()
const page = await browser.newPage()

// Collect console messages
const errors: string[] = []
const warnings: string[] = []
const failedResources: string[] = []

page.on('console', msg => {
  if (msg.type() === 'error') {
    const text = msg.text()
    errors.push(text)
    // Extract 404 URLs
    if (text.includes('404')) {
      const match = text.match(/(https?:\/\/[^\s]+)/)
      if (match) failedResources.push(match[1])
    }
  }
  if (msg.type() === 'warning') warnings.push(msg.text()
)})

await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 })
await page.waitForTimeout(2000)

// Check for SPanel Material Design CSS
const hasBaseCSS = await page.evaluate(() => {
  const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
  return links.some(link => link.getAttribute('href')?.includes('/theme/material/css/base.min.css'))
})

console.log(`\n✅ SPanel Material Design CSS: ${hasBaseCSS ? 'LOADED' : 'MISSING'}`)

// Check for project CSS
const hasProjectCSS = await page.evaluate(() => {
  const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
  return links.some(link => link.getAttribute('href')?.includes('/theme/material/css/project.min.css'))
})

console.log(`✅ Project CSS: ${hasProjectCSS ? 'LOADED' : 'MISSING'}`)

// Check for auth.css
const hasAuthCSS = await page.evaluate(() => {
  const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
  return links.some(link => link.getAttribute('href')?.includes('/theme/material/css/auth.css'))
})

console.log(`✅ Auth CSS: ${hasAuthCSS ? 'LOADED' : 'MISSING'}`)

// Check for SPanel project.min.js
const hasProjectJS = await page.evaluate(() => {
  const scripts = Array.from(document.querySelectorAll('script'))
  return scripts.some(script => script.getAttribute('src')?.includes('/theme/material/js/project.min.js'))
})

console.log(`✅ SPanel project.min.js: ${hasProjectJS ? 'LOADED' : 'MISSING'}`)

// Check for Vue 3
const hasVue = await page.evaluate(() => {
  const scripts = Array.from(document.querySelectorAll('script'))
  return scripts.some(script => script.getAttribute('src')?.includes('vue.global.js'))
})

console.log(`✅ Vue 3: ${hasVue ? 'LOADED' : 'MISSING'}`)

// Check for Element Plus
const hasElementPlus = await page.evaluate(() => {
  const scripts = Array.from(document.querySelectorAll('script'))
  return scripts.some(script => script.getAttribute('src')?.includes('element-plus'))
})

console.log(`✅ Element Plus: ${hasElementPlus ? 'LOADED' : 'MISSING'}`)

// Check page structure
const pageStructure = await page.evaluate(() => {
  const authpage = document.querySelector('.authpage')
  const authMain = document.querySelector('.auth-main')
  const form = document.querySelector('form#login-form')
  const emailInput = document.querySelector('input#email')
  const passwordInput = document.querySelector('input#passwd')
  const codeInput = document.querySelector('input#code')
  const submitBtn = document.querySelector('button#login')
  const rememberMe = document.querySelector('input#remember_me')

  return {
    authpage: !!authpage,
    authMain: !!authMain,
    form: !!form,
    emailInput: !!emailInput,
    passwordInput: !!passwordInput,
    codeInput: !!codeInput,
    submitBtn: !!submitBtn,
    rememberMe: !!rememberMe
  }
})

console.log('\n📋 Page Structure:')
console.log(`  .authpage: ${pageStructure.authpage ? '✅' : '❌'}`)
console.log(`  .auth-main: ${pageStructure.authMain ? '✅' : '❌'}`)
console.log(`  #login-form: ${pageStructure.form ? '✅' : '❌'}`)
console.log(`  #email: ${pageStructure.emailInput ? '✅' : '❌'}`)
console.log(`  #passwd: ${pageStructure.passwordInput ? '✅' : '❌'}`)
console.log(`  #code: ${pageStructure.codeInput ? '✅' : '❌'}`)
console.log(`  #login button: ${pageStructure.submitBtn ? '✅' : '❌'}`)
console.log(`  #remember_me: ${pageStructure.rememberMe ? '✅' : '❌'}`)

// Check for navigation links
const navigation = await page.evaluate(() => {
  const homeLink = document.querySelector('.boardtop-left')
  const registerLink = document.querySelector('.boardtop-right')
  const forgotLink = document.querySelector('a[href="/password/reset"]')

  return {
    homeLink: !!homeLink,
    registerLink: !!registerLink,
    forgotLink: !!forgotLink
  }
})

console.log('\n🔗 Navigation:')
console.log(`  Home link: ${navigation.homeLink ? '✅' : '❌'}`)
console.log(`  Register link: ${navigation.registerLink ? '✅' : '❌'}`)
console.log(`  Forgot password: ${navigation.forgotLink ? '✅' : '❌'}`)

// Check for logo
const hasLogo = await page.evaluate(() => {
  const logo = document.querySelector('.auth-logo img')
  if (!logo) return false
  const src = logo.getAttribute('src')
  return src?.includes('/images/authlogo.jpg')
})

console.log(`\n🖼️  Logo: ${hasLogo ? '✅' : '❌'}`)

// Check for Telegram section
const telegramSection = await page.evaluate(() => {
  const tgauth = document.querySelector('.tgauth')
  const tgButton = document.querySelector('#calltgauth')
  return {
    section: !!tgauth,
    button: !!tgButton
  }
})

console.log(`\n📱 Telegram: ${telegramSection.section ? '✅ (disabled)' : '❌'}`)

// Take screenshot
await page.screenshot({
  path: 'test-results/login-1to1-replication.png',
  fullPage: true
})

console.log('\n📸 Screenshot saved: test-results/login-1to1-replication.png')

console.log(`\nConsole Errors: ${errors.length}`)
if (errors.length > 0) {
  console.log('Errors:')
  errors.slice(0, 5).forEach(e => console.log(`  - ${e}`))
}

if (failedResources.length > 0) {
  console.log('\nFailed Resources (404):')
  failedResources.forEach(r => console.log(`  - ${r}`))
}

console.log(`Console Warnings: ${warnings.length}`)
if (warnings.length > 0) {
  console.log('Warnings:')
  warnings.slice(0, 5).forEach(w => console.log(`  - ${w}`))
}

await browser.close()

const success =
  hasBaseCSS &&
  hasProjectCSS &&
  hasAuthCSS &&
  hasProjectJS &&
  hasVue &&
  hasElementPlus &&
  pageStructure.authpage &&
  pageStructure.form &&
  pageStructure.emailInput &&
  pageStructure.passwordInput &&
  errors.length === 0

if (success) {
  console.log('\n✅ SUCCESS - 1:1 Auth Login Page Replication Complete!')
  process.exit(0)
} else {
  console.log('\n❌ FAILED - Some checks did not pass')
  process.exit(1)
}
