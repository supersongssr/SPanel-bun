# SPanel-bun 路由与 API 地址映射方案

本项目核心设计理念为**前后端彻底分离**：
1. **后端 (ElysiaJS)**：移除所有 Slim 时代的页面直接渲染逻辑，转为纯 JSON 数据接口服务。所有的核心 API 地址均统一收束在以 `/api` 开头的命名空间下。
2. **前端 (静态 HTML)**：原 Slim 渲染的模板页面（`.tpl`）全部重构为运行在浏览器端的纯静态 HTML/JS 文件，通过 Fetch 异步调用 `/api` 接口渲染页面。

本方案针对 SPanel 原有 Slim 3.x 路由 (`config/routes.php`) 进行全面梳理，设计并映射出 SPanel-bun (ElysiaJS / Bun) 下的全新路由与静态页面架构。

---

## 1. 路由映射基本规则

为了实现清晰的鉴权和结构解耦，SPanel-bun 统一采用以下路由前缀规范：

| 路由前缀 | 鉴权中间件 | 适用场景 / 访问主体 |
| :--- | :--- | :--- |
| `/api/v1/auth/*` | 无 (或挂载 Guest 限流中间件) | 未登录用户：登录、注册、验证码、密码重置 |
| `/api/v1/user/*` | `UserAuth` (JWT 鉴权) | 登录用户：仪表盘、节点提取、购买套餐、工单等 |
| `/api/v1/admin/*` | `AdminAuth` (高特权 JWT 鉴权) | 管理员用户：系统管理、用户管理、公告发布等 |
| `/api/v1/payment/*` | 可选鉴权 / 第三方回调免密 | 支付网关回调、订单状态同步 |
| `/api/v1/node/*` | `NodeAuth` (Mu Key 校验) | 节点及其他公用高级 API、部分 V2 版节点 API |
| `/api/mu/*` & `/api/mod_mu/*` | `NodeAuth` (Mu Key / IP 校验) | 后端节点同步专属 API (如 Shadowsocks / Xray 轮询接口) |
| `/link/*` | 独立 Token 校验 | 聚合订阅生成（Surge / Clash / Quantumult X 等） |

---

## 2. 详细路由映射表

### 2.1 游客与鉴权接口 (Guest & Auth Routes)
原 PHP 中被 `Guest` 中间件包裹的路由，全部转为以下 API，页面请求则由 Nginx 直接分发到对应的 HTML 文件。

