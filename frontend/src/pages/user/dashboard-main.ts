/**
 * User Dashboard Entry Point
 * 
 * MPA模式下每个页面都有自己的入口文件
 */

import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import Dashboard from './Dashboard.vue'
import { checkAuth, setupTokenExpiryCheck } from '@/shared/utils/router-guard'

// Check authentication before mounting
if (!checkAuth()) {
  // User will be redirected to login
  throw new Error('User not authenticated')
}

// Create Vue app
const app = createApp(Dashboard)

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
