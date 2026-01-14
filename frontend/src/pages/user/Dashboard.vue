<template>
  <div class="dashboard-container">
    <!-- Header -->
    <el-header class="dashboard-header">
      <div class="header-content">
        <h1 class="title">用户仪表盘</h1>
        <div class="user-info">
          <el-dropdown>
            <span class="user-name">
              <el-icon><User /></el-icon>
              {{ userData.user?.user_name || 'Loading...' }}
              <el-icon class="el-icon--right"><arrow-down /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleLogout">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </el-header>

    <!-- Main Content -->
    <el-main class="dashboard-main">
      <!-- User Info Cards -->
      <el-row :gutter="20" class="info-cards">
        <el-col :xs="24" :sm="12" :md="6">
          <el-card class="info-card">
            <template #header>
              <div class="card-header">
                <el-icon><User /></el-icon>
                <span>用户信息</span>
              </div>
            </template>
            <div class="card-content">
              <div class="info-item">
                <span class="label">用户名:</span>
                <span class="value">{{ userData.user?.user_name || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="label">邮箱:</span>
                <span class="value">{{ userData.user?.email || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="label">等级:</span>
                <el-tag size="small">{{ userData.user?.class ?? 0 }}</el-tag>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :xs="24" :sm="12" :md="6">
          <el-card class="info-card">
            <template #header>
              <div class="card-header">
                <el-icon><Wallet /></el-icon>
                <span>账户余额</span>
              </div>
            </template>
            <div class="card-content">
              <div class="balance-display">
                <span class="balance-amount">{{ formatMoney(userData.account?.money || 0) }}</span>
              </div>
              <div class="info-item">
                <span class="label">过期时间:</span>
                <span class="value">{{ formatDate(userData.account?.expire_in || '') }}</span>
              </div>
              <div class="info-item" v-if="daysRemaining !== null">
                <span class="label">剩余天数:</span>
                <el-tag :type="daysRemaining < 7 ? 'danger' : 'success'" size="small">
                  {{ daysRemaining }} 天
                </el-tag>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :xs="24" :sm="12" :md="6">
          <el-card class="info-card">
            <template #header>
              <div class="card-header">
                <el-icon><Connection /></el-icon>
                <span>连接配置</span>
              </div>
            </template>
            <div class="card-content">
              <div class="info-item">
                <span class="label">加密方式:</span>
                <span class="value">{{ userData.account?.method || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="label">协议:</span>
                <span class="value">{{ userData.account?.protocol || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="label">混淆:</span>
                <span class="value">{{ userData.account?.obfs || '-' }}</span>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :xs="24" :sm="12" :md="6">
          <el-card class="info-card">
            <template #header>
              <div class="card-header">
                <el-icon><InfoFilled /></el-icon>
                <span>快速操作</span>
              </div>
            </template>
            <div class="card-content actions">
              <el-button type="primary" @click="goToNodes" :icon="Connection">
                节点列表
              </el-button>
              <el-button @click="refreshData" :icon="Refresh">
                刷新数据
              </el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- Traffic Statistics -->
      <el-row :gutter="20" class="traffic-section">
        <el-col :span="24">
          <el-card>
            <template #header>
              <div class="card-header">
                <el-icon><TrendCharts /></el-icon>
                <span>流量统计</span>
              </div>
            </template>
            
            <div class="traffic-overview">
              <!-- Progress Bar -->
              <div class="progress-section">
                <div class="progress-header">
                  <span class="progress-label">总流量使用</span>
                  <span class="progress-value">{{ formatPercent(userData.traffic?.used_percent || 0) }}</span>
                </div>
                <el-progress 
                  :percentage="parseFloat((userData.traffic?.used_percent || 0).toFixed(2))"
                  :color="progressColor"
                  :stroke-width="20"
                />
              </div>

              <!-- Traffic Details -->
              <el-row :gutter="20" class="traffic-details">
                <el-col :xs="24" :sm="12" :md="6">
                  <div class="traffic-item">
                    <div class="traffic-label">已用上传</div>
                    <div class="traffic-value">{{ formatBytes(userData.traffic?.upload || 0) }}</div>
                  </div>
                </el-col>
                <el-col :xs="24" :sm="12" :md="6">
                  <div class="traffic-item">
                    <div class="traffic-label">已用下载</div>
                    <div class="traffic-value">{{ formatBytes(userData.traffic?.download || 0) }}</div>
                  </div>
                </el-col>
                <el-col :xs="24" :sm="12" :md="6">
                  <div class="traffic-item">
                    <div class="traffic-label">总已用流量</div>
                    <div class="traffic-value total-used">{{ formatBytes(userData.traffic?.total_used || 0) }}</div>
                  </div>
                </el-col>
                <el-col :xs="24" :sm="12" :md="6">
                  <div class="traffic-item">
                    <div class="traffic-label">剩余流量</div>
                    <div class="traffic-value remaining">{{ formatBytes(userData.traffic?.available || 0) }}</div>
                  </div>
                </el-col>
              </el-row>

              <!-- Traffic Limit -->
              <el-divider />
              <div class="traffic-limit">
                <span class="limit-label">流量上限:</span>
                <span class="limit-value">{{ formatBytes(userData.traffic?.transfer_enable || 0) }}</span>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- Traffic History -->
      <el-row :gutter="20" class="traffic-history-section" v-if="trafficHistory.length > 0">
        <el-col :span="24">
          <el-card>
            <template #header>
              <div class="card-header">
                <el-icon><Calendar /></el-icon>
                <span>最近 7 天流量记录</span>
              </div>
            </template>
            <el-table :data="trafficHistory" stripe>
              <el-table-column prop="date" label="日期" width="180" />
              <el-table-column prop="upload" label="上传">
                <template #default="{ row }">
                  {{ formatBytes(row.upload) }}
                </template>
              </el-table-column>
              <el-table-column prop="download" label="下载">
                <template #default="{ row }">
                  {{ formatBytes(row.download) }}
                </template>
              </el-table-column>
              <el-table-column prop="total" label="总计">
                <template #default="{ row }">
                  {{ formatBytes(row.total) }}
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </el-col>
      </el-row>

      <!-- Subscription Management -->
      <el-row :gutter="20" class="subscription-section">
        <el-col :span="24">
          <el-card>
            <template #header>
              <div class="card-header">
                <el-icon><Link /></el-icon>
                <span>订阅管理</span>
                <el-button
                  type="primary"
                  size="small"
                  @click="fetchSubscription"
                  :loading="subscriptionLoading"
                  style="margin-left: auto;"
                >
                  <el-icon><Refresh /></el-icon>
                  刷新
                </el-button>
              </div>
            </template>

            <div v-if="!subscriptionData" class="subscription-placeholder">
              <el-empty description="点击刷新获取订阅链接" />
            </div>

            <div v-else class="subscription-content">
              <!-- Subscription URL -->
              <div class="subscription-url-section">
                <div class="url-header">
                  <span class="url-label">订阅链接</span>
                  <el-button
                    type="primary"
                    size="small"
                    @click="copySubscriptionUrl"
                    :icon="DocumentCopy"
                  >
                    一键复制
                  </el-button>
                </div>
                <el-input
                  v-model="subscriptionData.urls.ss"
                  readonly
                  class="subscription-input"
                >
                  <template #append>
                    <el-button @click="openSubscriptionUrl" :icon="View">查看</el-button>
                  </template>
                </el-input>
              </div>

              <!-- Quick Import Links -->
              <div class="quick-import-section">
                <div class="section-title">快速导入</div>
                <el-space wrap>
                  <el-button
                    type="success"
                    @click="importToClash"
                    :icon="Connection"
                  >
                    导入到 Clash
                  </el-button>
                  <el-button
                    type="warning"
                    @click="importToShadowrocket"
                    :icon="Iphone"
                  >
                    导入到 Shadowrocket
                  </el-button>
                  <el-button
                    @click="importToQuantumultX"
                    :icon="MagicStick"
                  >
                    导入到 Quantumult X
                  </el-button>
                </el-space>
              </div>

              <!-- Other Formats -->
              <el-divider />

              <div class="other-formats-section">
                <div class="section-title">其他格式</div>
                <el-collapse>
                  <el-collapse-item title="Shadowsocks (SS)" name="ss">
                    <el-input
                      v-model="subscriptionData.urls.ss"
                      readonly
                      class="format-input"
                    >
                      <template #append>
                        <el-button @click="copyToClipboard(subscriptionData.urls.ss, 'SS链接')">复制</el-button>
                      </template>
                    </el-input>
                  </el-collapse-item>
                  <el-collapse-item title="ShadowsocksR (SSR)" name="ssr">
                    <el-input
                      v-model="subscriptionData.urls.ssr"
                      readonly
                      class="format-input"
                    >
                      <template #append>
                        <el-button @click="copyToClipboard(subscriptionData.urls.ssr, 'SSR链接')">复制</el-button>
                      </template>
                    </el-input>
                  </el-collapse-item>
                  <el-collapse-item title="V2Ray/VMess" name="v2ray">
                    <el-input
                      v-model="subscriptionData.urls.v2ray"
                      readonly
                      class="format-input"
                    >
                      <template #append>
                        <el-button @click="copyToClipboard(subscriptionData.urls.v2ray, 'V2Ray链接')">复制</el-button>
                      </template>
                    </el-input>
                  </el-collapse-item>
                  <el-collapse-item title="Trojan" name="trojan">
                    <el-input
                      v-model="subscriptionData.urls.trojan"
                      readonly
                      class="format-input"
                    >
                      <template #append>
                        <el-button @click="copyToClipboard(subscriptionData.urls.trojan, 'Trojan链接')">复制</el-button>
                      </template>
                    </el-input>
                  </el-collapse-item>
                  <el-collapse-item title="Clash 配置" name="clash">
                    <el-input
                      v-model="subscriptionData.urls.clash"
                      readonly
                      class="format-input"
                    >
                      <template #append>
                        <el-button @click="copyToClipboard(subscriptionData.urls.clash, 'Clash配置')">复制</el-button>
                      </template>
                    </el-input>
                  </el-collapse-item>
                  <el-collapse-item title="Surge 配置" name="surge">
                    <el-input
                      v-model="subscriptionData.urls.surge"
                      readonly
                      class="format-input"
                    >
                      <template #append>
                        <el-button @click="copyToClipboard(subscriptionData.urls.surge, 'Surge配置')">复制</el-button>
                      </template>
                    </el-input>
                  </el-collapse-item>
                </el-collapse>
              </div>

              <!-- Reset Token -->
              <el-divider />

              <div class="reset-section">
                <el-alert
                  title="重置订阅链接"
                  type="warning"
                  description="重置后，旧订阅链接将失效，您需要更新所有客户端的订阅地址。"
                  :closable="false"
                  show-icon
                />
                <el-button
                  type="danger"
                  plain
                  @click="resetSubscription"
                  :loading="resetting"
                  style="margin-top: 15px;"
                >
                  <el-icon><Warning /></el-icon>
                  重置订阅 Token
                </el-button>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </el-main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  User,
  ArrowDown,
  SwitchButton,
  Wallet,
  Connection,
  InfoFilled,
  TrendCharts,
  Calendar,
  Refresh,
  Link,
  DocumentCopy,
  View,
  Iphone,
  MagicStick,
  Warning
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api, handleApiResponse } from '@/shared/api/eden-client'
import { auth } from '@/shared/utils/auth'
import { formatBytes, formatPercent, formatDate, formatMoney, getDaysRemaining, getTrafficStatusColor } from '@/shared/utils/format'

const router = useRouter()

// User data
interface UserInfo {
  user?: {
    id: number
    email: string
    user_name: string
    class: number
    node_group: number
  }
  traffic?: {
    upload: string
    download: string
    total_used: string
    transfer_enable: string
    available: string
    used_percent: number
  }
  account?: {
    money: string
    expire_in: string
    method: string
    protocol: string
    obfs: string
  }
}

const userData = ref<UserInfo>({})
const trafficHistory = ref<any[]>([])
const loading = ref(false)

// Subscription data
const subscriptionData = ref<any>(null)
const subscriptionLoading = ref(false)
const resetting = ref(false)

// Computed
const daysRemaining = computed(() => {
  return getDaysRemaining(userData.value.account?.expire_in || null)
})

const progressColor = computed(() => {
  const percent = userData.value.traffic?.used_percent || 0
  return getTrafficStatusColor(percent)
})

// Methods
const fetchUserData = async () => {
  try {
    loading.value = true

    // Fetch user info
    const userInfo = await handleApiResponse(api.api.user.info.get()) as any
    userData.value = userInfo

  } catch (error: any) {
    console.error('Failed to fetch user data:', error)
    ElMessage.error(error.message || '获取用户信息失败')

    // Check if auth error
    if (error.message?.includes('Authentication')) {
      auth.logout()
    }
  } finally {
    loading.value = false
  }
}

const fetchTrafficHistory = async () => {
  try {
    const trafficData = await handleApiResponse(api.api.user.traffic.get()) as any
    trafficHistory.value = trafficData.daily_history || []
  } catch (error: any) {
    console.error('Failed to fetch traffic history:', error)
    // Don't show error for traffic history - it's optional
  }
}

const refreshData = () => {
  fetchUserData()
  fetchTrafficHistory()
  ElMessage.success('数据已刷新')
}

const handleLogout = () => {
  auth.logout()
}

const goToNodes = () => {
  window.location.href = '/user/nodes.html'
}

// Subscription methods
const fetchSubscription = async () => {
  try {
    subscriptionLoading.value = true
    const data = await handleHttpResponse(
      fetch('/api/user/subscription', {
        headers: {
          'Authorization': `Bearer ${auth.getToken()}`,
        },
      })
    ) as any
    subscriptionData.value = data
    ElMessage.success('订阅链接已更新')
  } catch (error: any) {
    console.error('Failed to fetch subscription:', error)
    ElMessage.error(error.message || '获取订阅链接失败')
  } finally {
    subscriptionLoading.value = false
  }
}

const copySubscriptionUrl = () => {
  if (!subscriptionData.value?.urls?.ss) {
    ElMessage.warning('请先获取订阅链接')
    return
  }
  copyToClipboard(subscriptionData.value.urls.ss, '订阅链接')
}

const copyToClipboard = (text: string, label: string) => {
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success(`${label}已复制到剪贴板`)
  }).catch(() => {
    ElMessage.error('复制失败，请手动复制')
  })
}

const openSubscriptionUrl = () => {
  if (!subscriptionData.value?.urls?.ss) return
  window.open(subscriptionData.value.urls.ss, '_blank')
}

const importToClash = () => {
  if (!subscriptionData.value?.urls?.clash) {
    ElMessage.warning('请先获取订阅链接')
    return
  }
  // Clash scheme: clash://install-config?url=...
  const clashUrl = `clash://install-config?url=${encodeURIComponent(subscriptionData.value.urls.clash)}`
  window.location.href = clashUrl
}

const importToShadowrocket = () => {
  if (!subscriptionData.value?.urls?.ss) {
    ElMessage.warning('请先获取订阅链接')
    return
  }
  // Shadowrocket scheme: shadowrocket://add/subscribe/...
  const srUrl = `shadowrocket://add/${encodeURIComponent(subscriptionData.value.urls.ss)}`
  window.location.href = srUrl
}

const importToQuantumultX = () => {
  if (!subscriptionData.value?.urls?.ss) {
    ElMessage.warning('请先获取订阅链接')
    return
  }
  // Quantumult X scheme: quantumult-x://...
  const qxUrl = `quantumult-x://update-configuration?remote-resource=${encodeURIComponent(subscriptionData.value.urls.ss)}`
  window.location.href = qxUrl
}

const resetSubscription = async () => {
  try {
    await ElMessageBox.confirm(
      '重置后，旧订阅链接将失效，您需要更新所有客户端的订阅地址。确定要重置吗？',
      '重置订阅链接',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    resetting.value = true
    await handleHttpResponse(
      fetch('/api/user/subscription/reset', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.getToken()}`,
          'Content-Type': 'application/json',
        },
      })
    )

    ElMessage.success('订阅链接已重置，请更新所有客户端')
    await fetchSubscription()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Failed to reset subscription:', error)
      ElMessage.error(error.message || '重置订阅链接失败')
    }
  } finally {
    resetting.value = false
  }
}

// Helper function for fetch with auth
async function handleHttpResponse(responsePromise: Promise<Response>) {
  const response = await responsePromise
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Request failed')
  }
  return response.json()
}

// Lifecycle
onMounted(() => {
  // Check auth
  if (!auth.isLoggedIn()) {
    auth.logout()
    return
  }

  // Fetch data
  fetchUserData()
  fetchTrafficHistory()

  // Fetch subscription
  fetchSubscription()
})
</script>

<style scoped>
.dashboard-container {
  min-height: 100vh;
  background: #f5f7fa;
}

.dashboard-header {
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  padding: 0;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
  padding: 0 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.user-name {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.user-name:hover {
  background-color: #f5f7fa;
}

.dashboard-main {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.info-cards {
  margin-bottom: 20px;
}

.info-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.info-item .label {
  color: #909399;
}

.info-item .value {
  color: #303133;
  font-weight: 500;
}

.balance-display {
  text-align: center;
  padding: 10px 0;
}

.balance-amount {
  font-size: 28px;
  font-weight: 600;
  color: #409eff;
}

.card-content.actions {
  flex-direction: row;
}

.card-content.actions .el-button {
  flex: 1;
}

.traffic-section {
  margin-bottom: 20px;
}

.traffic-overview {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.progress-section {
  margin-bottom: 20px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.progress-label {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.progress-value {
  font-size: 18px;
  font-weight: 600;
  color: #409eff;
}

.traffic-details {
  margin-top: 20px;
}

.traffic-item {
  text-align: center;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 4px;
}

.traffic-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.traffic-value {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.traffic-value.total-used {
  color: #409eff;
}

.traffic-value.remaining {
  color: #67c23a;
}

.traffic-limit {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.limit-label {
  color: #909399;
}

.limit-value {
  font-weight: 600;
  color: #303133;
}

.traffic-history-section {
  margin-bottom: 20px;
}

.subscription-section {
  margin-bottom: 20px;
}

.subscription-placeholder {
  padding: 40px 0;
}

.subscription-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.subscription-url-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.url-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.url-label {
  font-weight: 600;
  color: #303133;
  font-size: 16px;
}

.subscription-input {
  font-family: monospace;
}

.quick-import-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.other-formats-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-title {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
  margin-bottom: 5px;
}

.format-input {
  margin-bottom: 10px;
}

.reset-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Responsive */
@media (max-width: 768px) {
  .header-content {
    padding: 0 10px;
  }

  .dashboard-main {
    padding: 10px;
  }

  .traffic-value {
    font-size: 16px;
  }
}
</style>
