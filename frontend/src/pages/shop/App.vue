<template>
  <div class="shop-container">
    <!-- Header with balance and redeem -->
    <div class="shop-header">
      <div class="balance-section">
        <h1>商店</h1>
        <div class="balance-info">
          <span class="balance-label">余额:</span>
          <span class="balance-amount">¥{{ userBalance.toFixed(2) }}</span>
        </div>
      </div>

      <!-- Quick redeem -->
      <div class="redeem-section">
        <el-input
          v-model="redeemCode"
          placeholder="输入充值码"
          class="redeem-input"
          @keyup.enter="handleRedeem"
        >
          <template #append>
            <el-button @click="handleRedeem" :loading="redeeming">兑换</el-button>
          </template>
        </el-input>
      </div>
    </div>

    <!-- Products Grid -->
    <div v-loading="loading" class="products-grid">
      <el-card
        v-for="product in products"
        :key="product.id"
        class="product-card"
        shadow="hover"
      >
        <template #header>
          <div class="card-header">
            <span class="product-name">{{ product.name }}</span>
            <el-tag type="danger" size="large">¥{{ product.price.toFixed(2) }}</el-tag>
          </div>
        </template>

        <div class="product-content">
          <div class="content-item" v-if="product.content.traffic || product.content.flow">
            <el-icon><TrendCharts /></el-icon>
            <span>流量: {{ product.content.traffic || product.content.flow }}</span>
          </div>
          <div class="content-item" v-if="product.content.class">
            <el-icon><Star /></el-icon>
            <span>等级: V{{ product.content.class }}</span>
          </div>
          <div class="content-item" v-if="product.content.expire">
            <el-icon><Clock /></el-icon>
            <span>有效期: {{ product.content.expire }}</span>
          </div>
          <div class="content-item" v-if="product.content['账户有效期']">
            <el-icon><Calendar /></el-icon>
            <span>账户有效期: {{ product.content['账户有效期'] }}</span>
          </div>
          <div class="content-item" v-if="product.content.node_group !== undefined">
            <el-icon><Connection /></el-icon>
            <span>节点组: G{{ product.content.node_group }}</span>
          </div>
        </div>

        <template #footer>
          <el-button
            type="primary"
            size="large"
            :disabled="userBalance < product.price"
            @click="handleBuy(product)"
            class="buy-button"
          >
            {{ userBalance < product.price ? '余额不足' : '立即购买' }}
          </el-button>
        </template>
      </el-card>
    </div>

    <!-- Empty state -->
    <el-empty v-if="!loading && products.length === 0" description="暂无商品" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  TrendCharts,
  Star,
  Clock,
  Calendar,
  Connection,
} from '@element-plus/icons-vue'
import { apiClient } from '@/shared/api/client'

// State
const products = ref<any[]>([])
const userBalance = ref(0)
const loading = ref(false)
const redeemCode = ref('')
const redeeming = ref(false)

// Fetch products
const fetchProducts = async () => {
  loading.value = true
  try {
    const response = await apiClient.user.shop.get()
    products.value = response.products || []
  } catch (error: any) {
    ElMessage.error(error.message || '加载商品失败')
  } finally {
    loading.value = false
  }
}

// Fetch user balance
const fetchUserBalance = async () => {
  try {
    const response = await apiClient.user.info.get()
    userBalance.value = response.account?.money || 0
  } catch (error: any) {
    console.error('Failed to fetch user balance:', error)
  }
}

// Handle buy
const handleBuy = async (product: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要购买 ${product.name} 吗? 价格: ¥${product.price.toFixed(2)}`,
      '确认购买',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info',
      }
    )

    loading.value = true
    await apiClient.user.buy.post({
      shop_id: product.id.toString(),
    })

    ElMessage.success('购买成功!')

    // Refresh balance
    await fetchUserBalance()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '购买失败')
    }
  } finally {
    loading.value = false
  }
}

// Handle redeem
const handleRedeem = async () => {
  if (!redeemCode.value.trim()) {
    ElMessage.warning('请输入充值码')
    return
  }

  try {
    redeeming.value = true
    const result = await apiClient.user.redeem.post({
      code: redeemCode.value.trim(),
    })

    ElMessage.success(`兑换成功! 余额增加 ¥${result.amount.toFixed(2)}`)
    redeemCode.value = ''

    // Refresh balance
    await fetchUserBalance()
  } catch (error: any) {
    ElMessage.error(error.message || '兑换失败')
  } finally {
    redeeming.value = false
  }
}

onMounted(() => {
  fetchProducts()
  fetchUserBalance()
})
</script>

<style scoped>
.shop-container {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.shop-header {
  margin-bottom: 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.balance-section h1 {
  font-size: 28px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #000000d9;
}

.balance-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.balance-label {
  font-size: 14px;
  color: #909399;
}

.balance-amount {
  font-size: 20px;
  font-weight: 600;
  color: #f56c6c;
}

.redeem-section {
  flex: 1;
  max-width: 400px;
}

.redeem-input {
  width: 100%;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

.product-card {
  border-radius: 8px;
  transition: transform 0.2s;
}

.product-card:hover {
  transform: translateY(-4px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.product-name {
  font-size: 18px;
  font-weight: 600;
  color: #000000d9;
}

.product-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.content-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #606266;
}

.content-item .el-icon {
  color: #409eff;
}

.buy-button {
  width: 100%;
}

@media (max-width: 768px) {
  .shop-header {
    flex-direction: column;
    align-items: stretch;
  }

  .products-grid {
    grid-template-columns: 1fr;
  }

  .redeem-section {
    max-width: 100%;
  }
}
</style>
