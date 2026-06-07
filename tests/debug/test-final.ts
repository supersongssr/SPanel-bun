import { chromium } from 'playwright'

const url = 'https://test-spanel-bun.freessr.bid/user/index.html'
const browser = await chromium.launch()
const page = await browser.newPage()

const errors: string[] = []
page.on('console', msg => {
  if (msg.type() === 'error') errors.push(msg.text())
})

await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 })
await page.waitForTimeout(2000)

const bodyText = await page.evaluate(() => document.body.innerText)
await page.screenshot({ path: 'test-results/final-test.png', fullPage: true })

console.log('Text length:', bodyText.length)
console.log('Errors:', errors.length)
errors.forEach(e => console.log('  -', e))

await browser.close()
