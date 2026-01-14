<template>
  <div class="user-management-container">
    <!-- Header -->
    <el-header class="admin-header">
      <div class="header-content">
        <h1 class="title">
          <el-icon><User /></el-icon>
          用户管理
        </h1>
        <div class="user-info">
          <el-tag type="danger" size="large">管理员</el-tag>
          <el-button @click="goBack" :icon="ArrowLeft">返回</el-button>
          <el-dropdown>
            <span class="user-name">
              <el-icon><User /></el-icon>
              {{ adminName }}
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
    <el-main class="admin-main">
      <!-- Search and Filter -->
      <el-card class="filter-card">
        <el-row :gutter="20">
          <el-col :xs="24" :sm="12" :md="8">
            <el-input
              v-model="searchText"
              placeholder="搜索邮箱或用户名"
              :prefix-icon="Search"
              clearable
              @change="handleSearch"
            />
          </el-col>
          <el-col :xs="24" :sm="12" :md="8">
            <el-button type="primary" @click="fetchUsers" :icon="Refresh">
              刷新列表
            </el-button>
            <el-button @click="resetFilters" :icon="RefreshLeft">
              重置筛选
            </el-button>
          </el-col>
        </el-row>
      </el-card>

      <!-- Users Table -->
      <el-card class="table-card">
        <el-table
          :data="displayUsers"
          v-loading="loading"
          stripe
          style="width: 100%"
          :default-sort="{ prop: 'id', order: 'descending' }"
        >
          <el-table-column prop="id" label="ID" width="80" sortable />
          <el-table-column prop="email" label="邮箱" min-width="200" />
          <el-table-column prop="user_name" label="用户名" min-width="150" />
          <el-table-column prop="class" label="等级" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="row.is_admin ? 'danger' : 'primary'" size="small">
                {{ row.is_admin ? 'Admin' : row.class }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="money" label="余额" width="120" align="right">
            <template #default="{ row }">
              {{ formatMoney(row.money) }}
            </template>
          </el-table-column>
          <el-table-column prop="used_total" label="已用流量" width="150" align="right">
            <template #default="{ row }">
              {{ formatBytes(row.used_total) }}
            </template>
          </el-table-column>
          <el-table-column prop="transfer_enable" label="流量上限" width="150" align="right">
            <template #default="{ row }">
              {{ formatBytes(row.transfer_enable) }}
            </template>
          </el-table-column>
          <el-table-column prop="expire_in" label="过期时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.expire_in) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button
                type="primary"
                size="small"
                @click="showEditDialog(row)"
                :icon="Edit"
              >
                编辑
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- Pagination -->
        <div class="pagination-container">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[20, 50, 100]"
            :total="totalUsers"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </el-card>
    </el-main>

    <!-- Edit User Dialog -->
    <el-dialog
      v-model="editDialogVisible"
      :title="`编辑用户 - ${selectedUser?.user_name}`"
      width="600px"
      @close="resetEditForm"
    >
      <el-form
        v-if="selectedUser"
        :model="editForm"
        label-width="120px"
        ref="editFormRef"
      >
        <el-form-item label="用户 ID">
          <el-input v-model="selectedUser.id" disabled />
        </el-form-item>

        <el-form-item label="邮箱">
          <el-input v-model="editForm.email" />
        </el-form-item>

        <el-form-item label="用户名">
          <el-input v-model="editForm.user_name" />
        </el-form-item>

        <el-form-item label="等级">
          <el-input-number v-model="editForm.class" :min="0" :max="255" />
        </el-form-item>

        <el-form-item label="节点组">
          <el-input-number v-model="editForm.node_group" :min="0" :max="255" />
        </el-form-item>

        <el-form-item label="余额">
          <el-input-number v-model="editForm.money" :precision="2" :step="1" />
        </el-form-item>

        <el-form-item label="流量上限 (Bytes)">
          <el-input-number v-model="editForm.transfer_enable" :step="1073741824" />
          <div class="form-tip">
            当前值: {{ formatBytes(editForm.transfer_enable) }}
          </div>
        </el-form-item>

        <el-form-item label="上传流量 (Bytes)">
          <el-input-number v-model="editForm.u" :min="0" />
          <div class="form-tip">
            当前值: {{ formatBytes(editForm.u) }}
          </div>
        </el-form-item>

        <el-form-item label="下载流量 (Bytes)">
          <el-input-number v-model="editForm.d" :min="0" />
          <div class="form-tip">
            当前值: {{ formatBytes(editForm.d) }}
          </div>
        </el-form-item>

        <el-form-item label="过期时间">
          <el-date-picker
            v-model="editForm.expire_in"
            type="datetime"
            placeholder="选择日期时间"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DDTHH:mm:ss"
          />
        </el-form-item>

        <el-form-item label="加密方式">
          <el-select v-model="editForm.method">
            <el-option label="rc4-md5" value="rc4-md5" />
            <el-option label="aes-256-gcm" value="aes-256-gcm" />
            <el-option label="chacha20-ietf-poly1305" value="chacha20-ietf-poly1305" />
          </el-select>
        </el-form-item>

        <el-form-item label="管理员权限">
          <el-switch
            v-model="editForm.is_admin"
            :disabled="selectedUser.id === currentUserId"
          />
          <div v-if="selectedUser.id === currentUserId" class="form-tip warning">
            不能修改自己的管理员权限
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveUser" :loading="saving">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  User,
  ArrowLeft,
  ArrowDown,
  SwitchButton,
  Search,
  Refresh,
  RefreshLeft,
  Edit,
  Monitor,
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api, handleApiResponse } from '@/shared/api/eden-client'
import { auth } from '@/shared/utils/auth'
import { checkAuth } from '@/shared/utils/router-guard'
import { formatBytes, formatMoney, formatDate } from '@/shared/utils/format'

