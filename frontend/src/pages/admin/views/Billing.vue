<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">财务管理</h1>
    </div>

    <!-- Tabs -->
    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <!-- Purchase History Tab -->
      <el-tab-pane label="购买记录" name="bought">
        <el-card class="table-card" shadow="never">
          <template #header>
            <span>购买记录</span>
          </template>

          <el-table :data="boughtRecords" v-loading="boughtLoading" stripe border style="width: 100%">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column label="用户" width="200">
              <template #default="{ row }">
                <span v-if="row.user">{{ row.user.email }} ({{ row.user.user_name }})</span>
                <span v-else class="text-muted">-</span>
              </template>
            </el-table-column>
            <el-table-column label="商品" width="200">
              <template #default="{ row }">
                <span v-if="row.product">{{ row.product.name }}</span>
                <span v-else class="text-muted">-</span>
              </template>
            </el-table-column>
            <el-table-column prop="price" label="价格" width="120">
              <template #default="{ row }">
                <span class="price-text">¥{{ row.price.toFixed(2) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="datetime" label="购买时间" width="180">
              <template #default="{ row }">
                {{ row.datetime ? formatDate(row.datetime) : '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="renew" label="自动续费" width="100">
              <template #default="{ row }">
                <el-tag :type="row.renew ? 'success' : 'info'" size="small">
                  {{ row.renew ? '是' : '否' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>

          <!-- Pagination -->
          <div class="pagination">
            <el-pagination
              v-model:current-page="boughtPagination.page"
              v-model:page-size="boughtPagination.pageSize"
              :page-sizes="[10, 20, 50, 100]"
              :total="boughtPagination.total"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="loadBoughtRecords"
              @current-change="loadBoughtRecords"
            />
          </div>
        </el-card>
      </el-tab-pane>

      <!-- Codes Tab -->
      <el-tab-pane label="充值码管理" name="codes">
        <el-card class="table-card" shadow="never">
          <template #header>
            <div class="card-header">
              <span>充值码列表</span>
              <el-button type="primary" size="small" @click="showGenerateDialog = true">
                生成充值码
              </el-button>
            </div>
          </template>

          <el-table :data="codes" v-loading="codesLoading" stripe border style="width: 100%">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="code" label="充值码" width="200" />
            <el-table-column prop="number" label="金额" width="120">
              <template #default="{ row }">
                <span class="price-text">¥{{ row.number.toFixed(2) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="isused" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.isused ? 'info' : 'success'" size="small">
                  {{ row.isused ? '已使用' : '未使用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="使用者" width="200">
              <template #default="{ row }">
                <span v-if="row.usedBy">{{ row.usedBy.email }} ({{ row.usedBy.user_name }})</span>
                <span v-else class="text-muted">-</span>
              </template>
            </el-table-column>
            <el-table-column prop="usedatetime" label="使用时间" width="180">
              <template #default="{ row }">
                {{ row.usedatetime ? formatDate(row.usedatetime) : '-' }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button
                  type="danger"
                  size="small"
                  link
                  @click="handleDeleteCode(row)"
                  :disabled="row.isused"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- Pagination -->
          <div class="pagination">
            <el-pagination
              v-model:current-page="codesPagination.page"
              v-model:page-size="codesPagination.pageSize"
              :page-sizes="[10, 20, 50, 100]"
              :total="codesPagination.total"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="loadCodes"
              @current-change="loadCodes"
            />
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <!-- Generate Codes Dialog -->
    <el-dialog
      v-model="showGenerateDialog"
      title="生成充值码"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form :model="generateForm" :rules="generateRules" ref="generateFormRef" label-width="100px">
        <el-form-item label="数量" prop="count">
          <el-input-number v-model="generateForm.count" :min="1" :max="1000" />
          <span class="unit-text">个 (1-1000)</span>
        </el-form-item>
        <el-form-item label="金额" prop="amount">
          <el-input-number v-model="generateForm.amount" :min="0.01" :precision="2" :step="1" />
          <span class="unit-text">元</span>
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-select v-model="generateForm.type">
            <el-option label="充值码" :value="1" />
            <el-option label="体验码" :value="2" />
            <el-option label="优惠码" :value="3" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showGenerateDialog = false">取消</el-button>
        <el-button type="primary" @click="handleGenerate" :loading="generating">
          生成
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { apiClient } from '@/shared/api/client'

// Active tab
const activeTab = ref('bought')

// Bought records
const boughtRecords = ref<any[]>([])
const boughtLoading = ref(false)
const boughtPagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

// Codes
const codes = ref<any[]>([])
const codesLoading = ref(false)
const codesPagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

// Generate dialog
const showGenerateDialog = ref(false)
const generating = ref(false)
const generateFormRef = ref()
const generateForm = reactive({
  count: 10,
  amount: 10,
  type: 1,
})

const generateRules = {
  count: [{ required: true, message: '请输入数量', trigger: 'blur' }],
  amount: [{ required: true, message: '请输入金额', trigger: 'blur' }],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
}

// Format date
const formatDate = (date: Date) => {
  return new Date(date).toLocaleString('zh-CN')
}

// Load bought records
const loadBoughtRecords = async () => {
  boughtLoading.value = true
  try {
    const response = await apiClient.admin.bought.get({
      query: {
        page: boughtPagination.page,
        pageSize: boughtPagination.pageSize,
      },
    })
    boughtRecords.value = response.records || []
    boughtPagination.total = response.pagination?.total || 0
  } catch (error: any) {
    ElMessage.error(error.message || '加载购买记录失败')
  } finally {
    boughtLoading.value = false
  }
}

// Load codes
const loadCodes = async () => {
  codesLoading.value = true
  try {
    const response = await apiClient.admin.codes.get({
      query: {
        page: codesPagination.page,
        pageSize: codesPagination.pageSize,
      },
    })
    codes.value = response.codes || []
    codesPagination.total = response.pagination?.total || 0
  } catch (error: any) {
    ElMessage.error(error.message || '加载充值码失败')
  } finally {
    codesLoading.value = false
  }
}

// Handle tab change
const handleTabChange = (tabName: string) => {
  if (tabName === 'bought') {
    loadBoughtRecords()
  } else if (tabName === 'codes') {
    loadCodes()
  }
}

// Handle generate codes
const handleGenerate = async () => {
  await generateFormRef.value.validate()
  try {
    generating.value = true
    await apiClient.admin.codes.generate.post({
      body: generateForm,
    })

    ElMessage.success(`成功生成 ${generateForm.count} 个充值码`)
    showGenerateDialog.value = false

    // Reset form
    generateForm.count = 10
    generateForm.amount = 10
    generateForm.type = 1

    // Reload codes
    loadCodes()
  } catch (error: any) {
    ElMessage.error(error.message || '生成充值码失败')
  } finally {
    generating.value = false
  }
}

// Handle delete code
const handleDeleteCode = async (row: any) => {
  ElMessageBox.confirm('确定要删除该充值码吗?', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    try {
      await apiClient.admin.codes[':id']().delete({
        params: {
          id: row.id.toString(),
        },
      })
      ElMessage.success('删除成功')
      loadCodes()
    } catch (error: any) {
      ElMessage.error(error.message || '删除失败')
    }
  })
}

onMounted(() => {
  loadBoughtRecords()
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

.text-muted {
  color: #909399;
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
