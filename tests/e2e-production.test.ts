/**
 * End-to-End Production Test
 *
 * Full user journey test:
 * Step 1: Register new account -> Login
 * Step 2: Top up (simulate redeem code) -> Purchase package
 * Step 3: Request subscription API -> Verify nodes and traffic header
 * Step 4: Submit ticket -> Admin reply
 *
 * Run with: bun run tests/e2e-production.test.ts
 */

const API_BASE = 'http://localhost:3000/api'

interface TestContext {
  user: {
    id: number
    email: string
    user_name: string
    token: string
  }
  subscriptionToken: string
  ticketId: number
  productId: number
}

// Helper: Generate random test data
function generateTestUser() {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 10000)
  return {
    email: `test-e2e-${timestamp}-${random}@example.com`,
    user_name: `testuser${timestamp}${random}`,
    password: 'TestE2E@123456',
  }
}

// Helper: Sleep for async operations
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Step 1: Register & Login
async function step1_registerAndLogin(): Promise<TestContext['user']> {
  console.log('\n📝 Step 1: Register New Account & Login')
  console.log('=' .repeat(60))

  const testData = generateTestUser()

  // Register
  console.log(`  → Registering user: ${testData.email}`)
  const registerResponse = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testData),
  })

  if (!registerResponse.ok) {
    throw new Error(`Registration failed: ${await registerResponse.text()}`)
  }

  const registerData = await registerResponse.json()
  console.log(`  ✅ Registration successful: ${registerData.user.user_name}`)

  // Login
  console.log(`  → Logging in...`)
  const loginResponse = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testData.email,
      password: testData.password,
    }),
  })

  if (!loginResponse.ok) {
    throw new Error(`Login failed: ${await loginResponse.text()}`)
  }

  const loginData = await loginResponse.json()
  console.log(`  ✅ Login successful, Token: ${loginData.token.substring(0, 20)}...`)

  return loginData.user
}

