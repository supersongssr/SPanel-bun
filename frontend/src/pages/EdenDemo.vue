<!--
  Eden Client 类型安全演示组件

  这个组件展示了如何使用 Eden Client 进行类型安全的 API 调用
  你会看到编辑器自动提供完整的类型提示和自动补全
-->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '../shared/api/eden-client'

// 响应式数据
const healthData = ref<any>(null)
const userCount = ref<number>(0)
const loginData = ref<any>(null)
const loading = ref(false)
const error = ref<string | null>(null)

// 登录表单
const loginForm = ref({
  email: 'test-spanel@ssmail.win',
  password: ''
})

/**
 * 获取健康检查信息
 *
 * 注意：这里你会看到完全的类型推导！
 * healthData 的类型会自动从后端 API 定义中推导出来
 */
const fetchHealth = async () => {
  try {
    loading.value = true
    error.value = null

    // 🎯 类型安全的 API 调用！
    // 编辑器会自动提示 .api.health.get() 方法
    const response = await api.api.health.get()

    if (response.data) {
      healthData.value = response.data
      // TypeScript 自动推导 data 的类型：
      // - status: string
      // - framework: string
      // - version: string
      // - timestamp: string
      // - database: { connected: boolean, userCount: number }
      userCount.value = response.data.database?.userCount || 0
    }

    if (response.error) {
      error.value = response.error.message
    }
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

/**
 * 登录
 *
 * 你会看到编辑器自动提示 login.post() 需要的参数：
 * - email?: string
 * - user_name?: string
 * - password: string
 */
const handleLogin = async () => {
  try {
    loading.value = true
    error.value = null

    // 🎯 类型安全的登录调用
    // 参数会被自动验证，如果不匹配后端定义，TypeScript 会报错
    const response = await api.api.auth.login.post({
      email: loginForm.value.email,
      password: loginForm.value.password
    })

    if (response.data) {
      loginData.value = response.data
      // TypeScript 自动推导返回类型：
      // - message: string
      // - token: string
      // - user: { id, email, user_name, is_admin, class, transfer_enable, u, d }

      // 保存 token
      if (response.data.token) {
        localStorage.setItem('token', response.data.token)
      }
    }

    if (response.error) {
      error.value = response.error.message
    }
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

// 组件挂载时自动获取健康检查
onMounted(() => {
  fetchHealth()
})
</script>

<template>
  <div class="eden-demo">
    <h1>🎯 Eden Client 类型安全演示</h1>

    <div class="card">
      <h2>✨ 类型安全的 API 调用</h2>
      <p>
        这个组件展示了如何使用 Eden Client 进行完全类型安全的 API 调用。
        <br>
        <strong>关键特性</strong>：
      </p>
      <ul>
        <li>✅ 自动类型推导 - 无需手动定义接口类型</li>
        <li>✅ 编辑器自动补全 - 输入 api. 会自动提示所有可用端点</li>
        <li>✅ 编译时类型检查 - 参数错误会在编译时被发现</li>
        <li>✅ 返回值类型推导 - response.data 的类型完全自动推导</li>
      </ul>
    </div>

    <div class="card">
      <h2>📊 数据库连接状态</h2>
      <div v-if="loading">加载中...</div>
      <div v-else-if="error" class="error">错误: {{ error }}</div>
      <div v-else-if="healthData">
        <p><strong>状态:</strong> {{ healthData.status }}</p>
        <p><strong>框架:</strong> {{ healthData.framework }}</p>
        <p><strong>版本:</strong> {{ healthData.version }}</p>
        <p><strong>数据库连接:</strong> {{ healthData.database?.connected ? '✅ 已连接' : '❌ 未连接' }}</p>
        <p><strong>用户总数:</strong> {{ userCount }}</p>
      </div>
      <button @click="fetchHealth" :disabled="loading">
        刷新状态
      </button>
    </div>

    <div class="card">
      <h2>🔐 登录测试</h2>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label>Email:</label>
          <input
            v-model="loginForm.email"
            type="email"
            placeholder="user@example.com"
          />
        </div>
        <div class="form-group">
          <label>密码:</label>
          <input
            v-model="loginForm.password"
            type="password"
            placeholder="输入密码"
          />
        </div>
        <button type="submit" :disabled="loading || !loginForm.password">
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>

      <div v-if="loginData" class="success">
        <h3>✅ 登录成功！</h3>
        <pre>{{ JSON.stringify(loginData, null, 2) }}</pre>
      </div>

      <div v-if="error" class="error">
        ❌ {{ error }}
      </div>
    </div>

    <div class="card">
      <h2>💡 类型提示示例</h2>
      <p>在代码中尝试输入以下内容，你会看到完整的类型提示：</p>
      <pre class="code-block"><code>// 1. Health Check
const health = await api.api.health.get()
health.data?.status        // string
health.data?.database      // { connected: boolean, userCount: number }

// 2. 登录
const login = await api.api.auth.login.post({
  email: string,          // 编辑器会自动提示这些字段
  user_name?: string,     // 可选字段
  password: string         // 必填字段
})

// 3. 注册
const register = await api.api.auth.register.post({
  user_name: string,      // 必填
  password: string,        // 必填
  email?: string,          // 可选
  inviteCode?: string      // 可选
})

// 所有这些都会有完整的类型检查！</code></pre>
    </div>
  </div>
</template>

<style scoped>
.eden-demo {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.card {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.card h2 {
  margin-top: 0;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-group input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

button {
  padding: 10px 20px;
  background: #42b883;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

button:hover {
  background: #33a06f;
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.error {
  color: #f56c6c;
  margin-top: 10px;
}

.success {
  margin-top: 15px;
  padding: 15px;
  background: #e0f0e0;
  border-radius: 4px;
}

.code-block {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 15px;
  border-radius: 4px;
  overflow-x: auto;
}

.code-block code {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
}

ul {
  line-height: 1.8;
}
</style>
