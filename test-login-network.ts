import { chromium } from 'playwright'

const url = 'https://test-spanel-bun.freessr.bid/auth/login.html'

console.log('🔍 Checking for 404 resources...')

const browser = await chromium.launch()
const page = await browser.newPage()

const failedUrls: string[] = []

page.on('response', response => {
  if (response.status() === 404) {
    failedUrls.push(response.url())
  }
})

await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 })

if (failedUrls.length > 0) {
  console.log('\n❌ Failed Resources (404):')
  failedUrls.forEach(u => console.log(`  - ${u}`))
} else {
  console.log('\n✅ No 404 resources found!')
}

await browser.close()

if (failedUrls.length > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
