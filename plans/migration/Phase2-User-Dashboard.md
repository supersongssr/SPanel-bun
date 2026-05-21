# SPanel-bun 重构迁移二期规范：用户面板与订阅引擎 (Phase 2)

本方案涵盖了迁移重构的第二阶段：用户控制台面板的静态化交互（通过 **Alpine.js** 驱动）以及核心多客户端聚合订阅分发引擎的开发规范。

---

## 目录
1. [二期迁移目标](#1-二期迁移目标)
2. [Alpine.js 静态页面交互绑定规范](#2-alpinejs-静态页面交互绑定规范)
3. [多协议订阅配置引擎设计 (Core Engine)](#3-多协议订阅配置引擎设计-core-engine)
4. [套餐购买与易付通（YftPay）订单流转规范](#4-套餐购买与易付通yftpay-订单流转规范)
5. [前端统一 Fetch 鉴权拦截器示例](#5-前端统一-fetch-鉴权拦截器示例)
6. [二期测试与验收要点](#6-二期测试与验收要点)

---

## 1. 二期迁移目标

1. 实现用户专区（`/user/` 目录下静态文件）的 100% 静态化分发，采用 **Alpine.js** 声明式绑定实现后台 API（`/api/v1/user/*`）的数据拉取与更新。
2. 重写原本冗长无章的 PHP 订阅系统，构建现代化的多协议（Shadowsocks, VMess, Trojan 等）配置转换器，能够根据请求客户端的 `User-Agent` 动态分发 Clash YAML 或 Base64 配置。
3. 建立安全的套餐结算系统，支持优惠券合法性校验和安全的第三方支付扫码回调。

---

## 2. Alpine.js 静态页面交互绑定规范

用户端静态 HTML（如 `public/user/dashboard.html`）引入 Alpine.js，通过 `x-data` 轻松进行组件状态维护，彻底告别臃肿的 Webpack/Vite 编译打包。

### 2.1 数据拉取与绑定示例 (dashboard.html)
```html
<div x-data="dashboardState()" x-init="initData()">
  <!-- 仪表盘统计卡片 -->
  <div class="card glassmorphism">
    <h4>可用余额</h4>
    <p class="text-gradient" x-text="'¥ ' + money"></p>
  </div>
  
  <div class="card glassmorphism">
    <h4>已用上传 / 下载 / 总流量</h4>
    <p x-text="u + ' / ' + d + ' / ' + transferEnable"></p>
  </div>

  <!-- 签到按钮 -->
  <button 
    @click="performCheckin()" 
    :disabled="checkedIn" 
    class="btn-primary" 
    x-text="checkedIn ? '今日已签到' : '每日签到'"
  ></button>
</div>

<script>
  function dashboardState() {
    return {
      money: '0.00',
      u: '0 B',
      d: '0 B',
      transferEnable: '0 B',
      checkedIn: false,

      async initData() {
        try {
          const res = await apiFetch('/api/v1/user/dashboard');
          if (res.status === 'success') {
            this.money = res.data.money;
            this.u = formatTraffic(res.data.u);
            this.d = formatTraffic(res.data.d);
            this.transferEnable = formatTraffic(res.data.transfer_enable);
            this.checkedIn = res.data.checked_in;
          }
        } catch (err) {
          showNotification('error', '获取面板数据失败');
        }
      },

      async performCheckin() {
        const res = await apiFetch('/api/v1/user/checkin', { method: 'POST' });
        if (res.status === 'success') {
          showNotification('success', `签到成功，获得 ${formatTraffic(res.data.traffic)} 流量`);
          this.initData(); // 重新加载数据
        }
      }
    };
  }
</script>
```

---

## 3. 多协议订阅配置引擎设计 (Core Engine)

这是本阶段最核心的后端组件，位于 `src/services/subscription.ts` 中。当客户端对外部 `/link/:token` 订阅地址发起请求时，该引擎拦截并解析请求：

### 3.1 订阅引擎设计架构

```text
[ 用户客户端 (如 Clash/Surge) ]
           │
           ▼ (携带 token 请求 GET /link/:token)
[ 订阅拦截控制器 ] ──► (解析 token 换取 UID, 获取用户有效节点列表)
           │
           ├─── (UA 包含 "clash" 或 "clash.meta") ──► [ 生成 Clash YAML 格式配置 ]
           │
           ├─── (UA 包含 "surge")                ──► [ 生成 Surge CONF 格式配置 ]
           │
           └─── (其他未知 UA / 网页直开)            ──► [ 默认输出 Base64 聚合普通节点链接 ]
```

### 3.2 Clash 配置模版生成代码示例
```typescript
import YAML from 'yaml';
import { db } from '../config/database';
import { nodeTable } from '../db/schema';

export async function generateClashConfig(nodes: any[], userToken: string) {
  const clashTemplate: any = {
    port: 7890,
    'socks-port': 7891,
    'allow-lan': false,
    mode: 'rule',
    'log-level': 'info',
    proxies: [],
    'proxy-groups': [
      {
        name: '⚡ 代理中心',
        type: 'select',
        proxies: []
      }
    ],
    rules: [
      'GEOIP,CN,DIRECT',
      'MATCH,⚡ 代理中心'
    ]
  };

  // 循环用户可用节点，追加至 proxies 数组中
  for (const node of nodes) {
    const customConfig = JSON.parse(node.customConfig || '{}');
    const proxyConfig = {
      name: node.name,
      type: customConfig.type || 'ss',
      server: node.server,
      port: customConfig.port || 443,
      cipher: node.method,
      password: customConfig.password || 'default_pwd'
    };
    
    clashTemplate.proxies.push(proxyConfig);
    clashTemplate['proxy-groups'][0].proxies.push(node.name);
  }

  // 输出标准符合 Clash 解析的 YAML 字符串
  return YAML.stringify(clashTemplate);
}
```

---

## 4. 套餐购买与易付通（YftPay）订单流转规范

当用户在 `public/user/shop.html` 中确认购买某套餐商品时，核心的支付结算和充值流转如下：

1. **订单创建 (`POST /api/v1/user/buy`)**：
   * 检查优惠券码是否合法及是否有折扣金额。
   * 如果用户账户余额 `user.money` 充足，直接使用 `decimal.js` 从余额扣除费用，成功写入 `bought` 套餐表。
   * 如果余额不足，进入第三方充值流程：调用易付通网关创建订单，返回支付宝/微信支付的收款二维码及跳转链接。
2. **异步网关回调 (`POST /api/v1/payment/yftpay-callback`)**：
   * 网关回调是**无登录态的敏感接口**。
   * *签名校验红线*：必须验证从第三方推送的所有参数的 Hash 签名，保证不是伪造请求。
   * 执行充值，增加用户余额，并触发原定的套餐购买流转。

---

## 5. 前端统一 Fetch 鉴权拦截器示例

在前端 `public/assets/js/api.js` 中编写统一请求工具 `apiFetch`。该工具自动拦截所有未授权行为并透明传输 JWT 凭证：

```javascript
window.apiFetch = async function(url, options = {}) {
  const token = localStorage.getItem('spanel_jwt');
  
  // 注入请求头部
  options.headers = {
    ...options.headers,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
  
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, options);

  // 拦截未授权跳转登录页
  if (response.status === 401) {
    localStorage.removeItem('spanel_jwt');
    localStorage.removeItem('spanel_user');
    window.location.href = '/auth/login.html';
    return;
  }

  return await response.json();
};
```

---

## 6. 二期测试与验收要点

*   [ ] **JWT 请求通过测试**：带 `Authorization` 头部访问用户接口，后端能够正确识别出 UID；不带头部访问，直接返回 `401 Unauthorized`。
*   [ ] **Clash 订阅解析正常**：使用 Clash 客户端请求 `/link/YOUR_TOKEN` 地址，能成功拉取到标准的 YAML 配置，且没有乱码，节点列表完整加载。
*   [ ] **余额扣减精度测试**：对余额为 `10.05` 元的用户发起一笔 `4.99` 元的套餐交易，扣费后在数据库查验 `money` 精确为 `5.06`，绝对不允许出现 JavaScript 原生的 `5.0600000000000005`。
