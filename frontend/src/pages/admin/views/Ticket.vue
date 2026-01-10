<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">工单管理</h1>
    </div>

    <!-- 搜索栏 -->
    <el-card class="search-card" shadow="never">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="工单标题">
          <el-input v-model="searchForm.title" placeholder="请输入工单标题" clearable />
        </el-form-item>
        <el-form-item label="用户名">
          <el-input v-model="searchForm.username" placeholder="请输入用户名" clearable />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable>
            <el-option label="全部" value="" />
            <el-option label="开放中" value="1" />
            <el-option label="已关闭" value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 工单列表 -->
    <el-card class="table-card" shadow="never">
      <el-table :data="tableData" v-loading="loading" stripe border style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="title" label="工单标题" width="300" />
        <el-table-column prop="user_name" label="提交用户" width="150" />
        <el-table-column prop="userid" label="用户ID" width="100" />
        <el-table-column prop="datetime" label="提交时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.datetime) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status ? 'success' : 'info'">
              {{ row.status ? '开放中' : '已关闭' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" link @click="handleView(row)">查看</el-button>
            <el-button
              v-if="row.status"
              type="danger"
              size="small"
              link
              @click="handleClose(row)"
            >
              关闭
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 查看工单对话框 -->
    <el-dialog v-model="dialogVisible" title="工单详情" width="800px">
      <div class="ticket-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="工单ID">{{ ticketDetail.id }}</el-descriptions-item>
          <el-descriptions-item label="提交用户">
            {{ ticketDetail.user_name }}
          </el-descriptions-item>
          <el-descriptions-item label="工单标题" :span="2">
            {{ ticketDetail.title }}
          </el-descriptions-item>
          <el-descriptions-item label="提交时间" :span="2">
            {{ formatDate(ticketDetail.datetime) }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="ticketDetail.status ? 'success' : 'info'">
              {{ ticketDetail.status ? '开放中' : '已关闭' }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <div class="ticket-content">
          <div class="content-label">工单内容:</div>
          <div class="content-text">{{ ticketDetail.content }}</div>
        </div>

        <!-- 回复列表 -->
        <div class="ticket-reply">
          <div class="reply-label">回复记录:</div>
          <el-timeline>
            <el-timeline-item
              v-for="reply in replyList"
              :key="reply.id"
              :timestamp="formatDate(reply.datetime)"
              placement="top"
            >
              <el-card>
                <div class="reply-header">
                  <span class="reply-user">{{ reply.name }}</span>
                  <el-tag size="small" :type="reply.is_admin ? 'warning' : 'info'">
                    {{ reply.is_admin ? '管理员' : '用户' }}
                  </el-tag>
                </div>
                <div class="reply-content">{{ reply.content }}</div>
              </el-card>
            </el-timeline-item>
          </el-timeline>
        </div>

        <!-- 回复输入框 -->
        <div class="ticket-reply-form">
          <el-input
            v-model="replyForm.content"
            type="textarea"
            :rows="4"
            placeholder="请输入回复内容"
          />
          <div class="reply-actions">
            <el-button type="primary" @click="handleReply">回复</el-button>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// 搜索表单
const searchForm = reactive({
  title: '',
  username: '',
  status: '',
})

// 表格数据
const tableData = ref([])
const loading = ref(false)

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

// 对话框
const dialogVisible = ref(false)

// 工单详情
const ticketDetail = ref({
  id: 0,
  title: '',
  user_name: '',
  userid: 0,
  content: '',
  datetime: '',
  status: false,
})

// 回复列表
const replyList = ref<any[]>([])

// 回复表单
const replyForm = reactive({
  content: '',
})

// 格式化日期
const formatDate = (date: string | number) => {
  if (!date) return '-'
  const timestamp = typeof date === 'number' ? date : parseInt(date)
  return new Date(timestamp * 1000).toLocaleString('zh-CN')
}

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    // TODO: 调用API获取工单列表
    // const response = await axios.get('/api/admin/ticket', {
    //   params: { ...searchForm, ...pagination }
    // })
    // tableData.value = response.data.data
    // pagination.total = response.data.total

    // 模拟数据
    tableData.value = []
    pagination.total = 0
  } catch (error) {
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  loadData()
}

// 重置
const handleReset = () => {
  searchForm.title = ''
  searchForm.username = ''
  searchForm.status = ''
  handleSearch()
}

// 查看工单
const handleView = async (row: any) => {
  try {
    // TODO: 调用API获取工单详情
    // const response = await axios.get(`/api/admin/ticket/${row.id}`)
    // ticketDetail.value = response.data.ticket
    // replyList.value = response.data.replies

    // 模拟数据
    ticketDetail.value = row
    replyList.value = []

    dialogVisible.value = true
  } catch (error) {
    ElMessage.error('加载工单详情失败')
  }
}

// 关闭工单
const handleClose = (row: any) => {
  ElMessageBox.confirm('确定要关闭该工单吗?', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    try {
      // TODO: 调用API关闭工单
      // await axios.put(`/api/admin/ticket/${row.id}/close`)
      ElMessage.success('工单已关闭')
      loadData()
    } catch (error) {
      ElMessage.error('关闭失败')
    }
  })
}

// 回复工单
const handleReply = async () => {
  if (!replyForm.content.trim()) {
    ElMessage.warning('请输入回复内容')
    return
  }

  try {
    // TODO: 调用API回复工单
    // await axios.post(`/api/admin/ticket/${ticketDetail.value.id}/reply`, {
    //   content: replyForm.content
    // })
    ElMessage.success('回复成功')
    replyForm.content = ''

    // 重新加载工单详情
    handleView(ticketDetail.value)
  } catch (error) {
    ElMessage.error('回复失败')
  }
}

// 分页
const handleSizeChange = () => {
  loadData()
}

const handleCurrentChange = () => {
  loadData()
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.page-container {
  background: #fff;
  padding: 24px;
  border-radius: 4px;
  min-height: calc(100vh - 120px);
}

.page-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.page-title {
  font-size: 20px;
  font-weight: 500;
  color: #000000d9;
  margin: 0;
}

.search-card {
  margin-bottom: 24px;
}

.table-card {
  margin-bottom: 24px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.ticket-detail {
  padding: 20px 0;
}

.ticket-content {
  margin-top: 24px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 4px;
}

.content-label {
  font-weight: 500;
  margin-bottom: 12px;
  color: #000000d9;
}

.content-text {
  line-height: 1.6;
  color: #606266;
  white-space: pre-wrap;
}

.ticket-reply {
  margin-top: 24px;
}

.reply-label {
  font-weight: 500;
  margin-bottom: 16px;
  color: #000000d9;
}

.reply-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.reply-user {
  font-weight: 500;
  color: #000000d9;
}

.reply-content {
  line-height: 1.6;
  color: #606266;
  white-space: pre-wrap;
}

.ticket-reply-form {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;
}

.reply-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}
</style>