| 历史 Slim 3.x 路由 | 请求方法 | 对应 Slim 控制器动作 | 映射后 SPanel-bun API 路由 | 新请求方法 | 说明 / 对应静态页面 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/auth/login` | `GET` | `AuthController:login` | —— | —— | 访问 `/auth/login.html` |
| `/auth/login` | `POST` | `AuthController:loginHandle` | `/api/v1/auth/login` | `POST` | 账号密码登录，成功返回 JWT Token |
| `/auth/pow_challenge` | `POST` | `AuthController:powChallenge` | `/api/v1/auth/pow-challenge` | `POST` | 防爆破人机 POW 挑战验证 |
| `/auth/register` | `GET` | `AuthController:register` | —— | —— | 访问 `/auth/register.html` |
| `/auth/register` | `POST` | `AuthController:registerHandle` | `/api/v1/auth/register` | `POST` | 用户注册接口 |
| `/auth/send` | `POST` | `AuthController:sendVerify` | `/api/v1/auth/send-code` | `POST` | 发送邮箱验证码 (需滑块/图形验证) |
| `/auth/logout` | `GET` | `AuthController:logout` | `/api/v1/auth/logout` | `POST` | 退出登录 (在后端记录 JWT 黑名单) |
| `/auth/login_getCaptcha` | `GET` | `AuthController:getCaptcha` | `/api/v1/auth/captcha` | `GET` | 获取图形验证码 (返回 SVG + 缓存 ID) |
| `/auth/password/reset` | `GET` | `AuthController:reset` | —— | —— | 访问 `/auth/reset.html` |
| `/auth/password/reset` | `POST` | `AuthController:handleReset` | `/api/v1/auth/password/reset` | `POST` | 申请重置密码 |
| `/auth/password/token/{token}`| `GET` | `AuthController:token` | —— | —— | 访问 `/auth/reset-token.html?token=...` |
| `/auth/password/token/{token}`| `POST` | `AuthController:handleToken` | `/api/v1/auth/password/token/:token`| `POST` | 提交重置密码令牌和新密码 |

---

### 2.2 用户端接口 (Client / User APIs)
原 PHP 中被 `Auth` 中间件包裹的 `/user` 路由。在新架构中，所有的 `GET` 页面请求转为静态 HTML 页面直接呈现，数据填充一律使用 `GET` API 异步拉取。

| 历史 Slim 3.x 路由 | 请求方法 | 对应 Slim 控制器动作 | 映射后 SPanel-bun API 路由 | 新请求方法 | 说明 / 对应静态页面 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/user` / `/user/` | `GET` | `UserController:index` | `/api/v1/user/dashboard` | `GET` | 获取主页仪表盘统计 (流量、余额、公告等) |
| `/user/checkin` | `POST` | `UserController:doCheckin` | `/api/v1/user/checkin` | `POST` | 用户签到获取流量 |
| `/user/node` | `GET` | `UserController:node` | `/api/v1/user/node` | `GET` | 获取当前可用节点列表 |
| `/user/nodeunlock` | `GET` | `UserController:nodeUnlock` | `/api/v1/user/node-unlock` | `GET` | 获取节点解锁属性/特定配置 |
| `/user/node/{id}` | `GET` | `UserController:nodeInfo` | `/api/v1/user/node/:id` | `GET` | 获取单个节点的详细连接参数 |
| `/user/node/{id}/ajax` | `GET` | `UserController:nodeAjax` | `/api/v1/user/node/:id/ajax` | `GET` | 异步获取节点实时延迟/负载数据 |
| `/user/announcement` | `GET` | `UserController:announcement`| `/api/v1/user/announcement` | `GET` | 获取系统公告列表 |
| `/user/profile` | `GET` | `UserController:profile` | `/api/v1/user/profile` | `GET` | 获取当前用户信息及安全属性 |
| `/user/invite` | `GET` | `UserController:invite` | `/api/v1/user/invite` | `GET` | 获取邀请码记录及返利详情 |
| `/user/detect` | `GET` | `UserController:detect_index` | `/api/v1/user/detect` | `GET` | 获取审计/屏蔽规则列表 |
| `/user/detect/log` | `GET` | `UserController:detect_log` | `/api/v1/user/detect/log` | `GET` | 获取用户自身触发审计日志记录 |
| `/user/shop` | `GET` | `UserController:shop` | `/api/v1/user/shop` | `GET` | 获取在售商品套餐列表 |
| `/user/coupon_check` | `POST` | `UserController:CouponCheck` | `/api/v1/user/coupon/check` | `POST` | 校验优惠券是否可用及折扣数 |
| `/user/buy` | `POST` | `UserController:buy` | `/api/v1/user/buy` | `POST` | 购买商品下单接口 |
| `/user/relay` | `GET` | `RelayController:index` | `/api/v1/user/relay` | `GET` | 获取用户自建中转规则 |
| `/user/relay` | `POST` | `RelayController:add` | `/api/v1/user/relay` | `POST` | 新建中转端口转发规则 |
| `/user/relay/{id}/edit` | `GET` | `RelayController:edit` | `/api/v1/user/relay/:id` | `GET` | 获取单个中转规则配置 |
| `/user/relay/{id}` | `PUT` | `RelayController:update` | `/api/v1/user/relay/:id` | `PUT` | 更新中转规则 |
| `/user/relay` | `DELETE` | `RelayController:delete` | `/api/v1/user/relay` | `DELETE` | 删除中转规则 |
| `/user/ticket` | `GET` | `UserController:ticket` | `/api/v1/user/ticket` | `GET` | 获取工单列表 |
| `/user/ticket` | `POST` | `UserController:ticket_add` | `/api/v1/user/ticket` | `POST` | 创建新工单提交 |
| `/user/ticket/{id}/view`| `GET` | `UserController:ticket_view`| `/api/v1/user/ticket/:id` | `GET` | 查看工单对话详情 |
| `/user/ticket/{id}` | `PUT` | `UserController:ticket_update`| `/api/v1/user/ticket/:id` | `PUT` | 回复/追问工单信息 |
| `/user/password` | `POST` | `UserController:updatePassword`| `/api/v1/user/password` | `POST` | 修改登录密码 |
| `/user/ssr` | `POST` | `UserController:updateSSR` | `/api/v1/user/ssr` | `POST` | 更改 ShadowsocksR 协议与混淆参数 |
| `/user/mail` | `POST` | `UserController:updateMail` | `/api/v1/user/mail` | `POST` | 修改绑定邮箱地址 |
| `/user/sspwd` | `POST` | `UserController:updateSsPwd` | `/api/v1/user/sspwd` | `POST` | 修改 Shadowsocks 节点连接密码 |
| `/user/method` | `POST` | `UserController:updateMethod` | `/api/v1/user/method` | `POST` | 修改 Shadowsocks 节点加密方式 |
| `/user/trafficlog` | `GET` | `UserController:trafficLog` | `/api/v1/user/trafficlog` | `GET` | 获取最近的每日/小时流量图表数据 |
| `/user/kill` | `POST` | `UserController:handleKill` | `/api/v1/user/kill` | `POST` | 注销/抹除用户账户 |
| `/user/code` | `GET` | `UserController:code` | `/api/v1/user/code` | `GET` | 获取充值码记录与可用礼品卡 |
| `/user/code` | `POST` | `UserController:codepost` | `/api/v1/user/code` | `POST` | 提交充值卡密充值余额 |
| `/user/gacheck` | `POST` | `UserController:GaCheck` | `/api/v1/user/ga/check` | `POST` | 验证谷歌 2FA 令牌 |
| `/user/gaset` | `POST` | `UserController:GaSet` | `/api/v1/user/ga/set` | `POST` | 绑定谷歌双重验证 (2FA) |
| `/user/gareset` | `GET` | `UserController:GaReset` | `/api/v1/user/ga/reset` | `POST` | 解绑/重置谷歌双重验证 |
| `/user/telegram_reset` | `GET` | `UserController:telegram_reset`| `/api/v1/user/telegram/reset` | `POST` | 解绑绑定的 Telegram 账号 |
| `/user/resetport` | `POST` | `UserController:ResetPort` | `/api/v1/user/port/reset` | `POST` | 重置随机分配的节点端口 |
| `/user/specifyport` | `POST` | `UserController:SpecifyPort` | `/api/v1/user/port/specify` | `POST` | 付费修改指定节点端口 |
| `/user/unblock` | `POST` | `UserController:Unblock` | `/api/v1/user/unblock` | `POST` | 手动申请解除由于连接数过多触发的 IP 锁定 |
| `/user/bought` | `GET` | `UserController:bought` | `/api/v1/user/bought` | `GET` | 获取已购买且未过期的套餐记录 |
| `/user/bought` | `DELETE` | `UserController:deleteBoughtGet`| `/api/v1/user/bought` | `DELETE` | 退订/删除已购套餐记录 |
| `/user/url_reset` | `GET` | `UserController:resetURL` | `/api/v1/user/url/reset` | `POST` | 重置订阅地址 Token，防订阅泄露 |

