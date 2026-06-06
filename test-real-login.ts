import { chromium } from 'playwright'

const baseUrl = 'https://test-spanel-bun.freessr.bid'

console.log('🚀 Real Login Flow Test...')

const browser = await chromium.launch()
const page = await browser.newPage()

// Collect console messages
const logs: string[] = []
page.on('console', msg => {
    const text = msg.text()
    if (text.includes('[Login') || text.includes('[Register')) {
        logs.push(text)
        console.log(`  Console: ${text}`)
    }
})

// Step 1: Visit login page
console.log('\n📍 Step 1: Visiting login page...')
await page.goto(`${baseUrl}/auth/login.html`, { waitUntil: 'networkidle', timeout: 10000 })
await page.waitForTimeout(1000)

// Check if login page loaded
const title = await page.title()
console.log(`  Page title: ${title}`)

// Step 2: Fill in login form
console.log('\n📍 Step 2: Filling login form...')

const email = 'test-spanel@ssmail.win'
const password = 'testSpanelRsync@*'

// Type email
await page.fill('#email', email)
console.log(`  ✓ Email filled: ${email}`)

// Type password
await page.fill('#passwd', password)
console.log(`  ✓ Password filled: ${password}`)

// Verify Vue data binding
const emailValue = await page.evaluate(() => {
    const app = document.querySelector('#login-form').__vueParentComponent?.ctx
    return app?.email || ''
})
console.log(`  ✓ Vue bound email: ${emailValue}`)

// Step 3: Click login button
console.log('\n📍 Step 3: Clicking login button...')

// Wait for navigation or response
const [response] = await Promise.all([
    page.waitForResponse(resp => resp.url().includes('/api/auth/login'), { timeout: 10000 }),
    page.click('#login')
])

console.log(`  ✓ Login button clicked`)

// Check API response
const responseText = await response.text()
console.log(`  API Response status: ${response.status()}`)

try {
    const responseData = JSON.parse(responseText)
    console.log(`  API Response data:`, JSON.stringify(responseData, null, 2))

    // Check for successful login (has token or success field)
    const loginSuccess = responseData.token || responseData.success || responseData.data?.token

    if (loginSuccess) {
        console.log('\n✅ LOGIN SUCCESSFUL!')

        // Check if token was saved
        const token = await page.evaluate(() => {
            return localStorage.getItem('spanel_jwt_token')
        })

        if (token) {
            console.log(`  ✓ JWT Token saved: ${token.substring(0, 20)}...`)
        } else {
            console.log(`  ⚠️ No JWT token found in localStorage`)
        }

        // Wait for redirect
        await page.waitForURL('**/user/index.html', { timeout: 5000 })
        console.log(`  ✓ Redirected to: ${page.url()}`)

        // Take screenshot
        await page.screenshot({
            path: 'test-results/login-success.png',
            fullPage: true
        })
        console.log(`  ✓ Screenshot saved: test-results/login-success.png`)

    } else {
        console.log('\n❌ LOGIN FAILED')
        console.log(`  Error: ${responseData.message}`)

        // Take screenshot of error state
        await page.screenshot({
            path: 'test-results/login-error.png',
            fullPage: true
        })
        console.log(`  ✓ Error screenshot saved: test-results/login-error.png`)
    }
} catch (error) {
    console.log('\n❌ API ERROR')
    console.log(`  Response: ${responseText}`)
    console.log(`  Error:`, error)
}

console.log('\n📋 Console Logs:')
logs.forEach(log => console.log(`  ${log}`))

await browser.close()

console.log('\n✅ Test complete!')
