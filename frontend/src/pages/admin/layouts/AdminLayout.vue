<template>
  <div class="admin-layout">
    <el-container>
      <el-aside :width="isCollapse ? '64px' : '240px'" class="admin-sidebar">
        <div class="sidebar-header">
          <h2 v-if="!isCollapse">SPanel 管理后台</h2>
          <el-icon v-else :size="24"><Monitor /></el-icon>
        </div>
        <el-menu
          :default-active="currentRoute"
          :collapse="isCollapse"
          :unique-opened="true"
          router
          background-color="#001529"
          text-color="#fff"
          active-text-color="#1890ff"
        >
          <el-sub-menu index="1">
            <template #title>
              <el-icon><Management /></el-icon>
              <span>管理</span>
            </template>
            <el-menu-item index="/admin/dashboard">
              <el-icon><Odometer /></el-icon>
              <span>系统概览</span>
            </el-menu-item>
            <el-menu-item index="/admin/announcement">
              <el-icon><Bell /></el-icon>
              <span>公告管理</span>
            </el-menu-item>
            <el-menu-item index="/admin/ticket">
              <el-icon><Tickets /></el-icon>
              <span>工单管理</span>
            </el-menu-item>
            <el-menu-item index="/admin/auto">
              <el-icon><Operation /></el-icon>
              <span>下发命令</span>
            </el-menu-item>
          </el-sub-menu>

          <el-sub-menu index="2">
            <template #title>
              <el-icon><Connection /></el-icon>
              <span>节点</span>
            </template>
            <el-menu-item index="/admin/node">
              <el-icon><Connection /></el-icon>
              <span>节点列表</span>
            </el-menu-item>
            <el-menu-item index="/admin/nodectl">
              <el-icon><Setting /></el-icon>
              <span>节点调整</span>
            </el-menu-item>
            <el-menu-item index="/admin/trafficlog">
              <el-icon><TrendCharts /></el-icon>
              <span>流量记录</span>
            </el-menu-item>
            <el-menu-item index="/admin/block">
              <el-icon><Lock /></el-icon>
              <span>已封禁IP</span>
            </el-menu-item>
            <el-menu-item index="/admin/unblock">
              <el-icon><Unlock /></el-icon>
              <span>已解封IP</span>
            </el-menu-item>
          </el-sub-menu>

          <el-sub-menu index="3">
            <template #title>
              <el-icon><User /></el-icon>
              <span>用户</span>
            </template>
            <el-menu-item index="/admin/user">
              <el-icon><UserFilled /></el-icon>
              <span>用户列表</span>
            </el-menu-item>
            <el-menu-item index="/admin/relay">
              <el-icon><Switch /></el-icon>
              <span>中转规则</span>
            </el-menu-item>
            <el-menu-item index="/admin/invite">
              <el-icon><Share /></el-icon>
              <span>邀请与返利</span>
            </el-menu-item>
            <el-menu-item index="/admin/login">
              <el-icon><Document /></el-icon>
              <span>登录记录</span>
            </el-menu-item>
            <el-menu-item index="/admin/alive">
              <el-icon><Connection /></el-icon>
              <span>在线IP</span>
            </el-menu-item>
          </el-sub-menu>

          <el-sub-menu index="4">
            <template #title>
              <el-icon><DocumentChecked /></el-icon>
              <span>审计</span>
            </template>
            <el-menu-item index="/admin/detect">
              <el-icon><Document /></el-icon>
              <span>审计规则</span>
            </el-menu-item>
            <el-menu-item index="/admin/detect/log">
              <el-icon><DocumentCopy /></el-icon>
              <span>审计记录</span>
            </el-menu-item>
          </el-sub-menu>

          <el-sub-menu index="5">
            <template #title>
              <el-icon><ShoppingCart /></el-icon>
              <span>交易</span>
            </template>
            <el-menu-item index="/admin/code">
              <el-icon><Wallet /></el-icon>
              <span>充值记录</span>
            </el-menu-item>
            <el-menu-item index="/admin/shop">
              <el-icon><Shop /></el-icon>
              <span>商品</span>
            </el-menu-item>
            <el-menu-item index="/admin/coupon">
              <el-icon><Ticket /></el-icon>
              <span>优惠码</span>
            </el-menu-item>
            <el-menu-item index="/admin/bought">
              <el-icon><List /></el-icon>
              <span>购买记录</span>
            </el-menu-item>
          </el-sub-menu>

          <el-sub-menu index="6">
            <template #title>
              <el-icon><Setting /></el-icon>
              <span>系统</span>
            </template>
            <el-menu-item index="/admin/sys">
              <el-icon><Tools /></el-icon>
              <span>系统设置</span>
            </el-menu-item>
          </el-sub-menu>
        </el-menu>
      </el-aside>

      <el-container>
        <el-header class="admin-header">
          <div class="header-left">
            <el-icon class="collapse-icon" @click="toggleCollapse">
              <Expand v-if="isCollapse" />
              <Fold v-else />
            </el-icon>
          </div>
          <div class="header-right">
            <el-dropdown>
              <span class="user-info">
                <el-avatar :size="32" :src="userAvatar" />
                <span class="username">{{ username }}</span>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="goToUser">
                    <el-icon><User /></el-icon>
                    用户中心
                  </el-dropdown-item>
                  <el-dropdown-item divided @click="logout">
                    <el-icon><SwitchButton /></el-icon>
                    退出登录
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </el-header>

        <el-main class="admin-content">
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  Management,
  Odometer,
  Bell,
  Tickets,
  Operation,
  Connection,
  Setting,
  TrendCharts,
  Lock,
  Unlock,
  User,
  UserFilled,
  Switch,
  Share,
  Document,
  DocumentCopy,
  DocumentChecked,
  ShoppingCart,
  Shop,
  Wallet,
  Ticket,
  List,
  Tools,
  Monitor,
  Expand,
  Fold,
  SwitchButton,
} from '@element-plus/icons-vue'

const route = useRoute()

const isCollapse = ref(false)
const username = ref('管理员')
const userAvatar = ref('https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png')

const currentRoute = computed(() => route.path)

const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value
}

const goToUser = () => {
  window.location.href = '/user'
}

const logout = () => {
  // TODO: 实现登出逻辑
  window.location.href = '/auth/logout'
}
</script>

<style scoped>
.admin-sidebar {
  background: #001529;
  transition: width 0.3s;
  overflow: hidden;
}

.sidebar-header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
}

.admin-header {
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}

.header-left {
  display: flex;
  align-items: center;
}

.collapse-icon {
  font-size: 20px;
  cursor: pointer;
  color: #000000d9;
  transition: color 0.3s;
}

.collapse-icon:hover {
  color: #1890ff;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.username {
  font-size: 14px;
  color: #000000d9;
}

.admin-content {
  background: #f0f2f5;
  padding: 24px;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.fade-enter-from {
  opacity: 0;
  transform: translateX(10px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

:deep(.el-menu) {
  border-right: none;
}

:deep(.el-sub-menu .el-menu-item) {
  background-color: #000c17;
  min-width: 0;
  padding-left: 50px !important;
}

:deep(.el-menu-item.is-active) {
  background-color: #1890ff !important;
}
</style>