---

### 2.3 管理端接口 (Admin APIs)
原 PHP 中被 `Admin` 中间件包裹的 `/admin` 路由，完全收纳至 `/api/v1/admin` 命名空间下。所有涉及表格渲染的均采用统一的 JSON 分页格式输出。

| 历史 Slim 3.x 路由 | 请求方法 | 对应 Slim 控制器动作 | 映射后 SPanel-bun API 路由 | 新请求方法 | 说明 / 对应静态页面 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/admin` | `GET` | `AdminController:index` | `/api/v1/admin/dashboard` | `GET` | 管理端总看板数据 (用户量、订单走势等) |
| `/admin/trafficlog` | `GET` | `AdminController:trafficLog` | `/api/v1/admin/trafficlog` | `GET` | 系统全节点流量消耗排行与消耗总览 |
| `/admin/node` | `GET` | `NodeController:index` | `/api/v1/admin/node` | `GET` | 获取管理端节点列表及全部后台同步参数 |
| `/admin/node` | `POST` | `NodeController:add` | `/api/v1/admin/node` | `POST` | 新增 VPN/代理 节点配置 |
| `/admin/node/{id}/edit` | `GET` | `NodeController:edit` | `/api/v1/admin/node/:id` | `GET` | 获取单节点配置以便二次编辑 |
| `/admin/node/{id}` | `PUT` | `NodeController:update` | `/api/v1/admin/node/:id` | `PUT` | 更新节点配置参数 |
| `/admin/node` | `DELETE` | `NodeController:delete` | `/api/v1/admin/node` | `DELETE` | 删除指定节点 |
| `/admin/ticket` | `GET` | `TicketController:index` | `/api/v1/admin/ticket` | `GET` | 获取待回复/全部用户工单列表 |
| `/admin/ticket/{id}/view`| `GET` | `TicketController:show` | `/api/v1/admin/ticket/:id` | `GET` | 查看特定工单详情及用户信息 |
| `/admin/ticket/{id}` | `PUT` | `TicketController:update` | `/api/v1/admin/ticket/:id` | `PUT` | 管理员答复/关闭工单 |
| `/admin/relay` | `GET` | `RelayController:index` | `/api/v1/admin/relay` | `GET` | 查看全局中转端口转发记录 |
| `/admin/relay` | `POST` | `RelayController:add` | `/api/v1/admin/relay` | `POST` | 强制为某些用户指定中转中接点转发规则 |
| `/admin/relay/{id}/edit` | `GET` | `RelayController:edit` | `/api/v1/admin/relay/:id` | `GET` | 获取指定中转规则 |
| `/admin/relay/{id}` | `PUT` | `RelayController:update` | `/api/v1/admin/relay/:id` | `PUT` | 修改中转规则 |
| `/admin/relay` | `DELETE` | `RelayController:delete` | `/api/v1/admin/relay` | `DELETE` | 强制删除中转规则 |
| `/admin/shop` | `GET` | `ShopController:index` | `/api/v1/admin/shop` | `GET` | 套餐商品配置列表 |
| `/admin/shop` | `POST` | `ShopController:add` | `/api/v1/admin/shop` | `POST` | 上架/发布新套餐商品 |
| `/admin/shop/{id}/edit` | `GET` | `ShopController:edit` | `/api/v1/admin/shop/:id` | `GET` | 获取指定商品参数 |
| `/admin/shop/{id}` | `PUT` | `ShopController:update` | `/api/v1/admin/shop/:id` | `PUT` | 编辑更新套餐商品属性 |
| `/admin/shop` | `DELETE` | `ShopController:deleteGet` | `/api/v1/admin/shop` | `DELETE` | 下架/删除指定套餐商品 |
| `/admin/announcement` | `GET` | `AnnController:index` | `/api/v1/admin/announcement`| `GET` | 管理端公告列表 |
| `/admin/announcement` | `POST` | `AnnController:add` | `/api/v1/admin/announcement`| `POST` | 发布系统级公告通知 |
| `/admin/announcement/{id}`| `PUT` | `AnnController:update` | `/api/v1/admin/announcement/:id`| `PUT` | 修正已发布的公告 |
| `/admin/announcement` | `DELETE` | `AnnController:delete` | `/api/v1/admin/announcement`| `DELETE` | 撤销删除公告 |
| `/admin/detect` | `GET` | `DetectController:index` | `/api/v1/admin/detect` | `GET` | 敏感审计屏蔽词/行为屏蔽规则管理 |
| `/admin/detect` | `POST` | `DetectController:add` | `/api/v1/admin/detect` | `POST` | 添加新审计阻断屏蔽规则 |
| `/admin/detect/log` | `GET` | `DetectController:log` | `/api/v1/admin/detect/log` | `GET` | 全平台用户触发的审计拦截记录列表 |
| `/admin/block` | `GET` | `IpController:block` | `/api/v1/admin/ip/block` | `GET` | 当前因多连接或扫描被系统临时封禁的 IP |
| `/admin/unblock` | `GET` | `IpController:unblock` | `/api/v1/admin/ip/unblock` | `GET` | 查看已解封 IP 历史记录 |
| `/admin/unblock` | `POST` | `IpController:doUnblock` | `/api/v1/admin/ip/unblock` | `POST` | 管理员手动解封指定被锁定的 IP 地址 |
| `/admin/login` | `GET` | `IpController:index` | `/api/v1/admin/ip/login-log` | `GET` | 获取全局用户登录 IP 日志汇总 |
| `/admin/alive` | `GET` | `IpController:alive` | `/api/v1/admin/ip/alive` | `GET` | 查看当前实时在线的活跃 IP 列表 |
| `/admin/code` | `GET` | `CodeController:index` | `/api/v1/admin/code` | `GET` | 充值卡密/礼品卡库存管理列表 |
| `/admin/code` | `POST` | `CodeController:add` | `/api/v1/admin/code` | `POST` | 批量生成/新增充值卡密 |
| `/admin/user` | `GET` | `UserController:index` | `/api/v1/admin/user` | `GET` | 全平台注册会员列表 (含高阶过滤搜索) |
| `/admin/user/{id}/edit` | `GET` | `UserController:edit` | `/api/v1/admin/user/:id` | `GET` | 获取指定会员的详情配置参数 |
| `/admin/user/{id}` | `PUT` | `UserController:update` | `/api/v1/admin/user/:id` | `PUT` | 修改会员属性 (余额、流量、等级、分组等) |
| `/admin/user` | `DELETE` | `UserController:delete` | `/api/v1/admin/user` | `DELETE` | 删除/清空指定会员账号 |
| `/admin/user/changetouser`| `POST` | `UserController:changetouser`| `/api/v1/admin/user/impersonate`| `POST` | 获取模拟目标用户登录的安全 Token |
| `/admin/coupon` | `GET` | `AdminController:coupon` | `/api/v1/admin/coupon` | `GET` | 折扣代金券/优惠码管理列表 |
| `/admin/coupon` | `POST` | `AdminController:addCoupon` | `/api/v1/admin/coupon` | `POST` | 建立并下发全局或专属商品优惠券 |
| `/admin/sys` | `GET` | `AdminController:sys` | `/api/v1/admin/system` | `GET` | 获取服务器环境参数 (PHP配置改Bun属性) |

---

### 2.4 后端节点同步专用接口 (Backend Node Sync APIs)
这些接口在高并发性能要求下运行。重构规范：**统一整合在 `/api` 前缀下进行逻辑收束**，保持对 ShadowsocksR / V2Ray / Trojan 后端守护进程 100% 协议级向后兼容。

| 历史 Slim 3.x 路由 | 请求方法 | 对应 Slim 控制器动作 | 映射后 SPanel-bun API 路由 | 新请求方法 | 鉴权校验核心 | 说明 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/mu/users` | `GET` | `Mu\UserController:index` | `/api/mu/users` | `GET` | `NodeKey` | 获取节点允许的所有有效 SS 会员账户 |
| `/mu/users/{id}/traffic` | `POST` | `Mu\UserController:addTraffic` | `/api/mu/users/:id/traffic` | `POST` | `NodeKey` | 单个用户高频流量增量上报 |
| `/mu/nodes/{id}/online_count` | `POST`| `Mu\NodeController:onlineUserLog` | `/api/mu/nodes/:id/online-count` | `POST` | `NodeKey` | 记录节点在线设备数日志 |
| `/mu/nodes/{id}/info` | `POST` | `Mu\NodeController:info` | `/api/mu/nodes/:id/info` | `POST` | `NodeKey` | 上报节点运行参数 (CPU、Mem、在线IP) |
| `/mod_mu/nodes/{id}/info` | `GET` | `Mod_Mu\NodeController:get_info` | `/api/mod_mu/nodes/:id/info` | `GET` | `NodeKey` & `IP` | 获取单个节点的元配置信息 |
| `/mod_mu/users` | `GET` | `Mod_Mu\UserController:index` | `/api/mod_mu/users` | `GET` | `NodeKey` & `IP` | 获取可用用户列表 (Mod_Mu协议) |
| `/mod_mu/users/traffic` | `POST` | `Mod_Mu\UserController:addTraffic` | `/api/mod_mu/users/traffic` | `POST` | `NodeKey` & `IP` | 批量上报用户累计消耗流量 (支持异步批写) |
| `/mod_mu/users/aliveip` | `POST` | `Mod_Mu\UserController:addAliveIp`| `/api/mod_mu/users/aliveip` | `POST` | `NodeKey` & `IP` | 批量同步上报节点的在线活跃用户 IP 列表 |
| `/mod_mu/users/detectlog` | `POST`| `Mod_Mu\UserController:addDetectLog`| `/api/mod_mu/users/detectlog` | `POST` | `NodeKey` & `IP` | 上报触发的审计拦截事件日志 |
| `/mod_mu/nodes/{id}/info` | `POST` | `Mod_Mu\NodeController:info` | `/api/mod_mu/nodes/:id/info` | `POST` | `NodeKey` & `IP` | 上报当前节点的物理负载与在线统计 |
| `/mod_mu/nodes` | `GET` | `Mod_Mu\NodeController:get_all_info`| `/api/mod_mu/nodes` | `GET` | `NodeKey` & `IP` | 批量获取全平台物理节点同步参数 |
| `/mod_mu/func/detect_rules`| `GET` | `Mod_Mu\FuncController:get_detect_logs`| `/api/mod_mu/func/detect-rules` | `GET` | `NodeKey` & `IP` | 后端同步最新的审计规则列表 |
| `/mod_mu/func/relay_rules` | `GET` | `Mod_Mu\FuncController:get_relay_rules`| `/api/mod_mu/func/relay-rules` | `GET` | `NodeKey` & `IP` | 后端同步最新的中转端口转发配置规则 |
| `/mod_mu/func/block_ip` | `POST` | `Mod_Mu\FuncController:addBlockIp` | `/api/mod_mu/func/block-ip` | `POST` | `NodeKey` & `IP` | 节点直接上报请求封禁异常扫描 IP |
| `/mod_mu/func/block_ip` | `GET` | `Mod_Mu\FuncController:get_blockip` | `/api/mod_mu/func/block-ip` | `GET` | `NodeKey` & `IP` | 节点拉取最新的系统全局 IP 封禁黑名单 |
| `/mod_mu/func/unblock_ip` | `GET` | `Mod_Mu\FuncController:get_unblockip`| `/api/mod_mu/func/unblock-ip` | `GET` | `NodeKey` & `IP` | 节点拉取最新申请解封的 IP 白名单 |

