<template>
  <div class="dashboard">
    <el-container>
      <el-header>
        <div class="header-content">
          <h1>SPanel Dashboard</h1>
          <div class="user-info">
            <span v-if="userStore.userInfo">{{ userStore.userInfo.username }}</span>
            <el-button @click="logout" type="danger" size="small">Logout</el-button>
          </div>
        </div>
      </el-header>

      <el-main>
        <el-row :gutter="20">
          <el-col :span="6">
            <el-card>
              <template #header>
                <div class="card-header">
                  <span>Total Traffic</span>
                </div>
              </template>
              <div class="stat-value">
                {{ formatBytes(userStore.userInfo?.transferEnable || 0) }}
              </div>
            </el-card>
          </el-col>

          <el-col :span="6">
            <el-card>
              <template #header>
                <div class="card-header">
                  <span>Used Traffic</span>
                </div>
              </template>
              <div class="stat-value">
                {{ formatBytes((userStore.userInfo?.u || 0) + (userStore.userInfo?.d || 0)) }}
              </div>
            </el-card>
          </el-col>

          <el-col :span="6">
            <el-card>
              <template #header>
                <div class="card-header">
                  <span>Balance</span>
                </div>
              </template>
              <div class="stat-value">
                ¥{{ (userStore.userInfo?.balance || 0) / 100 }}
              </div>
            </el-card>
          </el-col>

          <el-col :span="6">
            <el-card>
              <template #header>
                <div class="card-header">
                  <span>Expires</span>
                </div>
              </template>
              <div class="stat-value">
                {{ formatDate(userStore.userInfo?.expireTime || 0) }}
              </div>
            </el-card>
          </el-col>
        </el-row>

        <el-row :gutter="20" style="margin-top: 20px">
          <el-col :span="24">
            <el-card>
              <template #header>
                <div class="card-header">
                  <span>Available Nodes</span>
                </div>
              </template>
              <el-table :data="userStore.nodes" style="width: 100%">
                <el-table-column prop="name" label="Name" />
                <el-table-column prop="server" label="Server" />
                <el-table-column label="Status">
                  <template #default="{ row }">
                    <el-tag :type="row.isOnline ? 'success' : 'danger'">
                      {{ row.isOnline ? 'Online' : 'Offline' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="onlineUserCount" label="Online Users" />
                <el-table-column prop="load" label="Load" />
              </el-table>
            </el-card>
          </el-col>
        </el-row>
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/shared/stores/user'
import { useAuth } from '@/shared/composables/useAuth'

const router = useRouter()
const { logout: authLogout, checkAuth } = useAuth()
const userStore = useUserStore()

// Check authentication
if (!checkAuth()) {
  router.push('/login.html')
}

// Load user data
onMounted(async () => {
  try {
    await userStore.init()
  } catch (error) {
    console.error('Failed to load user data:', error)
  }
})

// Logout
const logout = async () => {
  await authLogout()
  window.location.href = '/login.html'
}

// Format bytes
const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

// Format date
const formatDate = (timestamp: number) => {
  if (timestamp === 0) return 'Never'
  const date = new Date(timestamp * 1000)
  return date.toLocaleDateString()
}
</script>

<style scoped>
.dashboard {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #fff;
  padding: 0 20px;
  height: 60px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #409eff;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