// Data
const users = ref<any[]>([])
const displayUsers = ref<any[]>([])
const loading = ref(false)
const searchText = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const totalUsers = ref(0)

// Edit dialog
const editDialogVisible = ref(false)
const selectedUser = ref<any>(null)
const editForm = ref<any>({})
const saving = ref(false)
const currentUserId = ref(0)

// Computed
const adminName = computed(() => {
  return auth.getUserName() || 'Admin'
})

// Methods
const fetchUsers = async () => {
  try {
    loading.value = true

    const response = await handleApiResponse(
      api.api.admin.users.get({
        query: {
          page: currentPage.value.toString(),
          pageSize: pageSize.value.toString(),
          search: searchText.value || undefined,
        },
      })
    ) as any

    users.value = response.users
    displayUsers.value = response.users
    totalUsers.value = response.pagination.total

    console.log(`Loaded ${response.users.length} users, total: ${response.pagination.total}`)
  } catch (error: any) {
    console.error('Failed to fetch users:', error)
    ElMessage.error(error.message || '获取用户列表失败')

    if (error.message?.includes('Authentication')) {
      auth.logout()
    }
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  currentPage.value = 1
  fetchUsers()
}

const resetFilters = () => {
  searchText.value = ''
  currentPage.value = 1
  fetchUsers()
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  fetchUsers()
}

const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
  fetchUsers()
}

const showEditDialog = (user: any) => {
  selectedUser.value = user
  editForm.value = {
    email: user.email,
    user_name: user.user_name,
    money: parseFloat(user.money),
    class: user.class,
    node_group: user.node_group,
    transfer_enable: parseInt(user.transfer_enable),
    u: parseInt(user.used_upload),
    d: parseInt(user.used_download),
    expire_in: user.expire_in ? new Date(user.expire_in) : null,
    method: user.method,
    protocol: user.protocol,
    obfs: user.obfs,
    is_admin: user.is_admin,
  }
  editDialogVisible.value = true
}

const resetEditForm = () => {
  editForm.value = {}
  selectedUser.value = null
}

const saveUser = async () => {
  try {
    saving.value = true

    // Convert date to ISO string
    const expireIn = editForm.value.expire_in
      ? new Date(editForm.value.expire_in).toISOString()
      : null

    const updateData = {
      email: editForm.value.email,
      user_name: editForm.value.user_name,
      money: editForm.value.money,
      class: editForm.value.class,
      node_group: editForm.value.node_group,
      transfer_enable: editForm.value.transfer_enable.toString(),
      u: editForm.value.u.toString(),
      d: editForm.value.d.toString(),
      expire_in: expireIn,
      method: editForm.value.method,
      protocol: editForm.value.protocol,
      obfs: editForm.value.obfs,
      is_admin: editForm.value.is_admin,
    }

    await handleApiResponse(
      api.api.admin.users(selectedUser.value.id).put({
        body: updateData,
      })
    )

    ElMessage.success('用户信息已更新')
    editDialogVisible.value = false
    fetchUsers()
  } catch (error: any) {
    console.error('Failed to update user:', error)
    ElMessage.error(error.message || '更新用户失败')
  } finally {
    saving.value = false
  }
}

const goBack = () => {
  window.location.href = '/admin/index.html'
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

  if (!auth.isAdmin()) {
    alert('需要管理员权限才能访问此页面')
    window.location.href = '/index.html'
    return
  }

  currentUserId.value = auth.getUserId() || 0

  // Fetch users
  fetchUsers()
})
</script>

<style scoped>
.user-management-container {
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

.user-info {
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

.filter-card {
  margin-bottom: 20px;
}

.table-card {
  margin-bottom: 20px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

.form-tip.warning {
  color: #f56c6c;
}

/* Responsive */
@media (max-width: 768px) {
  .header-content {
    padding: 0 10px;
  }

  .admin-main {
    padding: 10px;
  }

  .user-info {
    gap: 5px;
  }
}
</style>
