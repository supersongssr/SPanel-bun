<template>
  <div class="admin-dashboard-container">
    <!-- Header -->
    <el-header class="admin-header">
      <div class="header-content">
        <h1 class="title">
          <el-icon><Monitor /></el-icon>
          管理员控制台
        </h1>
        <div class="user-info">
          <el-tag type="danger" size="large">管理员</el-tag>
          <el-dropdown>
            <span class="user-name">
              <el-icon><User /></el-icon>
              {{ adminName }}
              <el-icon class="el-icon--right"><arrow-down /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="goToUserPanel">
                  <el-icon><UserFilled /></el-icon>
                  用户端面板
                </el-dropdown-item>
                <el-dropdown-item divided @click="handleLogout">
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
    <el-main class="admin-main">
      <!-- Stats Cards -->
      <el-row :gutter="20" class="stats-cards">
        <el-col :xs="24" :sm="12" :md="6">
          <el-card class="stat-card users">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><User /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.users?.total || 0 }}</div>
                <div class="stat-label">总用户数</div>
                <div class="stat-extra">
                  今日新增: {{ stats.users?.newToday || 0 }}
                </div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :xs="24" :sm="12" :md="6">
          <el-card class="stat-card nodes">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><Connection /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.nodes?.total || 0 }}</div>
                <div class="stat-label">总节点数</div>
                <div class="stat-extra">
                  在线: {{ stats.nodes?.online || 0 }}
                </div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :xs="24" :sm="12" :md="6">
          <el-card class="stat-card upload">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><Upload /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ formatBytes(stats.traffic?.totalUpload || 0) }}</div>
                <div class="stat-label">总上传流量</div>
                <div class="stat-extra">
                  全站统计
                </div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :xs="24" :sm="12" :md="6">
          <el-card class="stat-card download">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><Download /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ formatBytes(stats.traffic?.totalDownload || 0) }}</div>
                <div class="stat-label">总下载流量</div>
                <div class="stat-extra">
                  全站统计
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- Quick Actions -->
      <el-row :gutter="20" class="actions-section">
        <el-col :span="24">
          <el-card>
            <template #header>
              <div class="card-header">
                <el-icon><Setting /></el-icon>
                <span>快速操作</span>
              </div>
            </template>
            <div class="quick-actions">
              <el-button type="primary" size="large" @click="goToUsers" :icon="User">
                用户管理
              </el-button>
              <el-button type="success" size="large" @click="refreshStats" :icon="Refresh">
                刷新统计
              </el-button>
              <el-button size="large" @click="goToUserPanel" :icon="Monitor">
                切换到用户端
              </el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- System Info -->
      <el-row :gutter="20" class="info-section">
        <el-col :span="24">
          <el-card>
            <template #header>
              <div class="card-header">
                <el-icon><InfoFilled /></el-icon>
                <span>系统信息</span>
              </div>
            </template>
            <el-descriptions :column="3" border>
              <el-descriptions-item label="系统版本">SPanel Bun v1.0.0</el-descriptions-item>
              <el-descriptions-item label="后端框架">Elysia.js</el-descriptions-item>
              <el-descriptions-item label="前端框架">Vue 3 + Element Plus</el-descriptions-item>
              <el-descriptions-item label="数据库">MySQL (201 users)</el-descriptions-item>
              <el-descriptions-item label="节点数量">{{ stats.nodes?.total || 0 }}</el-descriptions-item>
              <el-descriptions-item label="总流量使用">
                {{ formatBytes(stats.traffic?.totalTraffic || 0) }}
              </el-descriptions-item>
            </el-descriptions>
          </el-card>
        </el-col>
      </el-row>
    </el-main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Monitor,
  User,
  ArrowDown,
  SwitchButton,
  UserFilled,
  Connection,
  Upload,
  Download,
  Setting,
  Refresh,
  InfoFilled,
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { api, handleApiResponse } from '@/shared/api/eden-client'
import { auth } from '@/shared/utils/auth'
import { checkAuth } from '@/shared/utils/router-guard'
import { formatBytes } from '@/shared/utils/format'

// Stats data
interface StatsData {
  users?: {
    total: number
    newToday: number
  }
  nodes?: {
    total: number
    online: number
  }
  traffic?: {
    totalUpload: string
    totalDownload: string
    totalTraffic: string
  }
}

const stats = ref<StatsData>({})
const loading = ref(false)

// Computed
const adminName = computed(() => {
  return auth.getUserName() || 'Admin'
})

// Methods
const fetchStats = async () => {
  try {
    loading.value = true

    const response = await handleApiResponse(api.api.admin.stats.get()) as any
    stats.value = response

    ElMessage.success('统计数据已刷新')
  } catch (error: any) {
    console.error('Failed to fetch admin stats:', error)
    ElMessage.error(error.message || '获取统计数据失败')

    if (error.message?.includes('Authentication')) {
      auth.logout()
    }
  } finally {
    loading.value = false
  }
}

const refreshStats = () => {
  fetchStats()
}

const goToUsers = () => {
  window.location.href = '/admin/users.html'
}

const goToUserPanel = () => {
  window.location.href = '/user/dashboard.html'
}

const handleLogout = () => {
  auth.logout()
}

// Lifecycle
onMounted(() => {
  // Check auth and admin privileges
  if (!checkAuth()) {
    return
  }

  // Double check admin privileges
  if (!auth.isAdmin()) {
    alert('需要管理员权限才能访问此页面')
    window.location.href = '/index.html'
    return
  }

  // Fetch stats
  fetchStats()
})
</script>

<style scoped>
.admin-dashboard-container {
  min-height: 100vh;
  background: #f5f7fa;
}

.admin-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
  color: white;
}

.title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-name {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 4px;
  transition: background-color 0.3s;
  color: white;
}

.user-name:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.admin-main {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.stats-cards {
  margin-bottom: 20px;
}

.stat-card {
  margin-bottom: 20px;
  transition: transform 0.3s, box-shadow 0.3s;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 15px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: white;
}

.stat-card.users .stat-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-card.nodes .stat-icon {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-card.upload .stat-icon {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-card.download .stat-icon {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 5px;
}

.stat-extra {
  font-size: 13px;
  color: #409eff;
  font-weight: 500;
}

.actions-section {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.quick-actions {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.info-section {
  margin-bottom: 20px;
}

/* Responsive */
@media (max-width: 768px) {
  .header-content {
    padding: 0 10px;
  }

  .admin-main {
    padding: 10px;
  }

  .stat-value {
    font-size: 24px;
  }

  .quick-actions {
    flex-direction: column;
  }

  .quick-actions .el-button {
    width: 100%;
  }
}
</style>
