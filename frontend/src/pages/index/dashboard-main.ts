import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import Dashboard from './Dashboard.vue'

// Check authentication
import { checkAuth } from '@/shared/utils/router-guard'

const app = createApp(Dashboard)
const pinia = createPinia()

app.use(pinia)
app.use(ElementPlus, {
  locale: zhCn,
})

// Mount app
app.mount('#app')
