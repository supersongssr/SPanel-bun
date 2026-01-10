<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">系统概览</h1>
    </div>

    <!-- 用户统计 -->
    <el-card class="stats-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>用户统计</span>
        </div>
      </template>
      <el-table :data="userStats" stripe border style="width: 100%">
        <el-table-column prop="group" label="分组" width="120" />
        <el-table-column prop="all" label="All" width="120" />
        <el-table-column prop="group5" label="5组" width="120" />
        <el-table-column prop="group4" label="4组" width="120" />
        <el-table-column prop="group3" label="3组" width="120" />
        <el-table-column prop="group2" label="2组" width="120" />
        <el-table-column prop="group1" label="1组" />
      </el-table>
    </el-card>

    <!-- 流量统计 -->
    <el-card class="stats-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>24小时流量统计</span>
        </div>
      </template>
      <el-table :data="trafficStats" stripe border style="width: 100%">
        <el-table-column prop="type" label="类型" width="120" />
        <el-table-column prop="all" label="All" width="150" />
        <el-table-column prop="group5" label="5组" width="150" />
        <el-table-column prop="group4" label="4组" width="150" />
        <el-table-column prop="group3" label="3组" width="150" />
        <el-table-column prop="group2" label="2组" width="150" />
        <el-table-column prop="group1" label="1组" />
      </el-table>
    </el-card>

    <!-- 流量供给 -->
    <el-card class="stats-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>流量供给</span>
        </div>
      </template>
      <el-table :data="supplyStats" stripe border style="width: 100%">
        <el-table-column prop="name" label="名称" width="200" />
        <el-table-column prop="value" label="值" />
      </el-table>
    </el-card>

    <!-- VIP详细统计 -->
    <el-card class="stats-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>VIP等级与分组详细统计 (24小时:¥)</span>
        </div>
      </template>
      <el-table :data="vipStats" stripe border style="width: 100%">
        <el-table-column prop="vip" label="VIP等级" width="100" fixed />
        <el-table-column prop="group5" label="G5" width="150" />
        <el-table-column prop="group4" label="G4" width="150" />
        <el-table-column prop="group3" label="G3" width="150" />
        <el-table-column prop="group2" label="G2" width="150" />
        <el-table-column prop="group1" label="G1" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

// 用户统计数据
const userStats = ref([
  {
    group: '分组',
    all: '0',
    group5: '0',
    group4: '0',
    group3: '0',
    group2: '0',
    group1: '0',
  },
  {
    group: 'VIP用户数',
    all: '0',
    group5: '0',
    group4: '0',
    group3: '0',
    group2: '0',
    group1: '0',
  },
])

// 流量统计数据
const trafficStats = ref([
  {
    type: '24H活跃:剩余流量',
    all: '0:0G',
    group5: '0:0G',
    group4: '0:0G',
    group3: '0:0G',
    group2: '0:0G',
    group1: '0:0G',
  },
  {
    type: '30分钟活跃:成本',
    all: '0:0¥',
    group5: '0:0¥',
    group4: '0:0¥',
    group3: '0:0¥',
    group2: '0:0¥',
    group1: '0:0¥',
  },
])

// 流量供给数据
const supplyStats = ref([
  { name: '组5供给', value: '0' },
  { name: '组4供给', value: '0' },
  { name: '组3供给', value: '0' },
  { name: '组2供给', value: '0' },
  { name: '组1供给', value: '0' },
])

// VIP统计数据
const vipStats = ref([
  { vip: 'V0', group5: '0:0$', group4: '0:0$', group3: '0:0$', group2: '0:0$', group1: '0:0$' },
  { vip: 'V1', group5: '0:0$', group4: '0:0$', group3: '0:0$', group2: '0:0$', group1: '0:0$' },
  { vip: 'V2', group5: '0:0$', group4: '0:0$', group3: '0:0$', group2: '0:0$', group1: '0:0$' },
  { vip: 'V3', group5: '0:0$', group4: '0:0$', group3: '0:0$', group2: '0:0$', group1: '0:0$' },
  { vip: 'V4', group5: '0:0$', group4: '0:0$', group3: '0:0$', group2: '0:0$', group1: '0:0$' },
  { vip: 'V5', group5: '0:0$', group4: '0:0$', group3: '0:0$', group2: '0:0$', group1: '0:0$' },
  { vip: 'V6', group5: '0:0$', group4: '0:0$', group3: '0:0$', group2: '0:0$', group1: '0:0$' },
  { vip: 'V7', group5: '0:0$', group4: '0:0$', group3: '0:0$', group2: '0:0$', group1: '0:0$' },
  { vip: 'V8', group5: '0:0$', group4: '0:0$', group3: '0:0$', group2: '0:0$', group1: '0:0$' },
  { vip: 'V9', group5: '0:0$', group4: '0:0$', group3: '0:0$', group2: '0:0$', group1: '0:0$' },
  { vip: 'V10', group5: '0:0$', group4: '0:0$', group3: '0:0$', group2: '0:0$', group1: '0:0$' },
])

// 加载仪表盘数据
const loadDashboardData = async () => {
  try {
    // TODO: 调用API获取实际数据
    // const response = await axios.get('/api/admin/dashboard')
    // 更新数据
  } catch (error) {
    console.error('加载仪表盘数据失败:', error)
  }
}

onMounted(() => {
  loadDashboardData()
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

.stats-card {
  margin-bottom: 24px;
}

.card-header {
  font-weight: 500;
  font-size: 16px;
  color: #000000d9;
}

:deep(.el-card__header) {
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

:deep(.el-card__body) {
  padding: 20px;
}

:deep(.el-table) {
  font-size: 14px;
}

:deep(.el-table th) {
  background: #fafafa;
  color: #000000d9;
  font-weight: 500;
}
</style>
