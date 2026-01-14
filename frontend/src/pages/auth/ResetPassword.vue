<template>
  <div class="auth-container">
    <el-card class="auth-card">
      <template #header>
        <div class="card-header">
          <h2>重置密码</h2>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="80px"
        @submit.prevent="handleReset"
      >
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" type="email" placeholder="请输入注册邮箱" />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleReset" :loading="loading" style="width: 100%">
            发送重置链接
          </el-button>
        </el-form-item>

        <el-alert
          title="提示"
          type="info"
          :closable="false"
          show-icon
        >
          重置链接将发送到您的邮箱，请查收。
        </el-alert>

        <el-form-item style="margin-top: 20px;">
          <div class="links">
            <a href="/auth/login.html">返回登录</a>
            <a href="/">返回首页</a>
          </div>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive({
  email: '',
})

const rules: FormRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' },
  ],
}

const handleReset = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true
    try {
      // TODO: 实现密码重置API调用
      // await api.resetPassword({ email: form.email })

      ElMessage.success('重置链接已发送到您的邮箱')

      // Redirect to login after 2 seconds
      setTimeout(() => {
        window.location.href = '/auth/login.html'
      }, 2000)
    } catch (error: any) {
      ElMessage.error(error.message || '发送失败')
    } finally {
      loading.value = false
    }
  })
}
</script>

<style scoped>
.auth-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.auth-card {
  width: 100%;
  max-width: 450px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.card-header {
  text-align: center;
}

.card-header h2 {
  margin: 0;
  color: #303133;
}

.links {
  display: flex;
  justify-content: space-between;
}

.links a {
  color: #409eff;
  text-decoration: none;
  font-size: 14px;
}

.links a:hover {
  text-decoration: underline;
}
</style>
