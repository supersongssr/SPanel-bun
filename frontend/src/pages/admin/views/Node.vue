<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">节点管理</h1>
    </div>

    <!-- 搜索栏 -->
    <el-card class="search-card" shadow="never">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="节点名称">
          <el-input v-model="searchForm.name" placeholder="请输入节点名称" clearable />
        </el-form-item>
        <el-form-item label="节点组">
          <el-select v-model="searchForm.group" placeholder="请选择节点组" clearable>
            <el-option label="全部" :value="0" />
            <el-option label="1组" :value="1" />
            <el-option label="2组" :value="2" />
            <el-option label="3组" :value="3" />
            <el-option label="4组" :value="4" />
            <el-option label="5组" :value="5" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable>
            <el-option label="全部" value="" />
            <el-option label="在线" value="1" />
            <el-option label="离线" value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 节点列表 -->
    <el-card class="table-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>节点列表</span>
          <el-button type="primary" size="small" @click="handleAdd">添加节点</el-button>
        </div>
      </template>
      <el-table
        :data="tableData"
        v-loading="loading"
        stripe
        border
        style="width: 100%"
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="节点名称" width="200" />
        <el-table-column prop="server" label="服务器地址" width="200" />
        <el-table-column prop="method" label="加密方式" width="120" />
        <el-table-column prop="protocol" label="协议" width="120" />
        <el-table-column prop="obfs" label="混淆" width="120" />
        <el-table-column prop="node_group" label="节点组" width="100">
          <template #default="{ row }">
            <el-tag :type="getGroupType(row.node_group)">G{{ row.node_group }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="traffic_rate" label="流量倍率" width="100">
          <template #default="{ row }">
            {{ row.traffic_rate }}x
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.online ? 'success' : 'danger'">
              {{ row.online ? '在线' : '离线' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="online_user" label="在线用户" width="100" />
        <el-table-column prop="mu_only" label="单端口" width="100">
          <template #default="{ row }">
            <el-tag :type="row.mu_only ? 'warning' : 'info'">
              {{ row.mu_only ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sort" label="排序" width="80" />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            {{ getNodeType(row.type) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="info" size="small" link @click="handleView(row)">查看</el-button>
            <el-button type="danger" size="small" link @click="handleDelete(row)">删除</el-button>
            <el-button type="warning" size="small" link @click="handleResetNode(row)">重置</el-button>
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
      width="800px"
      :close-on-click-modal="false"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="120px">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="基本信息" name="basic">
            <el-form-item label="节点名称" prop="name">
              <el-input v-model="form.name" placeholder="请输入节点名称" />
            </el-form-item>
            <el-form-item label="服务器地址" prop="server">
              <el-input v-model="form.server" placeholder="请输入服务器地址" />
            </el-form-item>
            <el-form-item label="端口" prop="server_port">
              <el-input-number v-model="form.server_port" :min="1" :max="65535" />
            </el-form-item>
            <el-form-item label="节点组" prop="node_group">
              <el-select v-model="form.node_group" placeholder="请选择节点组">
                <el-option label="1组" :value="1" />
                <el-option label="2组" :value="2" />
                <el-option label="3组" :value="3" />
                <el-option label="4组" :value="4" />
                <el-option label="5组" :value="5" />
              </el-select>
            </el-form-item>
            <el-form-item label="节点类型" prop="type">
              <el-select v-model="form.type" placeholder="请选择节点类型">
                <el-option label="Shadowsocks" :value="1" />
                <el-option label="V2Ray" :value="2" />
                <el-option label="Trojan" :value="3" />
                <el-option label="VNet" :value="4" />
              </el-select>
            </el-form-item>
            <el-form-item label="流量倍率" prop="traffic_rate">
              <el-input-number v-model="form.traffic_rate" :min="0" :step="0.1" :precision="1" />
            </el-form-item>
            <el-form-item label="排序" prop="sort">
              <el-input-number v-model="form.sort" :min="0" />
            </el-form-item>
          </el-tab-pane>

          <el-tab-pane label="连接设置" name="connection">
            <el-form-item label="加密方式" prop="method">
              <el-select v-model="form.method" placeholder="请选择加密方式">
                <el-option label="aes-128-gcm" value="aes-128-gcm" />
                <el-option label="aes-256-gcm" value="aes-256-gcm" />
                <el-option label="chacha20-ietf-poly1305" value="chacha20-ietf-poly1305" />
                <el-option label="xchacha20-ietf-poly1305" value="xchacha20-ietf-poly1305" />
              </el-select>
            </el-form-item>
            <el-form-item label="协议" prop="protocol">
              <el-input v-model="form.protocol" placeholder="请输入协议" />
            </el-form-item>
            <el-form-item label="混淆" prop="obfs">
              <el-input v-model="form.obfs" placeholder="请输入混淆" />
            </el-form-item>
            <el-form-item label="单端口多用户" prop="mu_only">
              <el-switch v-model="form.mu_only" />
            </el-form-item>
            <el-form-item label="单端口端口" prop="mu_port">
              <el-input-number v-model="form.mu_port" :min="1" :max="65535" />
            </el-form-item>
          </el-tab-pane>

          <el-tab-pane label="流量限制" name="traffic">
            <el-form-item label="启用流量限制" prop="node_speedlimit">
              <el-switch v-model="form.node_speedlimit" />
            </el-form-item>
            <el-form-item label="速率限制" prop="node_speedlimit_rate">
              <el-input-number
                v-model="form.node_speedlimit_rate"
                :min="0"
                :step="1"
              />
              <span class="unit-text">Mbps</span>
            </el-form-item>
            <el-form-item label="每用户速率限制">
              <el-switch v-model="form.speedlimit_enable" />
            </el-form-item>
            <el-form-item label="速率值">
              <el-input-number
                v-model="form.speedlimit_rate"
                :min="0"
                :step="1"
              />
              <span class="unit-text">Mbps</span>
            </el-form-item>
          </el-tab-pane>
        </el-tabs>
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
  name: '',
  group: 0,
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
const dialogTitle = ref('')
const formRef = ref()
const activeTab = ref('basic')

// 表单数据
const form = reactive({
  id: 0,
  name: '',
  server: '',
  server_port: 443,
  node_group: 1,
  type: 1,
  method: 'aes-256-gcm',
  protocol: '',
  obfs: '',
  traffic_rate: 1.0,
  sort: 0,
  mu_only: false,
  mu_port: 0,
  node_speedlimit: false,
  node_speedlimit_rate: 0,
  speedlimit_enable: false,
  speedlimit_rate: 0,
})

// 表单验证规则
const rules = {
  name: [{ required: true, message: '请输入节点名称', trigger: 'blur' }],
  server: [{ required: true, message: '请输入服务器地址', trigger: 'blur' }],
  server_port: [{ required: true, message: '请输入端口', trigger: 'blur' }],
  node_group: [{ required: true, message: '请选择节点组', trigger: 'change' }],
  type: [{ required: true, message: '请选择节点类型', trigger: 'change' }],
}

// 获取节点组标签类型
const getGroupType = (group: number) => {
  const types = ['info', 'success', 'warning', 'danger']
  return types[group] || 'info'
}

// 获取节点类型
const getNodeType = (type: number) => {
  const types: Record<number, string> = {
    1: 'Shadowsocks',
    2: 'V2Ray',
    3: 'Trojan',
    4: 'VNet',
  }
  return types[type] || '未知'
}

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    // TODO: 调用API获取节点列表
    // const response = await axios.get('/api/admin/node', {
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
  searchForm.name = ''
  searchForm.group = 0
  searchForm.status = ''
  handleSearch()
}

// 添加
const handleAdd = () => {
  dialogTitle.value = '添加节点'
  activeTab.value = 'basic'
  Object.assign(form, {
    id: 0,
    name: '',
    server: '',
    server_port: 443,
    node_group: 1,
    type: 1,
    method: 'aes-256-gcm',
    protocol: '',
    obfs: '',
    traffic_rate: 1.0,
    sort: 0,
    mu_only: false,
    mu_port: 0,
    node_speedlimit: false,
    node_speedlimit_rate: 0,
    speedlimit_enable: false,
    speedlimit_rate: 0,
  })
  dialogVisible.value = true
}

// 编辑
const handleEdit = (row: any) => {
  dialogTitle.value = '编辑节点'
  activeTab.value = 'basic'
  Object.assign(form, row)
  dialogVisible.value = true
}

// 查看
const handleView = (row: any) => {
  // TODO: 实现查看详情功能
  ElMessage.info('查看功能待实现')
}

// 删除
const handleDelete = (row: any) => {
  ElMessageBox.confirm('确定要删除该节点吗?', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    try {
      // TODO: 调用API删除节点
      // await axios.delete(`/api/admin/node/${row.id}`)
      ElMessage.success('删除成功')
      loadData()
    } catch (error) {
      ElMessage.error('删除失败')
    }
  })
}

// 重置节点
const handleResetNode = (row: any) => {
  ElMessageBox.confirm('确定要重置该节点的流量统计吗?', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    try {
      // TODO: 调用API重置节点
      // await axios.post(`/api/admin/node/${row.id}/reset`)
      ElMessage.success('重置成功')
      loadData()
    } catch (error) {
      ElMessage.error('重置失败')
    }
  })
}

// 提交表单
const handleSubmit = async () => {
  await formRef.value.validate()
  try {
    // TODO: 调用API保存节点
    // if (form.id) {
    //   await axios.put(`/api/admin/node/${form.id}`, form)
    // } else {
    //   await axios.post('/api/admin/node', form)
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

.unit-text {
  margin-left: 8px;
  color: #909399;
}
</style>
