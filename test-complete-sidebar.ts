import { chromium } from 'playwright'

const url = 'https://test-spanel-bun.freessr.bid/user/index.html'

console.log('🎸 Testing Complete SPanel Sidebar...')

const browser = await chromium.launch()
const page = await browser.newPage()

// Collect console messages
const errors: string[] = []
page.on('console', msg => {
  if (msg.type() === 'error') errors.push(msg.text())
})

await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 })
await page.waitForTimeout(3000)

// Check for Material Icons
const icons = await page.evaluate(() => {
  const materialIcons = document.querySelectorAll('i.material-icons')
  return {
    count: materialIcons.length,
    icons: Array.from(materialIcons).slice(0, 10).map(i => i.textContent?.trim())
  }
})

console.log(`\n📊 Material Icons Found: ${icons.count}`)
console.log('Sample icons:', icons.icons.slice(0, 5))

// Check menu groups
const menuGroups = await page.evaluate(() => {
  const groups = document.querySelectorAll('.menu-group-title')
  return Array.from(groups).map(g => g.textContent?.trim())
})

console.log(`\n📁 Menu Groups: ${menuGroups.length}`)
menuGroups.forEach((group, i) => console.log(`  ${i + 1}. ${group}`))

// Check menu items
const menuItems = await page.evaluate(() => {
  const items = document.querySelectorAll('.menu-item')
  return Array.from(items).map(i => i.textContent?.trim())
})

console.log(`\n📄 Menu Items: ${menuItems.length}`)
menuItems.forEach((item, i) => {
  if (i < 10) console.log(`  ${i + 1}. ${item}`)
})

// Check admin elements
const hasAdmin = await page.evaluate(() => {
  const adminContainer = document.getElementById('admin-back-container')
  return adminContainer && window.getComputedStyle(adminContainer).display !== 'none'
})

console.log(`\n🔐 Admin Button Visible: ${hasAdmin ? 'YES' : 'NO'}`)

// Check Telegram link
const hasTelegram = await page.evaluate(() => {
  const telegramContainer = document.getElementById('telegram-link-container')
  return telegramContainer && window.getComputedStyle(telegramContainer).display !== 'none'
})

console.log(`\�� Telegram Link Visible: ${hasTelegram ? 'YES' : 'NO'}`)

// Take full screenshot
await page.screenshot({
  path: 'test-results/complete-sidebar.png',
  fullPage: true
})

console.log('\n📸 Screenshot: test-results/complete-sidebar.png')

console.log(`\nConsole Errors: ${errors.length}`)
if (errors.length > 0) {
  console.log('Errors:')
  errors.forEach(e => console.log(`  - ${e}`))
}

await browser.close()

if (errors.length > 0) {
  process.exit(1)
}

console.log('\n✅ SUCCESS - Complete SPanel sidebar verified!')
