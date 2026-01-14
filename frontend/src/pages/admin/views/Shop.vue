<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">商品管理</h1>
    </div>

    <!-- 商品列表 -->
    <el-card class="table-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>商品列表</span>
          <el-button type="primary" size="small" @click="handleAdd">添加商品</el-button>
        </div>
      </template>
      <el-table :data="tableData" v-loading="loading" stripe border style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="商品名称" width="200" />
        <el-table-column prop="content" label="商品内容" width="300" />
        <el-table-column prop="price" label="价格" width="120">
          <template #default="{ row }">
            <span class="price-text">{{ row.price }} 元</span>
          </template>
        </el-table-column>
        <el-table-column prop="traffic" label="流量" width="150" />
        <el-table-column prop="node_group" label="节点组" width="100">
          <template #default="{ row }">
            <el-tag :type="getGroupType(row.node_group)">G{{ row.node_group }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="class" label="VIP等级" width="100">
          <template #default="{ row }">
            <el-tag type="success">V{{ row.class }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="expire" label="有效期" width="120">
          <template #default="{ row }">
            {{ row.expire }} 天
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status ? 'success' : 'danger'">
              {{ row.status ? '上架' : '下架' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sort" label="排序" width="80" />
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
              {{ row.status ? '下架' : '上架' }}
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
      <el-form :model="form" :rules="rules" ref="formRef" label-width="120px">
        <el-form-item label="商品名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入商品名称" />
        </el-form-item>
        <el-form-item label="商品内容" prop="content">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="3"
            placeholder="请输入商品内容"
          />
        </el-form-item>
        <el-form-item label="商品类型" prop="type">
          <el-select v-model="form.type" placeholder="请选择商品类型">
            <el-option label="流量包" :value="1" />
            <el-option label="时间套餐" :value="2" />
            <el-option label="等级套餐" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="价格" prop="price">
          <el-input-number v-model="form.price" :min="0" :precision="2" :step="1" />
          <span class="unit-text">元</span>
        </el-form-item>
        <el-form-item label="流量" prop="traffic">
          <el-input-number v-model="form.traffic" :min="0" :step="1073741824" />
          <span class="unit-text">GB (可选)</span>
        </el-form-item>
        <el-form-item label="节点组" prop="node_group">
          <el-select v-model="form.node_group" placeholder="请选择节点组">
            <el-option label="全部" :value="0" />
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
        <el-form-item label="有效期" prop="expire">
          <el-input-number v-model="form.expire" :min="0" :step="1" />
          <span class="unit-text">天 (0表示永久)</span>
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number v-model="form.sort" :min="0" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-switch v-model="form.status" active-text="上架" inactive-text="下架" />
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
import { apiClient } from '@/shared/api/client'

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
  name: '',
  content: '',
  type: 1,
  price: 0,
  traffic: 0,
  node_group: 0,
  class: 0,
  expire: 0,
  sort: 0,
  status: true,
})

// 表单验证规则
const rules = {
  name: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
  content: [{ required: true, message: '请输入商品内容', trigger: 'blur' }],
  type: [{ required: true, message: '请选择商品类型', trigger: 'change' }],
  price: [{ required: true, message: '请输入价格', trigger: 'blur' }],
}

// 获取节点组标签类型
const getGroupType = (group: number) => {
  const types = ['info', 'success', 'warning', 'danger']
  return types[group] || 'info'
}

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    const response = await apiClient.admin.shop.get({
      query: {
        page: pagination.page,
        pageSize: pagination.pageSize,
      },
    })
    tableData.value = response.products || []
    pagination.total = response.pagination?.total || 0
  } catch (error: any) {
    ElMessage.error(error.message || '加载数据失败')
  } finally {
    loading.value = false
  }
}

// 添加
const handleAdd = () => {
  dialogTitle.value = '添加商品'
  Object.assign(form, {
    id: 0,
    name: '',
    content: '',
    type: 1,
    price: 0,
    traffic: 0,
    node_group: 0,
    class: 0,
    expire: 0,
    sort: 0,
    status: true,
  })
  dialogVisible.value = true
}

// 编辑
const handleEdit = (row: any) => {
  dialogTitle.value = '编辑商品'
  Object.assign(form, row)
  dialogVisible.value = true
}

// 删除
const handleDelete = async (row: any) => {
  ElMessageBox.confirm('确定要删除该商品吗?', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    try {
      await apiClient.admin.shop[':id']().delete({
        params: {
          id: row.id.toString(),
        },
      })
      ElMessage.success('删除成功')
      loadData()
    } catch (error: any) {
      ElMessage.error(error.message || '删除失败')
    }
  })
}

// 切换状态
const handleToggleStatus = async (row: any) => {
  const action = row.status ? '下架' : '上架'
  try {
    await ElMessageBox.confirm(`确定要${action}该商品吗?`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    await apiClient.admin.shop[':id']().put({
      params: {
        id: row.id.toString(),
      },
      body: {
        ...row,
        status: !row.status,
      },
    })
    ElMessage.success(`${action}成功`)
    loadData()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || `${action}失败`)
    }
  }
}

// 提交表单
const handleSubmit = async () => {
  await formRef.value.validate()
  try {
    // Build content object from form fields
    const content: any = {}
    if (form.traffic) content.traffic = `${form.traffic}GB`
    if (form.class) content.class = form.class
    if (form.expire) content.expire = `${form.expire}天`
    if (form.node_group) content.node_group = form.node_group

    const productData = {
      name: form.name,
      price: form.price,
      content: JSON.stringify(content),
      auto_renew: false,
      auto_reset_bandwidth: false,
      status: form.status,
    }

    if (form.id) {
      await apiClient.admin.shop[':id']().put({
        params: {
          id: form.id.toString(),
        },
        body: productData,
      })
    } else {
      await apiClient.admin.shop.post({
        body: productData,
      })
    }

    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadData()
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
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

.price-text {
  color: #f56c6c;
  font-weight: 500;
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
