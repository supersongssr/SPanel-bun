#!/usr/bin/env bun
/**
 * Quick test of production URL
 */
import { chromium } from 'playwright'

const url = 'https://test-spanel-bun.freessr.bid/user/index.html'

const browser = await chromium.launch()
const page = await browser.newPage()

console.log('Testing:', url)

// Collect console errors
const errors: string[] = []
page.on('console', msg => {
  if (msg.type() === 'error') {
    errors.push(msg.text())
    console.log('❌ Error:', msg.text())
  }
})

await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 })
await page.waitForTimeout(2000)

const bodyText = await page.evaluate(() => document.body.innerText)
console.log('Page text length:', bodyText.length)
console.log('Has errors:', errors.length)

await page.screenshot({ path: 'test-results/quick-test.png', fullPage: true })
console.log('Screenshot: test-results/quick-test.png')

await browser.close()

if (errors.length > 0 || bodyText.length === 0) {
  console.log('❌ FAILED')
  process.exit(1)
} else {
  console.log('✅ SUCCESS')
}
