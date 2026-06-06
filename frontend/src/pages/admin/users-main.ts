/**
 * Admin User Management Entry Point
 */

import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import UserManagement from './UserManagement.vue'
import { checkAuth, setupTokenExpiryCheck } from '@/shared/utils/router-guard'
import { auth } from '@/shared/utils/auth'

// Check authentication and admin privileges
if (!checkAuth()) {
  throw new Error('User not authenticated or not admin')
}

// Double check admin privileges
if (!auth.isAdmin()) {
  alert('需要管理员权限才能访问此页面')
  window.location.href = '/index.html'
  throw new Error('Admin privileges required')
}

// Create Vue app
const app = createApp(UserManagement)

// Register Element Plus
app.use(ElementPlus)

// Register all icons
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// Setup token expiry check
setupTokenExpiryCheck()

// Mount app
app.mount('#app')