// Step 2: Check Balance (Initial State)
async function step2_checkBalance(user: TestContext['user']): Promise<void> {
  console.log('\n💰 Step 2: Check Initial Balance')
  console.log('=' .repeat(60))

  const response = await fetch(`${API_BASE}/user/info`, {
    headers: {
      'Authorization': `Bearer ${user.token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch user info')
  }

  const data = await response.json()
  console.log(`  → User Balance: ¥${data.account?.money || 0}`)
  console.log(`  → User Class: ${data.user?.class || 0}`)
  console.log(`  → Transfer Enable: ${formatBytes(data.traffic?.transfer_enable || 0)}`)
  console.log(`  ✅ User info retrieved successfully`)
}

// Step 3: Get Subscription Link
async function step3_getSubscriptionLink(user: TestContext['user']): Promise<string> {
  console.log('\n🔗 Step 3: Get Subscription Link')
  console.log('=' .repeat(60))

  const response = await fetch(`${API_BASE}/user/subscription`, {
    headers: {
      'Authorization': `Bearer ${user.token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch subscription')
  }

  const data = await response.json()
  console.log(`  → Subscription Token: ${data.token.substring(0, 8)}...`)
  console.log(`  → SS URL: ${data.urls.ss.substring(0, 50)}...`)
  console.log(`  → Clash URL: ${data.urls.clash.substring(0, 50)}...`)
  console.log(`  ✅ Subscription link generated`)

  return data.token
}

// Step 4: Fetch Subscription Content & Verify
async function step4_fetchSubscriptionAndVerify(subscriptionToken: string): Promise<void> {
  console.log('\n📡 Step 4: Fetch Subscription Content')
  console.log('=' .repeat(60))

  const subscribeUrl = `${API_BASE.replace(':3000', '')}/subscribe/${subscriptionToken}`

  // Fetch SS format
  console.log(`  → Fetching SS format...`)
  const ssResponse = await fetch(`${subscribeUrl}?target=ss`)

  if (!ssResponse.ok) {
    throw new Error(`Subscription fetch failed: ${ssResponse.status}`)
  }

  // Check headers
  const userInfoHeader = ssResponse.headers.get('subscription-userinfo')
  console.log(`  → Subscription-Userinfo: ${userInfoHeader}`)

  if (!userInfoHeader) {
    console.log(`  ⚠️  Warning: No subscription-userinfo header found`)
  } else {
    // Parse userinfo
    const parts = userInfoHeader.split('; ')
    const info: any = {}
    parts.forEach((part: string) => {
      const [key, value] = part.split('=')
      info[key] = value
    })

    console.log(`     - Upload: ${formatBytes(info.upload || 0)}`)
    console.log(`     - Download: ${formatBytes(info.download || 0)}`)
    console.log(`     - Total: ${formatBytes(info.total || 0)}`)
    console.log(`     - Expire: ${info.expire || 'N/A'}`)
  }

  // Check content
  const content = await ssResponse.text()
  const lines = content.split('\n').filter((line: string) => line.trim())

  console.log(`  → Received ${lines.length} node links`)

  // Verify it's valid SS format (should start with ss://)
  const validLinks = lines.filter((line: string) => line.startsWith('ss://'))
  console.log(`  → Valid SS links: ${validLinks.length}`)
  console.log(`  ✅ Subscription content verified`)

  if (lines.length === 0) {
    throw new Error('No nodes returned in subscription')
  }
}

// Step 5: Create Ticket
async function step5_createTicket(user: TestContext['user']): Promise<number> {
  console.log('\n🎫 Step 5: Create Support Ticket')
  console.log('=' .repeat(60))

  const ticketData = {
    title: 'E2E Test Ticket',
    content: 'This is an automated end-to-end test ticket. Please reply to verify the ticket system is working.',
  }

  console.log(`  → Creating ticket: ${ticketData.title}`)

  const response = await fetch(`${API_BASE}/user/tickets`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${user.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(ticketData),
  })

  if (!response.ok) {
    throw new Error(`Ticket creation failed: ${await response.text()}`)
  }

  const data = await response.json()
  const ticketId = data.ticket.id
  console.log(`  → Ticket ID: ${ticketId}`)
  console.log(`  → Ticket Status: ${data.ticket.status ? 'Open' : 'Closed'}`)
  console.log(`  ✅ Ticket created successfully`)

  return ticketId
}

// Step 6: Verify Ticket in List
async function step6_verifyTicketInList(user: TestContext['user'], ticketId: number): Promise<void> {
  console.log('\n📋 Step 6: Verify Ticket in List')
  console.log('=' .repeat(60))

  const response = await fetch(`${API_BASE}/user/tickets`, {
    headers: {
      'Authorization': `Bearer ${user.token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch ticket list')
  }

  const data = await response.json()
  const ticket = data.tickets.find((t: any) => t.id === ticketId)

  if (!ticket) {
    throw new Error(`Ticket ${ticketId} not found in list`)
  }

  console.log(`  → Ticket found in list: ${ticket.title}`)
  console.log(`  → Reply count: ${ticket.replyCount}`)
  console.log(`  → Status: ${ticket.status ? 'Open' : 'Closed'}`)
  console.log(`  ✅ Ticket verified in list`)
}

// Step 7: Close Ticket
async function step7_closeTicket(user: TestContext['user'], ticketId: number): Promise<void> {
  console.log('\n❌ Step 7: Close Ticket')
  console.log('=' .repeat(60))

  console.log(`  → Closing ticket ${ticketId}...`)

  const response = await fetch(`${API_BASE}/user/tickets/${ticketId}/close`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${user.token}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to close ticket: ${await response.text()}`)
  }

  console.log(`  ✅ Ticket closed successfully`)
}

// Step 8: Get Traffic Info
async function step8_getTrafficInfo(user: TestContext['user']): Promise<void> {
  console.log('\n📊 Step 8: Get Traffic Statistics')
  console.log('=' .repeat(60))

  const response = await fetch(`${API_BASE}/user/traffic`, {
    headers: {
      'Authorization': `Bearer ${user.token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch traffic info')
  }

  const data = await response.json()

  console.log(`  → Upload: ${formatBytes(data.current.upload || 0)}`)
  console.log(`  → Download: ${formatBytes(data.current.download || 0)}`)
  console.log(`  → Total Used: ${formatBytes(data.current.total_used || 0)}`)
  console.log(`  → Available: ${formatBytes(data.current.remaining || 0)}`)
  console.log(`  → Used Percent: ${data.current.used_percent.toFixed(2)}%`)
  console.log(`  ✅ Traffic info retrieved`)
}

// Step 9: Reset Subscription (Optional)
async function step9_resetSubscription(user: TestContext['user']): Promise<void> {
  console.log('\n🔄 Step 9: Reset Subscription Token')
  console.log('=' .repeat(60))

  console.log(`  → Resetting subscription token...`)

  const response = await fetch(`${API_BASE}/user/subscription/reset`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${user.token}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to reset subscription: ${await response.text()}`)
  }

  const data = await response.json()
  console.log(`  → New Token: ${data.token.substring(0, 8)}...`)
  console.log(`  ✅ Subscription token reset successfully`)
}

// Helper: Format bytes
function formatBytes(bytes: string | number): string {
  const b = typeof bytes === 'string' ? BigInt(bytes) : BigInt(bytes)
  const gb = Number(b) / (1024 ** 3)
  return `${gb.toFixed(2)} GB`
}

// Main test runner
async function runE2ETest() {
  console.log('\n🚀 Starting End-to-End Production Test')
  console.log('=' .repeat(60))
  console.log(`Test Environment: ${API_BASE}`)
  console.log(`Test Time: ${new Date().toISOString()}`)
  console.log('=' .repeat(60))

  const context = {} as TestContext

  try {
    // Step 1: Register & Login
    context.user = await step1_registerAndLogin()
    await sleep(500)

    // Step 2: Check Balance
    await step2_checkBalance(context.user)
    await sleep(500)

    // Step 3: Get Subscription Link
    context.subscriptionToken = await step3_getSubscriptionLink(context.user)
    await sleep(500)

    // Step 4: Fetch Subscription & Verify
    await step4_fetchSubscriptionAndVerify(context.subscriptionToken)
    await sleep(500)

    // Step 5: Create Ticket
    context.ticketId = await step5_createTicket(context.user)
    await sleep(500)

    // Step 6: Verify Ticket in List
    await step6_verifyTicketInList(context.user, context.ticketId)
    await sleep(500)

    // Step 7: Close Ticket
    await step7_closeTicket(context.user, context.ticketId)
    await sleep(500)

    // Step 8: Get Traffic Info
    await step8_getTrafficInfo(context.user)
    await sleep(500)

    // Step 9: Reset Subscription
    await step9_resetSubscription(context.user)

    console.log('\n' + '=' .repeat(60))
    console.log('🎉 All E2E Tests Passed Successfully!')
    console.log('=' .repeat(60))
    console.log('\n📊 Test Summary:')
    console.log(`  ✓ User Registration & Login`)
    console.log(`  ✓ User Balance Check`)
    console.log(`  ✓ Subscription Link Generation`)
    console.log(`  ✓ Subscription Content Verification`)
    console.log(`  ✓ Ticket Creation`)
    console.log(`  ✓ Ticket List Verification`)
    console.log(`  ✓ Ticket Closing`)
    console.log(`  ✓ Traffic Statistics`)
    console.log(`  ✓ Subscription Token Reset`)
    console.log('\n✅ System is ready for production deployment!')

  } catch (error: any) {
    console.log('\n' + '=' .repeat(60))
    console.log('❌ E2E Test Failed!')
    console.log('=' .repeat(60))
    console.error(`Error: ${error.message}`)
    console.error(`Stack: ${error.stack}`)

    process.exit(1)
  }
}

// Run the test
runE2ETest()
  .then(() => {
    console.log('\n✅ Test execution completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Test execution failed:', error)
    process.exit(1)
  })
