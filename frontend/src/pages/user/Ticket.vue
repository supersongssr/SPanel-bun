<template>
  <div class="ticket-container">
    <!-- Header -->
    <div class="ticket-header">
      <h1>工单系统</h1>
      <el-button type="primary" @click="showCreateDialog = true" :icon="Plus">
        新建工单
      </el-button>
    </div>

    <!-- Ticket List -->
    <el-card class="ticket-list-card" v-loading="loading">
      <template #header>
        <span>我的工单</span>
      </template>

      <el-table :data="tickets" stripe @row-click="viewTicket" style="cursor: pointer;">
        <el-table-column prop="title" label="标题" width="300" />
        <el-table-column prop="lastMessage" label="最后消息" show-overflow-tooltip />
        <el-table-column prop="replyCount" label="回复数" width="100" align="center" />
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status ? 'success' : 'info'" size="small">
              {{ row.status ? '开启' : '关闭' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastMessageTime" label="最后更新" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.lastMessageTime) }}
          </template>
        </el-table-column>
      </el-table>

      <!-- Pagination -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next"
          @size-change="loadTickets"
          @current-change="loadTickets"
        />
      </div>
    </el-card>

    <!-- Ticket Detail Dialog -->
    <el-dialog
      v-model="showDetailDialog"
      :title="currentTicket?.title || '工单详情'"
      width="800px"
      @close="handleCloseDetail"
    >
      <div v-if="currentTicket" class="ticket-detail">
        <!-- Status Bar -->
        <div class="status-bar">
          <el-tag :type="currentTicket.status ? 'success' : 'info'" size="large">
            {{ currentTicket.status ? '开启中' : '已关闭' }}
          </el-tag>
          <el-button
            v-if="currentTicket.status"
            type="danger"
            size="small"
            @click="closeTicket"
            :icon="Close"
          >
            关闭工单
          </el-button>
        </div>

        <!-- Timeline -->
        <div class="conversation-timeline">
          <el-timeline>
            <el-timeline-item
              v-for="message in messages"
              :key="message.id"
              :timestamp="formatDateTime(message.datetime)"
              placement="top"
              :type="message.isAdmin ? 'primary' : 'success'"
            >
              <div class="message-content">
                <div class="message-header">
                  <el-tag :type="message.isAdmin ? 'primary' : 'success'" size="small">
                    {{ message.isAdmin ? '管理员' : '我' }}
                  </el-tag>
                </div>
                <div class="message-text">{{ message.content }}</div>
              </div>
            </el-timeline-item>
          </el-timeline>
        </div>

        <!-- Reply Box -->
        <div class="reply-box" v-if="currentTicket.status">
          <el-input
            v-model="replyContent"
            type="textarea"
            :rows="3"
            placeholder="输入回复内容..."
            @keyup.ctrl.enter="sendReply"
          />
          <div class="reply-actions">
            <el-button
              type="primary"
              @click="sendReply"
              :loading="replying"
              :disabled="!replyContent.trim()"
            >
              发送回复 (Ctrl+Enter)
            </el-button>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- Create Ticket Dialog -->
    <el-dialog
      v-model="showCreateDialog"
      title="新建工单"
      width="600px"
      @close="handleCloseCreate"
    >
      <el-form :model="createForm" :rules="createRules" ref="createFormRef" label-width="80px">
        <el-form-item label="标题" prop="title">
          <el-input
            v-model="createForm.title"
            placeholder="请输入工单标题"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input
            v-model="createForm.content"
            type="textarea"
            :rows="6"
            placeholder="请详细描述您遇到的问题"
            maxlength="1000"
            show-word-limit
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="createTicket" :loading="creating">
          提交
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Close } from '@element-plus/icons-vue'
import { auth } from '@/shared/utils/auth'

// State
const tickets = ref<any[]>([])
const currentTicket = ref<any>(null)
const messages = ref<any[]>([])
const loading = ref(false)
const showDetailDialog = ref(false)
const showCreateDialog = ref(false)
const replying = ref(false)
const creating = ref(false)
const replyContent = ref('')

// Pagination
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

// Create form
const createForm = reactive({
  title: '',
  content: '',
})

const createFormRef = ref()
const createRules = {
  title: [
    { required: true, message: '请输入标题', trigger: 'blur' },
    { min: 5, max: 100, message: '长度在 5 到 100 个字符', trigger: 'blur' },
  ],
  content: [
    { required: true, message: '请输入内容', trigger: 'blur' },
    { min: 10, max: 1000, message: '长度在 10 到 1000 个字符', trigger: 'blur' },
  ],
}

// Load tickets
const loadTickets = async () => {
  loading.value = true
  try {
    const token = auth.getToken()
    const response = await fetch(`/api/user/tickets?page=${pagination.page}&pageSize=${pagination.pageSize}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to load tickets')
    }

    const data = await response.json()
    tickets.value = data.tickets || []
    pagination.total = data.pagination?.total || 0
  } catch (error: any) {
    console.error('Load tickets error:', error)
    ElMessage.error(error.message || '加载工单失败')
  } finally {
    loading.value = false
  }
}

// View ticket details
const viewTicket = async (row: any) => {
  try {
    const token = auth.getToken()
    const response = await fetch(`/api/user/tickets/${row.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to load ticket details')
    }

    const data = await response.json()
    currentTicket.value = data.ticket
    messages.value = data.messages || []
    showDetailDialog.value = true
  } catch (error: any) {
    console.error('Load ticket details error:', error)
    ElMessage.error(error.message || '加载工单详情失败')
  }
}

// Send reply
const sendReply = async () => {
  if (!replyContent.value.trim()) {
    ElMessage.warning('请输入回复内容')
    return
  }

  try {
    replying.value = true
    const token = auth.getToken()
    const response = await fetch(`/api/user/tickets/${currentTicket.value.id}/reply`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: replyContent.value.trim(),
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to send reply')
    }

    ElMessage.success('回复成功')
    replyContent.value = ''

    // Reload ticket details
    await viewTicket(currentTicket.value)

    // Reload ticket list
    await loadTickets()
  } catch (error: any) {
    console.error('Send reply error:', error)
    ElMessage.error(error.message || '回复失败')
  } finally {
    replying.value = false
  }
}

// Close ticket
const closeTicket = async () => {
  try {
    await ElMessageBox.confirm('确定要关闭此工单吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    const token = auth.getToken()
    const response = await fetch(`/api/user/tickets/${currentTicket.value.id}/close`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to close ticket')
    }

    ElMessage.success('工单已关闭')
    currentTicket.value.status = false

    // Reload ticket list
    await loadTickets()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Close ticket error:', error)
      ElMessage.error(error.message || '关闭工单失败')
    }
  }
}

// Create ticket
const createTicket = async () => {
  await createFormRef.value.validate()

  try {
    creating.value = true
    const token = auth.getToken()
    const response = await fetch('/api/user/tickets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createForm),
    })

    if (!response.ok) {
      throw new Error('Failed to create ticket')
    }

    ElMessage.success('工单创建成功')
    showCreateDialog.value = false

    // Reset form
    createForm.title = ''
    createForm.content = ''

    // Reload ticket list
    await loadTickets()
  } catch (error: any) {
    console.error('Create ticket error:', error)
    ElMessage.error(error.message || '创建工单失败')
  } finally {
    creating.value = false
  }
}

// Close dialogs
const handleCloseDetail = () => {
  currentTicket.value = null
  messages.value = []
  replyContent.value = ''
}

const handleCloseCreate = () => {
  createForm.title = ''
  createForm.content = ''
}

// Format datetime
const formatDateTime = (date: string | null) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

// Lifecycle
onMounted(() => {
  if (!auth.isLoggedIn()) {
    auth.logout()
    return
  }

  loadTickets()
})
</script>

<style scoped>
.ticket-container {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.ticket-header {
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ticket-header h1 {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
}

.ticket-list-card {
  margin-bottom: 20px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.ticket-detail {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 4px;
}

.conversation-timeline {
  max-height: 500px;
  overflow-y: auto;
  padding: 20px;
  background: #fafafa;
  border-radius: 4px;
}

.message-content {
  padding: 12px;
  background: white;
  border-radius: 4px;
  border-left: 3px solid #409eff;
}

.message-header {
  margin-bottom: 8px;
}

.message-text {
  white-space: pre-wrap;
  word-break: break-word;
  color: #303133;
  line-height: 1.6;
}

.reply-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.reply-actions {
  display: flex;
  justify-content: flex-end;
}

/* Responsive */
@media (max-width: 768px) {
  .ticket-container {
    padding: 12px;
  }

  .ticket-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .ticket-header h1 {
    font-size: 20px;
  }
}
</style>
