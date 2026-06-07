import { chromium } from 'playwright'

const baseUrl = 'https://test-spanel-bun.freessr.bid/user/index.html'

console.log('🎯 Testing SPanel 1:1 Dashboard...')

const browser = await chromium.launch()
const page = await browser.newPage()

// Set JWT token
await page.goto('https://test-spanel-bun.freessr.bid')
await page.evaluate(() => {
    localStorage.setItem('spanel_jwt_token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoidGVzdC1zcGFuZWxAc3NtYWlsLndpbiIsInVzZXJfbmFtZSI6ImFkbWluIiwiaXNBZG1pbiI6dHJ1ZSwiaWF0IjoxNzY4NDUzMTA3fQ.YM3DT6nmSZbidODtfVEk4XAn_1Xjs9IU1Zzh5gV65pY')
})

// Collect console messages
const errors: string[] = []
page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text())
    if (msg.text().includes('[')) console.log(`  ${msg.text()}`)
})

await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 10000 })
await page.waitForTimeout(3000)

// Check for SPanel CSS
const hasSPanelCSS = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    return links.some(link => link.getAttribute('href')?.includes('/theme/material/css/'))
})

console.log(`\n✅ SPanel Material Design CSS: ${hasSPanelCSS ? 'LOADED' : 'MISSING'}`)

// Check for user info cards
const cards = await page.evaluate(() => {
    const userCards = document.querySelectorAll('.card.user-info')
    return {
        count: userCards.length,
        classes: Array.from(userCards).map(card => card.className)
    }
})

console.log(`\n📊 User Info Cards: ${cards.count}`)
console.log(`  CSS Classes: ${cards.classes.join(', ')}`)

// Check data hydration
const userClass = await page.evaluate(() => {
    const element = document.getElementById('user-class')
    return {
        text: element?.textContent,
        hasSkeleton: element?.classList.contains('skeleton')
    }
})

console.log(`\n👤 User Class:`)
console.log(`  Text: ${userClass.text}`)
console.log(`  Skeleton: ${userClass.hasSkeleton ? 'YES (Loading)' : 'NO (Loaded)'}`)

const userBalance = await page.evaluate(() => {
    const element = document.getElementById('user-balance')
    return {
        text: element?.textContent,
        hasSkeleton: element?.classList.contains('skeleton')
    }
})

console.log(`\n💰 User Balance:`)
console.log(`  Text: ${userBalance.text}`)
console.log(`  Skeleton: ${userBalance.hasSkeleton ? 'YES (Loading)' : 'NO (Loaded)'}`)

// Check sidebar menu groups
const menuGroups = await page.evaluate(() => {
    const groups = document.querySelectorAll('.menu-group-title')
    return {
        count: groups.length,
        titles: Array.from(groups).map(g => g.textContent?.trim())
    }
})

console.log(`\n📁 Sidebar Menu Groups: ${menuGroups.count}`)
menuGroups.titles.forEach((title, i) => console.log(`  ${i + 1}. ${title}`))

// Check for Vue
const hasVue = await page.evaluate(() => {
    return typeof window.Vue !== 'undefined' || typeof window.__VUE__ !== 'undefined'
})

console.log(`\n⚡ Vue 3: ${hasVue ? 'LOADED' : 'MISSING'}`)

// Take screenshot
await page.screenshot({
    path: 'test-results/dashboard-1to1.png',
    fullPage: true
})

console.log(`\n📸 Screenshot saved: test-results/dashboard-1to1.png`)

console.log(`\nConsole Errors: ${errors.length}`)
if (errors.length > 0) {
    console.log('Errors:')
    errors.slice(0, 5).forEach(e => console.log(`  - ${e}`))
}

await browser.close()

const success =
    hasSPanelCSS &&
    cards.count === 4 &&
    !userClass.hasSkeleton &&
    hasVue &&
    errors.length === 0

if (success) {
    console.log('\n✅ SUCCESS - SPanel 1:1 Dashboard Complete!')
    process.exit(0)
} else {
    console.log('\n⚠️  PARTIAL - Some checks did not pass')
    process.exit(1)
}