---

### 2.5 旧版辅助与 V2API 节点接口 (Legacy API & V2 APIs)
原 PHP 中定义在 `/api` 分组下的通用接口，同样并入 `/api` 前缀路由：

| 历史 Slim 3.x 路由 | 请求方法 | 对应 Slim 控制器动作 | 映射后 SPanel-bun API 路由 | 新请求方法 | 鉴权 / 说明 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/token/{token}` | `GET` | `ApiController:token` | `/api/v1/node/token/:token` | `GET` | Node 鉴权 token 状态校验 |
| `/api/token` | `POST` | `ApiController:newToken` | `/api/v1/node/token` | `POST` | 申请新的临时 Token 凭证 |
| `/api/node` | `GET` | `ApiController:node` | `/api/v1/node/list` | `GET` | 辅助节点同步获取节点详细 |
| `/api/user/{id}` | `GET` | `ApiController:userInfo` | `/api/v1/node/user/:id` | `GET` | 获取特定用户信息 |
| `/api/sublink` | `GET` | `ClientApiController:GetSubLink` | `/api/v1/sublink` | `GET` | 客户端快捷订阅链接，内部转分发 |
| `/api/ssn_sub/{id}` | `POST` | `ApiController:ssn_sub` | `/api/v1/node-sync/ssn-sub/:id` | `POST` | 兼容旧版 SSN 上报节点流量/状态 |
| `/api/ssn_v2/{id}` | `POST` | `ApiController:ssn_v2` | `/api/v1/node-sync/ssn-v2/:id` | `POST` | 兼容旧版 SSN 批量同步上报流量 |
| `/api/getNodeDomain/{id}` | `GET` | `ApiController:getNodeDomain` | `/api/v1/node/domain/:id` | `GET` | 获取节点对应域名映射详情 |
| `/api/node/proxy/{id}` | `GET` | `ApiController:nodeProxyInfo` | `/api/v1/node/proxy/:id` | `GET` | 解析下发节点加密配置代理串 |
| `/api/node/new` | `GET` | `ApiController:getNewNode` | `/api/v1/node/new` | `GET` | 获取系统推荐最新健康可用节点 |
| `/api/node/apply_id` | `POST` | `V2ApiController:applyId` | `/api/v1/node/v2/apply-id` | `POST` | V2 版节点 API 申请专属 ID 标识 |
| `/api/node/register` | `POST` | `V2ApiController:register` | `/api/v1/node/v2/register` | `POST` | 自动注册并托管托管型后端节点 |
| `/api/node/resolve_dns` | `POST` | `V2ApiController:resolveDns` | `/api/v1/node/v2/resolve-dns` | `POST` | 解析获取目标节点最新 IP 地址 |
| `/api/node/config` | `POST` | `V2ApiController:getConfig` | `/api/v1/node/v2/config` | `POST` | 安全分发一键部署节点后端配置文件 |
| `/api/node/status` | `POST` | `V2ApiController:status` | `/api/v1/node/v2/status` | `POST` | V2 节点高频状态与心跳机制校验 |

---

## 3. 静态 HTML 路由与 Nginx 规则设计

前端使用纯静态页面，所有 URL 经过 Nginx 或前端浏览器路由。我们推荐利用前端 Fetch 统一做会话管理。

### 3.1 前端静态资源目录结构与 URL 对应

| 物理 HTML 文件位置 | URL 路径 | 对应历史 Slim 功能 | 说明 |
| :--- | :--- | :--- | :--- |
| `public/index.html` | `/` | 官网首页 | 纯静态，拉取服务器简单负载参数 |
| `public/tos.html` | `/tos` / `/tos.html` | 服务条款 | 纯文本静态资源 |
| `public/auth/login.html` | `/auth/login` | 会员登录 | 表单提交，向 `/api/v1/auth/login` 请求 JWT Token |
| `public/auth/register.html` | `/auth/register` | 新建会员 | 表单提交，注册完重定向至 `/auth/login` |
| `public/auth/reset.html` | `/auth/reset` | 密码找回 | 提交邮箱发送 Code |
| `public/user/dashboard.html` | `/user` | 用户总览 | 核心主看板，Fetch `/api/v1/user/dashboard` 填补数据 |
| `public/user/nodes.html` | `/user/node` | 节点列表 | 渲染可用节点配置并快速触发获取 Clash 订阅 |
| `public/user/shop.html` | `/user/shop` | 购买商品 | 渲染可购列表，实现优惠券抵扣及跳转易付通扫码支付 |
| `public/user/tickets.html` | `/user/ticket` | 工单反馈 | 交互式查看或追加回复工单详情 |
| `public/admin/dashboard.html` | `/admin` | 管理后台 | 看板统计，图表基于 ECharts 展示系统近期走势 |
| `public/admin/users.html` | `/admin/user` | 全员管理 | 表格分页检索，包含一键进入模拟用户操作入口 |

---

## 4. 路由处理代码片段示例 (ElysiaJS / TypeScript)

在 `src/index.ts` 中，使用 Elysia 组织的路由映射片段示例：

```typescript
import { Elysia, t } from 'elysia';
import { guestRoutes } from './controllers/auth';
import { userRoutes } from './controllers/user';
import { adminRoutes } from './controllers/admin';
import { nodeSyncRoutes } from './controllers/mu';
import { jwtMiddleware } from './middleware/auth';

