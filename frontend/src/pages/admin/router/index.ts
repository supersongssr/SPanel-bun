import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/admin',
    redirect: '/admin/dashboard',
  },
  {
    path: '/admin',
    component: () => import('../layouts/AdminLayout.vue'),
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue'),
        meta: { title: '系统概览', icon: 'Odometer' },
      },
      {
        path: 'announcement',
        name: 'Announcement',
        component: () => import('../views/Announcement.vue'),
        meta: { title: '公告管理', icon: 'Bell' },
      },
      {
        path: 'ticket',
        name: 'Ticket',
        component: () => import('../views/Ticket.vue'),
        meta: { title: '工单管理', icon: 'Tickets' },
      },
      {
        path: 'auto',
        name: 'Auto',
        component: () => import('../views/Auto.vue'),
        meta: { title: '下发命令', icon: 'Operation' },
      },
      {
        path: 'node',
        name: 'Node',
        component: () => import('../views/Node.vue'),
        meta: { title: '节点列表', icon: 'Connection' },
      },
      {
        path: 'nodectl',
        name: 'NodeCtl',
        component: () => import('../views/NodeCtl.vue'),
        meta: { title: '节点调整', icon: 'Setting' },
      },
      {
        path: 'trafficlog',
        name: 'TrafficLog',
        component: () => import('../views/TrafficLog.vue'),
        meta: { title: '流量记录', icon: 'TrendCharts' },
      },
      {
        path: 'block',
        name: 'Block',
        component: () => import('../views/Block.vue'),
        meta: { title: '已封禁IP', icon: 'Lock' },
      },
      {
        path: 'unblock',
        name: 'Unblock',
        component: () => import('../views/Unblock.vue'),
        meta: { title: '已解封IP', icon: 'Unlock' },
      },
      {
        path: 'user',
        name: 'User',
        component: () => import('../views/User.vue'),
        meta: { title: '用户列表', icon: 'User' },
      },
      {
        path: 'relay',
        name: 'Relay',
        component: () => import('../views/Relay.vue'),
        meta: { title: '中转规则', icon: 'Switch' },
      },
      {
        path: 'invite',
        name: 'Invite',
        component: () => import('../views/Invite.vue'),
        meta: { title: '邀请与返利', icon: 'Share' },
      },
      {
        path: 'login',
        name: 'LoginLog',
        component: () => import('../views/LoginLog.vue'),
        meta: { title: '登录记录', icon: 'Document' },
      },
      {
        path: 'alive',
        name: 'Alive',
        component: () => import('../views/Alive.vue'),
        meta: { title: '在线IP', icon: 'Connection' },
      },
      {
        path: 'detect',
        name: 'Detect',
        component: () => import('../views/Detect.vue'),
        meta: { title: '审计规则', icon: 'DocumentChecked' },
      },
      {
        path: 'detect/log',
        name: 'DetectLog',
        component: () => import('../views/DetectLog.vue'),
        meta: { title: '审计记录', icon: 'DocumentCopy' },
      },
      {
        path: 'code',
        name: 'Code',
        component: () => import('../views/Code.vue'),
        meta: { title: '充值记录', icon: 'Wallet' },
      },
      {
        path: 'shop',
        name: 'Shop',
        component: () => import('../views/Shop.vue'),
        meta: { title: '商品管理', icon: 'ShoppingCart' },
      },
      {
        path: 'coupon',
        name: 'Coupon',
        component: () => import('../views/Coupon.vue'),
        meta: { title: '优惠码', icon: 'Ticket' },
      },
      {
        path: 'bought',
        name: 'Bought',
        component: () => import('../views/Bought.vue'),
        meta: { title: '购买记录', icon: 'List' },
      },
      {
        path: 'yftorder',
        name: 'YftOrder',
        component: () => import('../views/YftOrder.vue'),
        meta: { title: '充值记录', icon: 'Wallet' },
      },
      {
        path: 'sys',
        name: 'Sys',
        component: () => import('../views/Sys.vue'),
        meta: { title: '系统设置', icon: 'Setting' },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory('/admin/'),
  routes,
})

export default router
