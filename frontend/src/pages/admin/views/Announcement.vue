<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">公告管理</h1>
    </div>

    <!-- 公告列表 -->
    <el-card class="table-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>公告列表</span>
          <el-button type="primary" size="small" @click="handleAdd">添加公告</el-button>
        </div>
      </template>
      <el-table :data="tableData" v-loading="loading" stripe border style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="title" label="公告标题" width="300" />
        <el-table-column prop="content" label="公告内容" show-overflow-tooltip />
        <el-table-column prop="date" label="发布日期" width="180" />
        <el-table-column prop="priority" label="优先级" width="100">
          <template #default="{ row }">
            <el-tag :type="getPriorityType(row.priority)">
              {{ getPriorityText(row.priority) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status ? 'success' : 'danger'">
              {{ row.status ? '显示' : '隐藏' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" size="small" link @click="handleDelete(row)">删除</el-button>
            <el-button
              :type="row.status ? 'warning' : 'success'"
              size="small"
              link
              @click="handleToggleStatus(row)"
            >
              {{ row.status ? '隐藏' : '显示' }}
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

    <!-- 编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="700px"
      :close-on-click-modal="false"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="公告标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入公告标题" />
        </el-form-item>
        <el-form-item label="公告内容" prop="content">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="8"
            placeholder="请输入公告内容，支持HTML"
          />
        </el-form-item>
        <el-form-item label="优先级" prop="priority">
          <el-radio-group v-model="form.priority">
            <el-radio :label="1">低</el-radio>
            <el-radio :label="2">中</el-radio>
            <el-radio :label="3">高</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="发布日期" prop="date">
          <el-date-picker
            v-model="form.date"
            type="datetime"
            placeholder="选择发布日期"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-switch v-model="form.status" active-text="显示" inactive-text="隐藏" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

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
const dialogTitle = ref('')
const formRef = ref()

// 表单数据
const form = reactive({
  id: 0,
  title: '',
  content: '',
  priority: 2,
  date: '',
  status: true,
})

// 表单验证规则
const rules = {
  title: [{ required: true, message: '请输入公告标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入公告内容', trigger: 'blur' }],
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }],
  date: [{ required: true, message: '请选择发布日期', trigger: 'change' }],
}

// 获取优先级标签类型
const getPriorityType = (priority: number) => {
  const types: Record<number, string> = {
    1: 'info',
    2: 'warning',
    3: 'danger',
  }
  return types[priority] || 'info'
}

// 获取优先级文本
const getPriorityText = (priority: number) => {
  const texts: Record<number, string> = {
    1: '低',
    2: '中',
    3: '高',
  }
  return texts[priority] || '未知'
}

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    // TODO: 调用API获取公告列表
    // const response = await axios.get('/api/admin/announcement', {
    //   params: pagination
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

// 添加
const handleAdd = () => {
  dialogTitle.value = '添加公告'
  const now = new Date()
  form.date = now.toISOString().slice(0, 19).replace('T', ' ')
  Object.assign(form, {
    id: 0,
    title: '',
    content: '',
    priority: 2,
    date: form.date,
    status: true,
  })
  dialogVisible.value = true
}

// 编辑
const handleEdit = (row: any) => {
  dialogTitle.value = '编辑公告'
  Object.assign(form, row)
  dialogVisible.value = true
}

// 删除
const handleDelete = (row: any) => {
  ElMessageBox.confirm('确定要删除该公告吗?', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    try {
      // TODO: 调用API删除公告
      // await axios.delete(`/api/admin/announcement/${row.id}`)
      ElMessage.success('删除成功')
      loadData()
    } catch (error) {
      ElMessage.error('删除失败')
    }
  })
}

// 切换状态
const handleToggleStatus = (row: any) => {
  const action = row.status ? '隐藏' : '显示'
  ElMessageBox.confirm(`确定要${action}该公告吗?`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    try {
      // TODO: 调用API切换状态
      // await axios.put(`/api/admin/announcement/${row.id}/status`, { status: !row.status })
      ElMessage.success(`${action}成功`)
      loadData()
    } catch (error) {
      ElMessage.error(`${action}失败`)
    }
  })
}

// 提交表单
const handleSubmit = async () => {
  await formRef.value.validate()
  try {
    // TODO: 调用API保存公告
    // if (form.id) {
    //   await axios.put(`/api/admin/announcement/${form.id}`, form)
    // } else {
    //   await axios.post('/api/admin/announcement', form)
    // }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadData()
  } catch (error) {
    ElMessage.error('保存失败')
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

.table-card {
  margin-bottom: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
  font-size: 16px;
  color: #000000d9;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
