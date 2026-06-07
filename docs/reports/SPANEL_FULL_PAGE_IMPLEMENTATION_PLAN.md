# 🚀 SPanel 功能页全量复刻 - 实施计划

## 📊 任务概览

一次性实现 4 个经典功能页面，遵循 **Static-First** 架构原则。

---

## 📁 参考文件分析

### 1. invite.tpl (邀请页面)
**核心功能**：
- 邀请说明卡片（返利规则）
- 邀请链接生成（邀请码 + 完整链接）
- 定制邀请链接后缀
- 购买邀请次数
- 返利记录表格

**API 端点**：
- `POST /user/invite` - 生成邀请码
- `POST /user/buy_invite` - 购买邀请次数
- `POST /user/custom_invite` - 定制邀请链接
- `POST /user/inviteurl_reset` - 重置邀请链接

### 2. bought.tpl (购买记录)
**核心功能**：
- 账户信息卡片（当前等级、流量、速度、设备）
- 套餐矫正按钮
- 购买记录表格（商品名称、内容、价格、时间、续费信息）

**API 端点**：
- `DELETE /user/bought` - 关闭自动续费
- `POST /relevel` - 套餐矫正

### 3. shop.tpl & code.tpl
**待读取**，将包含：
- 套餐卡片展示
- 价格信息
- 购买确认流程
- 充值卡兑换界面

---

## 🎯 实施策略

### 阶段 1: 统一布局模板 (5分钟)
创建包含 SPanel 侧边栏的基础模板，所有页面复用。

### 阶段 2: 简单页面优先 (10分钟)
按顺序实现：
1. **bought.html** (最简单 - 纯展示)
2. **invite.html** (中等 - 有交互)
3. **code.html** (复杂 - 表单提交)
4. **shop.html** (最复杂 - 卡片 + 购买)

### 阶段 3: Vite 配置 (3分钟)
添加多页面入口到 `vite.config.ts`

### 阶段 4: 构建验证 (5分钟)
自动构建 + Playwright 截图验证

---

## 📝 快速实施命令

```bash
# 1. 创建页面文件
cd frontend/src/pages/user

# 2. 构建
bunx vite build

# 3. 部署
chown -R www-data:www-data frontend/dist
systemctl reload nginx

# 4. 测试
bunx playwright test --project=chromium
```

---

## 🎨 核心设计原则

### Static-First 骨架
```html
<!-- 标题和卡片外框静态化 -->
<h1 class="content-heading">邀请</h1>
<div class="card">
  <div class="card-main">
    <div class="card-inner">
      <!-- 数据区域使用骨架屏 -->
      <p class="skeleton skeleton-text">加载中...</p>
    </div>
  </div>
</div>
```

### API 容错
```typescript
async function fetchInviteInfo() {
  try {
    const response = await fetch('/api/user/invite')
    const data = await response.json()
    updateUI(data)
  } catch (error) {
    showError('暂无数据')
  }
}
```

### 统一侧边栏
所有页面使用相同的侧边栏 HTML 结构（已实现）。

---

## 📋 页面清单

| 页面 | 路径 | 优先级 | 预计时间 |
|------|------|--------|----------|
| 购买记录 | `/user/bought.html` | 1 (简单) | 5分钟 |
| 邀请返利 | `/user/invite.html` | 2 (中等) | 10分钟 |
| 充值卡兑换 | `/user/code.html` | 3 (复杂) | 15分钟 |
| 套餐购买 | `/user/shop.html` | 4 (最复杂) | 20分钟 |

---

## 🚀 立即开始

准备好按照以下顺序实现：

1. ✅ 已读取 invite.tpl 和 bought.tpl
2. ⏳ 待读取 shop.tpl 和 code.tpl
3. ⏳ 创建统一布局模板
4. ⏳ 实现 bought.html
5. ⏳ 实现 invite.html
6. ⏳ 实现 code.html
7. ⏳ 实现 shop.html
8. ⏳ 配置 Vite 多页面
9. ⏳ 构建和验证

**预计总时间**: 60 分钟
**自动构建**: ✅ 已配置
**测试环境**: https://test-spanel-bun.freessr.bid

---

**准备开始实施！请确认是否继续？**
