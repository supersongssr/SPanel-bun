import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import Register from './Register.vue'
import { checkAuth } from '@/shared/utils/router-guard'

// Check authentication - this will handle SSO redirect if already logged in
if (!checkAuth()) {
  // User is being redirected, don't mount the app
  throw new Error('Redirecting...')
}

const app = createApp(Register)
const pinia = createPinia()

app.use(pinia)
app.use(ElementPlus, {
  locale: zhCn,
})

app.mount('#app')
