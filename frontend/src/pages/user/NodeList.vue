<template>
  <div class="nodes-container">
    <!-- Header -->
    <el-header class="nodes-header">
      <div class="header-content">
        <h1 class="title">节点列表</h1>
        <div class="user-info">
          <el-button @click="goBack" :icon="ArrowLeft">返回</el-button>
          <el-dropdown>
            <span class="user-name">
              <el-icon><User /></el-icon>
              {{ userName }}
              <el-icon class="el-icon--right"><arrow-down /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="goToDashboard">
                  <el-icon><HomeFilled /></el-icon>
                  仪表盘
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
    <el-main class="nodes-main">
      <!-- Stats Cards -->
      <el-row :gutter="20" class="stats-cards">
        <el-col :xs="24" :sm="8">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon total">
                <el-icon><Connection /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ nodes.length }}</div>
                <div class="stat-label">可用节点</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="8">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon class">
                <el-icon><Medal /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ userClass }}</div>
                <div class="stat-label">用户等级</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="8">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon group">
                <el-icon><Grid /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ userNodeGroup }}</div>
                <div class="stat-label">节点组</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- Filters -->
      <el-card class="filter-card">
        <el-row :gutter="20">
          <el-col :xs="24" :sm="8">
            <el-input
              v-model="searchText"
              placeholder="搜索节点名称"
              :prefix-icon="Search"
              clearable
            />
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-select v-model="filterType" placeholder="节点类型" clearable>
              <el-option label="全部" :value="0" />
              <el-option label="Shadowsocks" :value="1" />
              <el-option label="ShadowsocksR" :value="2" />
              <el-option label="V2Ray" :value="11" />
            </el-select>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-button type="primary" @click="refreshNodes" :icon="Refresh">
              刷新节点
            </el-button>
          </el-col>
        </el-row>
      </el-card>

      <!-- Nodes Table -->
      <el-card class="nodes-table-card">
        <el-table 
          :data="filteredNodes" 
          v-loading="loading"
          stripe
          style="width: 100%"
        >
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="name" label="节点名称" min-width="200">
            <template #default="{ row }">
              <div class="node-name">
                <el-icon><Connection /></el-icon>
                <span>{{ row.name }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="类型" width="150">
            <template #default="{ row }">
              <el-tag :type="getNodeTypeColor(row.type)" size="small">
                {{ formatNodeType(row.type) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="server" label="服务器地址" min-width="200" />
          <el-table-column prop="traffic_rate" label="流量倍率" width="120" align="center">
            <template #default="{ row }">
              <el-tag type="info" size="small">{{ row.traffic_rate }}x</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="120">
            <template #default="{ row }">
              <el-tag :type="row.status === 'available' ? 'success' : 'danger'" size="small">
                {{ row.status === 'available' ? '可用' : '不可用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="showNodeDetail(row)">
                <el-icon><Setting /></el-icon>
                连接
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- Empty State -->
        <div v-if="filteredNodes.length === 0 && !loading" class="empty-state">
          <el-empty description="暂无可用节点" />
        </div>
      </el-card>
    </el-main>

    <!-- Node Detail Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="selectedNode?.name"
      width="500px"
    >
      <div v-if="selectedNode" class="node-detail">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="节点名称">
            {{ selectedNode.name }}
          </el-descriptions-item>
          <el-descriptions-item label="服务器地址">
            <el-text class="copy-text" @click="copyText(selectedNode.server)">
              {{ selectedNode.server }}
              <el-icon><DocumentCopy /></el-icon>
            </el-text>
          </el-descriptions-item>
          <el-descriptions-item label="加密方式">
            {{ selectedNode.method }}
          </el-descriptions-item>
          <el-descriptions-item label="节点类型">
            <el-tag :type="getNodeTypeColor(selectedNode.type)" size="small">
              {{ formatNodeType(selectedNode.type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="流量倍率">
            {{ selectedNode.traffic_rate }}x
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="selectedNode.status === 'available' ? 'success' : 'danger'" size="small">
              {{ selectedNode.status === 'available' ? '可用' : '不可用' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="说明" v-if="selectedNode.info">
            {{ selectedNode.info }}
          </el-descriptions-item>
        </el-descriptions>

        <el-alert
          type="info"
          title="配置提示"
          :closable="false"
          show-icon
          style="margin-top: 20px"
        >
          <template #default>
            <p>在您的客户端中添加此节点，使用上述配置信息连接。</p>
            <p>点击服务器地址可快速复制。</p>
          </template>
        </el-alert>
      </div>

      <template #footer>
        <el-button @click="dialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="copyNodeConfig">
          <el-icon><DocumentCopy /></el-icon>
          复制配置
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  ArrowLeft,
  User,
  ArrowDown,
  SwitchButton,
  HomeFilled,
  Connection,
  Medal,
  Grid,
  Search,
  Refresh,
  Setting,
  DocumentCopy,
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { api, handleApiResponse } from '@/shared/api/eden-client'
import { auth } from '@/shared/utils/auth'
import { formatNodeType } from '@/shared/utils/format'

// Data
const nodes = ref<any[]>([])
const loading = ref(false)
const searchText = ref('')
const filterType = ref<number>(0)
const dialogVisible = ref(false)
const selectedNode = ref<any>(null)

const userClass = ref(0)
const userNodeGroup = ref(0)
const userName = ref('')

// Computed
const filteredNodes = computed(() => {
  let result = nodes.value

  // Filter by search text
  if (searchText.value) {
    const search = searchText.value.toLowerCase()
    result = result.filter(node => 
      node.name?.toLowerCase().includes(search) ||
      node.server?.toLowerCase().includes(search)
    )
  }

  // Filter by type
  if (filterType.value > 0) {
    result = result.filter(node => node.type === filterType.value)
  }

  return result
})

// Methods
const fetchNodes = async () => {
  try {
    loading.value = true

    const response = await handleApiResponse(api.api.nodes.get()) as any
    nodes.value = response.nodes || []
    userClass.value = response.user_class || 0
    userNodeGroup.value = response.user_node_group || 0

    // Get user name from auth
    userName.value = auth.getUserName() || 'User'

  } catch (error: any) {
    console.error('Failed to fetch nodes:', error)
    ElMessage.error(error.message || '获取节点列表失败')

    if (error.message?.includes('Authentication')) {
      auth.logout()
    }
  } finally {
    loading.value = false
  }
}

const refreshNodes = () => {
  fetchNodes()
  ElMessage.success('节点列表已刷新')
}

const showNodeDetail = (node: any) => {
  selectedNode.value = node
  dialogVisible.value = true
}

const getNodeTypeColor = (type: number) => {
  const colors: Record<number, string> = {
    1: 'primary',
    2: 'success',
    11: 'warning',
  }
  return colors[type] || 'info'
}

const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

const copyNodeConfig = () => {
  if (!selectedNode.value) return
  
  const config = `
节点名称: ${selectedNode.value.name}
服务器地址: ${selectedNode.value.server}
加密方式: ${selectedNode.value.method}
类型: ${formatNodeType(selectedNode.value.type)}
流量倍率: ${selectedNode.value.traffic_rate}x
  `.trim()
  
  copyText(config)
}

const goBack = () => {
  window.location.href = '/user/dashboard.html'
}

const goToDashboard = () => {
  window.location.href = '/user/dashboard.html'
}

const handleLogout = () => {
  auth.logout()
}

// Lifecycle
onMounted(() => {
  // Check auth
  if (!auth.isLoggedIn()) {
    auth.logout()
    return
  }
  
  // Fetch nodes
  fetchNodes()
})
</script>

<style scoped>
.nodes-container {
  min-height: 100vh;
  background: #f5f7fa;
}

.nodes-header {
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

.nodes-main {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.stats-cards {
  margin-bottom: 20px;
}

.stat-card {
  margin-bottom: 20px;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 15px;
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.stat-icon.total {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-icon.class {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-icon.group {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-info {
  flex: 1;
}

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

.filter-card {
  margin-bottom: 20px;
}

.nodes-table-card {
  margin-bottom: 20px;
}

.node-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.empty-state {
  padding: 40px 0;
}

.copy-text {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: color 0.3s;
}

.copy-text:hover {
  color: #409eff;
}

.node-detail {
  padding: 10px 0;
}

/* Responsive */
@media (max-width: 768px) {
  .header-content {
    padding: 0 10px;
  }
  
  .nodes-main {
    padding: 10px;
  }
  
  .stat-value {
    font-size: 20px;
  }
}
</style>
