# SPanel Backend API 测试

本目录包含SPanel后端API的测试脚本。

## 测试文件

### 1. Python测试脚本
- **文件:** `test_api.py` (位于项目根目录)
- **运行:** `python3 test_api.py`
- **依赖:** `requests`
- **说明:** 使用Python requests库测试所有API端点

### 2. TypeScript测试脚本
- **文件:** `api.test.ts`
- **运行:** `bun run tests/api.test.ts`
- **依赖:** 无额外依赖(Bun内置)
- **说明:** 使用TypeScript和Bun运行时测试

## 快速开始

### Python测试
```bash
cd /root/git/spanel-bun/backend
python3 test_api.py
```

### TypeScript测试
```bash
cd /root/git/spanel-bun/backend
bun run tests/api.test.ts
```

## 测试覆盖

测试脚本覆盖以下模块:

1. ✅ 健康检查
   - API欢迎页
   - 健康检查端点

2. ✅ 节点模块
   - 获取节点列表

3. ✅ 认证模块
   - 用户注册
   - 用户登录
   - 密码重置

4. ✅ 用户模块
   - 获取用户信息
   - 每日签到
   - 获取节点/套餐/商店
   - 流量日志
   - 工单系统

5. ✅ Mu API
   - 上报节点信息
   - 上报在线用户
   - 上报用户流量

6. ✅ 数据验证
   - 邮箱格式验证
   - 密码长度验证
   - 用户名验证

7. ✅ 权限测试
   - 未授权访问测试

## 测试结果

测试脚本会输出:
- 每个测试的通过/失败状态
- 状态码和详细信息
- 总体通过率和成功率

## 注意事项

- 确保API服务正在运行 (`http://localhost:3000`)
- 测试会创建真实数据(注册新用户)
- 某些测试可能需要数据库配置正确
