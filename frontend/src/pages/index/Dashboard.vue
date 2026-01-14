<template>
  <div class="user-dashboard">
    <!-- Header -->
    <el-header class="dashboard-header">
      <div class="header-content">
        <h1 class="title">
          <el-icon><User /></el-icon>
          用户中心
        </h1>
        <div class="user-info">
          <el-tag type="primary" size="large">用户</el-tag>
          <span class="username">{{ userInfo.user_name || userInfo.email }}</span>
          <el-dropdown @command="handleMenuCommand">
            <span class="el-dropdown-link">
              <el-icon class="el-icon--right"><setting /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </el-header>

    <!-- Main Content -->
    <el-main class="dashboard-main">
      <!-- Usage Cards -->
      <el-row :gutter="20" class="stats-cards">
        <el-col :xs="24" :sm="12" :md="6">
          <el-card class="stat-card traffic">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><TrendCharts /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ formatBytes(trafficInfo.total_used) }}</div>
                <div class="stat-label">已用流量</div>
                <div class="stat-extra">
                  总计: {{ formatBytes(trafficInfo.transfer_enable) }}
                </div>
              </div>
            </div>
            <el-progress
              :percentage="trafficInfo.used_percent"
              :color="getProgressColor(trafficInfo.used_percent)"
              :show-text="false"
            />
          </el-card>
        </el-col>

        <el-col :xs="24" :sm="12" :md="6">
          <el-card class="stat-card available">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><Download /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ formatBytes(trafficInfo.available) }}</div>
                <div class="stat-label">剩余流量</div>
                <div class="stat-extra">
                  {{ (100 - trafficInfo.used_percent).toFixed(1) }}% 可用
                </div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :xs="24" :sm="12" :md="6">
          <el-card class="stat-card money">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><Wallet /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">¥{{ accountInfo.money }}</div>
                <div class="stat-label">账户余额</div>
                <div class="stat-extra">
                  等级: {{ accountInfo.class }}
                </div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :xs="24" :sm="12" :md="6">
          <el-card class="stat-card expire">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><Calendar /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ daysRemaining }}</div>
                <div class="stat-label">剩余天数</div>
                <div class="stat-extra">
                  {{ formatDate(accountInfo.expire_in) }}
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- Subscription Link -->
      <el-card class="subscription-card">
        <template #header>
          <div class="card-header">
            <span>
              <el-icon><Link /></el-icon>
              我的订阅链接
            </span>
            <el-button type="primary" @click="copySubscription" :loading="copying">
              <el-icon><DocumentCopy /></el-icon>
              一键复制订阅链接
            </el-button>
          </div>
        </template>
        <el-alert
          title="订阅说明"
          type="info"
          :closable="false"
          show-icon
        >
          <p>您的专属订阅链接已生成。支持 V2Ray、Shadowsocks、Clash 等客户端。</p>
          <p>订阅链接: <code>{{ subscriptionLink }}</code></p>
        </el-alert>
      </el-card>

      <!-- Nodes List -->
      <el-card class="nodes-card">
        <template #header>
          <div class="card-header">
            <span>
              <el-icon><Connection /></el-icon>
              可用节点列表 ({{ nodes.length }})
            </span>
            <el-button @click="fetchNodes" :icon="Refresh">刷新</el-button>
          </div>
        </template>

        <el-table
          :data="nodes"
          v-loading="nodesLoading"
          stripe
          style="width: 100%"
        >
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="name" label="节点名称" min-width="200" />
          <el-table-column prop="server" label="服务器地址" min-width="180" />
          <el-table-column label="倍率" width="100" align="center">
            <template #default="{ row }">
              <el-tag size="small">x{{ row.rate }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="在线用户" width="120" align="center">
            <template #default="{ row }">
              <el-tag type="success" size="small">
                {{ row.online_users || 0 }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100" align="center">
            <template #default>
              <el-tag type="success" size="small">在线</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </el-main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  User,
  Setting,
  TrendCharts,
  Download,
  Wallet,
  Calendar,
  Link,
  DocumentCopy,
  Connection,
  Refresh
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { api, handleApiResponse } from '@/shared/api/eden-client'
import { auth } from '@/shared/utils/auth'
import { checkAuth } from '@/shared/utils/router-guard'

// Check authentication
if (!checkAuth()) {
  // Will redirect to login
}

// Data
const userInfo = ref<any>({})
const trafficInfo = ref<any>({})
const accountInfo = ref<any>({})
const nodes = ref<any[]>([])
const nodesLoading = ref(false)
const copying = ref(false)

const subscriptionLink = computed(() => {
  const uuid = userInfo.value.uuid || 'your-uuid-here'
  return `https://test-spanel-bun.freessr.bid/link/${uuid}`
})

const daysRemaining = computed(() => {
  if (!accountInfo.value.expire_in) return '0'
  const now = new Date()
  const expire = new Date(accountInfo.value.expire_in)
  const diff = expire.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  return days > 0 ? `${days} 天` : '已过期'
})

// Methods
const formatBytes = (bytes: string | number) => {
  const b = typeof bytes === 'string' ? BigInt(bytes) : BigInt(Math.floor(bytes))
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  let unitIndex = 0
  let value = Number(b)

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex++
  }

  return `${value.toFixed(2)} ${units[unitIndex]}`
}

const getProgressColor = (percent: number) => {
  if (percent < 50) return '#67c23a'
  if (percent < 80) return '#e6a23c'
  return '#f56c6c'
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '永久'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

const fetchUserInfo = async () => {
  try {
    const response = await handleApiResponse(
      api.api.user.info.get()
    ) as any

    userInfo.value = response.user
    trafficInfo.value = response.traffic
    accountInfo.value = response.account
  } catch (error: any) {
    console.error('Failed to fetch user info:', error)
    ElMessage.error(error.message || '获取用户信息失败')
    if (error.message?.includes('Authentication')) {
      auth.logout()
    }
  }
}

const fetchNodes = async () => {
  try {
    nodesLoading.value = true
    const response = await handleApiResponse(
      api.api.user.nodes.get()
    ) as any

    nodes.value = response.nodes || []
    ElMessage.success(`加载了 ${nodes.value.length} 个节点`)
  } catch (error: any) {
    console.error('Failed to fetch nodes:', error)
    ElMessage.error(error.message || '获取节点列表失败')
  } finally {
    nodesLoading.value = false
  }
}

const copySubscription = async () => {
  try {
    copying.value = true

    // Copy to clipboard
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(subscriptionLink.value)
      ElMessage.success('订阅链接已复制到剪贴板')
    } else {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = subscriptionLink.value
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      ElMessage.success('订阅链接已复制')
    }
  } catch (error) {
    ElMessage.error('复制失败，请手动复制')
  } finally {
    copying.value = false
  }
}

const handleMenuCommand = (command: string) => {
  if (command === 'logout') {
    auth.logout()
  }
}

// Lifecycle
onMounted(() => {
  fetchUserInfo()
  fetchNodes()
})
</script>

<style scoped>
.user-dashboard {
  min-height: 100vh;
  background: #f5f7fa;
}

.dashboard-header {
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 24px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
}

.title {
  font-size: 20px;
  font-weight: 500;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.username {
  font-size: 14px;
  color: #606266;
}

.dashboard-main {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.stats-cards {
  margin-bottom: 24px;
}

.stat-card {
  margin-bottom: 20px;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.stat-icon {
  font-size: 32px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.traffic .stat-icon { background: #ecf5ff; color: #409eff; }
.available .stat-icon { background: #f0f9ff; color: #67c23a; }
.money .stat-icon { background: #fdf6ec; color: #e6a23c; }
.expire .stat-icon { background: #fef0f0; color: #f56c6c; }

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

.stat-extra {
  font-size: 12px;
  color: #c0c4cc;
  margin-top: 4px;
}

.subscription-card,
.nodes-card {
  margin-bottom: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header code {
  background: #f5f7fa;
  padding: 4px 8px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #606266;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .dashboard-main {
    padding: 16px;
  }

  .stats-cards .el-col {
    margin-bottom: 12px;
  }

  .title {
    font-size: 18px;
  }

  .username {
    display: none;
  }
}
</style>
