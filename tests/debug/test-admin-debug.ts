import { chromium } from 'playwright'

const urls = [
  'https://test-spanel-bun.freessr.bid/admin/index.html',
  'https://test-spanel-bun.freessr.bid/admin/users.html',
  'https://test-spanel-bun.freessr.bid/user/index.html'
]

const browser = await chromium.launch()
const page = await browser.newPage()

for (const url of urls) {
  console.log(`\n========================================`)
  console.log(`Testing: ${url}`)
  console.log(`========================================`)

  const errors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text())
      console.log('❌ Error:', msg.text())
    }
  })

  const networkErrors: string[] = []
  page.on('response', res => {
    if (res.status() >= 400) {
      networkErrors.push(`${res.url()} - ${res.status()}`)
    }
  })

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 })
    await page.waitForTimeout(2000)

    const bodyText = await page.evaluate(() => document.body.innerText)
    const scriptTags = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[src]'))
      return scripts.map(s => s.getAttribute('src'))
    })

    console.log(`\nStatus: ${page.url()}`)
    console.log(`Text length: ${bodyText.length}`)
    console.log(`Console errors: ${errors.length}`)
    console.log(`Network errors: ${networkErrors.length}`)
    console.log(`\nScript tags:`)
    scriptTags.forEach(src => console.log(`  - ${src}`))

    if (errors.length > 0) {
      console.log(`\n❌ Console Errors:`)
      errors.forEach(e => console.log(`  - ${e}`))
    }

    if (networkErrors.length > 0) {
      console.log(`\n❌ Network Errors:`)
      networkErrors.forEach(e => console.log(`  - ${e}`))
    }

    const filename = url.split('/').pop() || 'index'
    await page.screenshot({
      path: `test-results/admin-debug-${filename}.png`,
      fullPage: true
    })
    console.log(`\n📸 Screenshot: test-results/admin-debug-${filename}.png`)

  } catch (error) {
    console.log(`❌ Navigation error:`, error)
  }
}

await browser.close()
