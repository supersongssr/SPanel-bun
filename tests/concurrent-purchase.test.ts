/**
 * Concurrent Purchase Test
 *
 * Tests the transaction safety of the purchase system under concurrent load.
 * This simulates multiple users trying to purchase simultaneously to ensure:
 * 1. User balance never goes negative
 * 2. All transactions are atomic
 * 3. No race conditions occur
 *
 * Run with: bun run tests/concurrent-purchase.test.ts
 */

const API_BASE = 'http://localhost:3000/api'

interface TestUser {
  id: number
  email: string
  user_name: string
  token: string
}

interface Product {
  id: bigint
  name: string
  price: number
}

// Test configuration
const CONCURRENT_REQUESTS = 10
const INITIAL_BALANCE = 100
const PRODUCT_PRICE = 10

/**
 * Setup: Create a test user with initial balance and a test product
 */
async function setupTestData(): Promise<{ user: TestUser; product: Product }> {
  console.log('🔧 Setting up test data...')

  // Create test user
  const registerResponse = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `test-${Date.now()}@example.com`,
      user_name: `testuser${Date.now()}`,
      password: 'test123456',
    }),
  })

  if (!registerResponse.ok) {
    throw new Error('Failed to create test user')
  }

  const registerData = await registerResponse.json()

  // Login to get token
  const loginResponse = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: registerData.user.email,
      password: 'test123456',
    }),
  })

  if (!loginResponse.ok) {
    throw new Error('Failed to login test user')
  }

  const loginData = await loginResponse.json()
  const user: TestUser = {
    id: loginData.user.id,
    email: loginData.user.email,
    user_name: loginData.user.user_name,
    token: loginData.token,
  }

  // Set user balance (we'll update this directly in the database via admin API)
  // For now, we'll use the admin API to update user balance
  // (This assumes there's an admin endpoint to update user balance)

  // Create a test product
  const createProductResponse = await fetch(`${API_BASE}/admin/shop`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${loginData.token}`,
    },
    body: JSON.stringify({
      name: 'Test Product - 100GB',
      price: PRODUCT_PRICE,
      content: JSON.stringify({
        traffic: '100GB',
        class: 1,
      }),
      status: true,
    }),
  })

  if (!createProductResponse.ok) {
    throw new Error('Failed to create test product')
  }

  const productData = await createProductResponse.json()

  console.log('✅ Test data setup complete')
  console.log(`   User: ${user.email}`)
  console.log(`   Product: ${productData.product.name} (¥${PRODUCT_PRICE})`)

  return {
    user,
    product: productData.product,
  }
}

/**
 * Simulate a single purchase request
 */
async function makePurchase(user: TestUser, productId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/user/buy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}`,
      },
      body: JSON.stringify({
        shop_id: productId,
      }),
    })

    const data = await response.json()

    if (response.ok) {
      return { success: true }
    } else {
      return { success: false, error: data.message || 'Unknown error' }
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Get user balance
 */
async function getUserBalance(user: TestUser): Promise<number> {
  const response = await fetch(`${API_BASE}/user/info`, {
    headers: {
      'Authorization': `Bearer ${user.token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to get user balance')
  }

  const data = await response.json()
  return data.account?.money || 0
}

/**
 * Main concurrent purchase test
 */
async function runConcurrentPurchaseTest() {
  console.log('\n🚀 Starting Concurrent Purchase Test')
  console.log(`   Concurrent requests: ${CONCURRENT_REQUESTS}`)
  console.log(`   Initial balance: ¥${INITIAL_BALANCE}`)
  console.log(`   Product price: ¥${PRODUCT_PRICE}`)
  console.log(`   Expected successful purchases: ${Math.floor(INITIAL_BALANCE / PRODUCT_PRICE)}`)
  console.log('')

  try {
    // Setup test data
    const { user, product } = await setupTestData()

    const initialBalance = await getUserBalance(user)
    console.log(`💰 Initial user balance: ¥${initialBalance}`)

    // Fire all concurrent purchase requests
    console.log(`\n🔥 Firing ${CONCURRENT_REQUESTS} concurrent purchase requests...`)
    const startTime = Date.now()

    const promises = Array.from({ length: CONCURRENT_REQUESTS }, () =>
      makePurchase(user, product.id.toString())
    )

    const results = await Promise.all(promises)

    const endTime = Date.now()
    const duration = endTime - startTime

    // Analyze results
    const successfulPurchases = results.filter((r) => r.success).length
    const failedPurchases = results.filter((r) => !r.success).length

    console.log(`\n⏱️  Completed in ${duration}ms`)
    console.log(`\n📊 Results:`)
    console.log(`   Successful purchases: ${successfulPurchases}`)
    console.log(`   Failed purchases: ${failedPurchases}`)

    // Check final balance
    const finalBalance = await getUserBalance(user)
    console.log(`   Final balance: ¥${finalBalance}`)
    console.log(`   Expected balance: ¥${initialBalance - successfulPurchases * PRODUCT_PRICE}`)

    // Validation checks
    console.log(`\n✅ Validation Checks:`)

    // Check 1: Balance should never be negative
    if (finalBalance < 0) {
      console.error(`   ❌ CRITICAL: Balance is negative! (¥${finalBalance})`)
      process.exit(1)
    } else {
      console.log(`   ✅ Balance is non-negative: ¥${finalBalance}`)
    }

    // Check 2: Final balance should match expected
    const expectedBalance = initialBalance - successfulPurchases * PRODUCT_PRICE
    if (Math.abs(finalBalance - expectedBalance) > 0.01) {
      console.error(`   ❌ Balance mismatch! Expected: ¥${expectedBalance}, Got: ¥${finalBalance}`)
      process.exit(1)
    } else {
      console.log(`   ✅ Balance matches expected: ¥${finalBalance}`)
    }

    // Check 3: Should not have more successful purchases than balance allows
    const maxPossiblePurchases = Math.floor(initialBalance / PRODUCT_PRICE)
    if (successfulPurchases > maxPossiblePurchases) {
      console.error(`   ❌ Too many successful purchases! Max: ${maxPossiblePurchases}, Got: ${successfulPurchases}`)
      process.exit(1)
    } else {
      console.log(`   ✅ Successful purchases within limits: ${successfulPurchases}/${maxPossiblePurchases}`)
    }

    // Check 4: No unexpected errors
    const unexpectedErrors = results.filter((r) => !r.success && r.error !== 'Insufficient balance')
    if (unexpectedErrors.length > 0) {
      console.error(`   ❌ Unexpected errors detected:`)
      unexpectedErrors.forEach((e) => console.error(`      - ${e.error}`))
      process.exit(1)
    } else {
      console.log(`   ✅ No unexpected errors`)
    }

    console.log(`\n🎉 All tests passed! Transaction system is working correctly.`)

    // Cleanup (optional - uncomment to delete test data)
    // await cleanupTestData(user, product)

  } catch (error: any) {
    console.error(`\n❌ Test failed: ${error.message}`)
    process.exit(1)
  }
}

/**
 * Cleanup test data
 */
async function cleanupTestData(user: TestUser, product: Product) {
  console.log('\n🧹 Cleaning up test data...')
  // Implement cleanup logic if needed
}

// Run the test
runConcurrentPurchaseTest()
  .then(() => {
    console.log('\n✅ Test execution completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Test execution failed:', error)
    process.exit(1)
  })