const app = new Elysia()
  // 全局跨域处理
  .onRequest(({ request }) => {
    // 跨域 CORS 响应头处理...
  })
  
  // 基础状态检测
  .get('/api/ping', () => ({ status: 'ok', time: Date.now() }))

  // 1. 游客与未登录鉴权组
  .group('/api/v1/auth', (app) => app.use(guestRoutes))

  // JWT 中间件挂载
  .use(jwtMiddleware)

  // 2. 普通会员专区组 (受 UserAuth 中间件保护)
  .group('/api/v1/user', (app) => app.use(userRoutes))

  // 3. 超级管理专区组 (受 AdminAuth 中间件保护)
  .group('/api/v1/admin', (app) => app.use(adminRoutes))

  // 4. 后端节点通信组 (收束原根目录 /mu 和 /mod_mu 至 /api 下)
  .group('/api', (app) => app.use(nodeSyncRoutes))

  .listen(3000);

console.log(`🚀 SPanel-bun Web 接口服务器正在运行：${app.server?.hostname}:${app.server?.port}`);
```

---

## 5. Nginx 反向代理配置设计

前后端分离后，统一使用 Nginx 将静态请求与 API 接口分配至不同服务。Nginx 代理配置文件示例如下：

```nginx
server {
    listen 80;
    listen 443 ssl http2;
    server_name yourdomain.com;

    # 1. 证书与 SSL 安全属性配置 (略)...

    # 2. 静态页面直接由 Nginx 分发 (public 物理路径)
    root /root/git/SPanel-bun/public;
    index index.html;

    # 去除扩展名支持：允许 /user 访问 /user.html，提升 URL 质感
    location / {
        try_files $uri $uri/ $uri.html /index.html;
    }

    # 静态资源过期缓存设置
    location /assets/ {
        expires 30d;
        access_log off;
    }

    # 3. 所有以 /api 开头的接口，反向代理至后端的 Bun/Elysia 服务
    location /api/ {
        proxy_pass http://127.0.0.1:3000; # Bun 启动的 Elysia 端口
        proxy_http_version 1.1;
        
        # 传递真实客户端 IP (供 active IP 判定和 CC 拦截)
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 开启 Websocket 连接支持 (兼容后续推送心跳)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        
        # 延长节点高频上报长连接超时，保障同步平滑
        proxy_read_timeout 600s;
    }

    # 4. 独立聚合订阅分发接口，单独分发反代
    location /link/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```
