<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">用户管理</h1>
    </div>

    <!-- 搜索栏 -->
    <el-card class="search-card" shadow="never">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="用户名">
          <el-input v-model="searchForm.username" placeholder="请输入用户名" clearable />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="searchForm.email" placeholder="请输入邮箱" clearable />
        </el-form-item>
        <el-form-item label="用户组">
          <el-select v-model="searchForm.group" placeholder="请选择用户组" clearable>
            <el-option label="全部" :value="0" />
            <el-option label="1组" :value="1" />
            <el-option label="2组" :value="2" />
            <el-option label="3组" :value="3" />
            <el-option label="4组" :value="4" />
            <el-option label="5组" :value="5" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 用户列表 -->
    <el-card class="table-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>用户列表</span>
          <el-button type="primary" size="small" @click="handleAdd">添加用户</el-button>
        </div>
      </template>
      <el-table
        :data="tableData"
        v-loading="loading"
        stripe
        border
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="user_name" label="用户名" width="150" />
        <el-table-column prop="email" label="邮箱" width="200" />
        <el-table-column prop="node_group" label="用户组" width="100">
          <template #default="{ row }">
            <el-tag :type="getGroupType(row.node_group)">G{{ row.node_group }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="transfer_enable" label="总流量" width="150">
          <template #default="{ row }">
            {{ formatBytes(row.transfer_enable) }}
          </template>
        </el-table-column>
        <el-table-column prop="used_traffic" label="已用流量" width="150">
          <template #default="{ row }">
            {{ formatBytes((row.u || 0) + (row.d || 0)) }}
          </template>
        </el-table-column>
        <el-table-column prop="class" label="VIP等级" width="100">
          <template #default="{ row }">
            <el-tag type="success">V{{ row.class }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="expire_in" label="过期时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.expire_in) }}
          </template>
        </el-table-column>
        <el-table-column prop="is_admin" label="管理员" width="100">
          <template #default="{ row }">
            <el-tag :type="row.is_admin ? 'warning' : 'info'">
              {{ row.is_admin ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" size="small" link @click="handleDelete(row)">删除</el-button>
            <el-button type="warning" size="small" link @click="handleResetPassword(row)">
              重置密码
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
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="用户名" prop="user_name">
          <el-input v-model="form.user_name" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="密码" prop="pass" v-if="!form.id">
          <el-input v-model="form.pass" type="password" placeholder="请输入密码" />
        </el-form-item>
        <el-form-item label="用户组" prop="node_group">
          <el-select v-model="form.node_group" placeholder="请选择用户组">
            <el-option label="1组" :value="1" />
            <el-option label="2组" :value="2" />
            <el-option label="3组" :value="3" />
            <el-option label="4组" :value="4" />
            <el-option label="5组" :value="5" />
          </el-select>
        </el-form-item>
        <el-form-item label="VIP等级" prop="class">
          <el-select v-model="form.class" placeholder="请选择VIP等级">
            <el-option label="V0" :value="0" />
            <el-option label="V1" :value="1" />
            <el-option label="V2" :value="2" />
            <el-option label="V3" :value="3" />
            <el-option label="V4" :value="4" />
            <el-option label="V5" :value="5" />
          </el-select>
        </el-form-item>
        <el-form-item label="流量额度" prop="transfer_enable">
          <el-input-number
            v-model="form.transfer_enable"
            :min="0"
            :step="1073741824"
            :formatter="(val: number) => formatBytes(val)"
          />
        </el-form-item>
        <el-form-item label="过期时间" prop="expire_in">
          <el-date-picker
            v-model="form.expire_in"
            type="datetime"
            placeholder="选择过期时间"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
        <el-form-item label="管理员" prop="is_admin">
          <el-switch v-model="form.is_admin" />
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

// 搜索表单
const searchForm = reactive({
  username: '',
  email: '',
  group: 0,
})

// 表格数据
const tableData = ref<any[]>([])
const loading = ref(false)
const selectedRows = ref<any[]>([])

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
  user_name: '',
  email: '',
  pass: '',
  node_group: 1,
  class: 0,
  transfer_enable: 0,
  expire_in: '',
  is_admin: false,
})

// 表单验证规则
const rules = {
  user_name: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' },
  ],
  pass: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  node_group: [{ required: true, message: '请选择用户组', trigger: 'change' }],
  class: [{ required: true, message: '请选择VIP等级', trigger: 'change' }],
}

// 格式化字节
const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
}

// 格式化日期
const formatDate = (date: string | number) => {
  if (!date) return '永久'
  const timestamp = typeof date === 'number' ? date : parseInt(date)
  return new Date(timestamp * 1000).toLocaleString('zh-CN')
}

// 获取用户组标签类型
const getGroupType = (group: number) => {
  const types = ['info', 'success', 'warning', 'danger']
  return types[group] || 'info'
}

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    // TODO: 调用API获取用户列表
    // const response = await axios.get('/api/admin/user', {
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
  searchForm.username = ''
  searchForm.email = ''
  searchForm.group = 0
  handleSearch()
}

// 添加
const handleAdd = () => {
  dialogTitle.value = '添加用户'
  Object.assign(form, {
    id: 0,
    user_name: '',
    email: '',
    pass: '',
    node_group: 1,
    class: 0,
    transfer_enable: 0,
    expire_in: '',
    is_admin: false,
  })
  dialogVisible.value = true
}

// 编辑
const handleEdit = (row: any) => {
  dialogTitle.value = '编辑用户'
  Object.assign(form, row)
  dialogVisible.value = true
}

// 删除
const handleDelete = (row: any) => {
  ElMessageBox.confirm('确定要删除该用户吗?', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    try {
      // TODO: 调用API删除用户
      // await axios.delete(`/api/admin/user/${row.id}`)
      ElMessage.success('删除成功')
      loadData()
    } catch (error) {
      ElMessage.error('删除失败')
    }
  })
}

// 重置密码
const handleResetPassword = (row: any) => {
  ElMessageBox.prompt('请输入新密码', '重置密码', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputPattern: /.+/,
    inputErrorMessage: '密码不能为空',
  }).then(async ({ value }) => {
    try {
      // TODO: 调用API重置密码
      // await axios.post(`/api/admin/user/${row.id}/reset-password`, { password: value })
      ElMessage.success('密码重置成功')
    } catch (error) {
      ElMessage.error('密码重置失败')
    }
  })
}

// 提交表单
const handleSubmit = async () => {
  await formRef.value.validate()
  try {
    // TODO: 调用API保存用户
    // if (form.id) {
    //   await axios.put(`/api/admin/user/${form.id}`, form)
    // } else {
    //   await axios.post('/api/admin/user', form)
    // }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadData()
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

// 多选
const handleSelectionChange = (selection: any[]) => {
  selectedRows.value = selection
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
