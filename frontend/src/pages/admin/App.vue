<template>
  <el-config-provider :locale="locale">
    <router-view />
  </el-config-provider>
</template>

<script setup lang="ts">
import { ElConfigProvider } from 'element-plus'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'

const locale = zhCn
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body,
#app {
  width: 100%;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
    sans-serif;
}

.admin-layout {
  display: flex;
  height: 100vh;
}

.admin-sidebar {
  width: 240px;
  background: #001529;
  color: #fff;
  transition: width 0.3s;
}

.admin-sidebar.collapsed {
  width: 64px;
}

.admin-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.admin-header {
  height: 60px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}

.admin-content {
  flex: 1;
  overflow-y: auto;
  background: #f0f2f5;
  padding: 24px;
}

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
}
</style>
