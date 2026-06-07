#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
SPanel Backend API 测试脚本
使用Python requests库测试所有API端点
"""

import requests
import json
import sys
from typing import Optional, Dict, Any

# API配置
API_URL = "http://localhost:3000"

# 颜色输出
class Colors:
    GREEN = '\033[0;32m'
    RED = '\033[0;31m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'  # No Color

# 测试统计
total_tests = 0
passed_tests = 0
failed_tests = 0

# 存储测试token
test_token = None
test_user_id = None

def print_header(text: str):
    """打印标题"""
    print(f"\n{Colors.BLUE}{'='*60}{Colors.NC}")
    print(f"{Colors.BLUE}{text:^60}{Colors.NC}")
    print(f"{Colors.BLUE}{'='*60}{Colors.NC}\n")

def print_test(name: str, passed: bool, details: str = ""):
    """打印测试结果"""
    global total_tests, passed_tests, failed_tests
    total_tests += 1

    if passed:
        passed_tests += 1
        status = f"{Colors.GREEN}✓ PASS{Colors.NC}"
    else:
        failed_tests += 1
        status = f"{Colors.RED}✗ FAIL{Colors.NC}"

    print(f"测试 {total_tests}: {name:<50} {status}")
    if details:
        print(f"       {Colors.YELLOW}{details}{Colors.NC}")

def test_health_check():
    """测试健康检查"""
    print_header("1. 健康检查测试")

    # 测试根路径
    try:
        response = requests.get(f"{API_URL}/")
        data = response.json()
        print_test("API欢迎页", response.status_code == 200 and data.get('status') == 'ok')
    except Exception as e:
        print_test("API欢迎页", False, str(e))

    # 测试健康检查
    try:
        response = requests.get(f"{API_URL}/health")
        data = response.json()
        print_test("健康检查端点", response.status_code == 200 and data.get('status') == 'healthy')
    except Exception as e:
        print_test("健康检查端点", False, str(e))

def test_node_list():
    """测试节点列表"""
    print_header("2. 节点模块测试")

    try:
        response = requests.get(f"{API_URL}/node/list")
        print_test(
            "获取节点列表",
            response.status_code == 200,
            f"状态码: {response.status_code}"
        )
    except Exception as e:
        print_test("获取节点列表", False, str(e))

def test_auth_register():
    """测试用户注册"""
    print_header("3. 认证模块 - 注册测试")

    import random
    test_email = f"test{random.randint(10000, 99999)}@example.com"
    test_username = f"testuser{random.randint(10000, 99999)}"

    register_data = {
        "email": test_email,
        "password": "password123",
        "username": test_username
    }

    try:
        response = requests.post(
            f"{API_URL}/auth/register",
            json=register_data
        )
        data = response.json()

        success = response.status_code == 201
        print_test(
            "用户注册",
            success,
            f"状态码: {response.status_code}, 邮箱: {test_email}"
        )

        if success and 'data' in data and 'token' in data['data']:
            global test_token, test_user_id
            test_token = data['data']['token']
            test_user_id = data['data']['user']['id']
            print(f"{Colors.GREEN}       已保存token用于后续测试{Colors.NC}")
    except Exception as e:
        print_test("用户注册", False, str(e))

def test_auth_login():
    """测试用户登录"""
    print_header("4. 认证模块 - 登录测试")

    # 使用固定账号测试(如果数据库中有的话)
    login_data = {
        "email": "test@example.com",
        "password": "password123"
    }

    try:
        response = requests.post(
            f"{API_URL}/auth/login",
            json=login_data
        )
        data = response.json()

        # 登录可能失败(用户不存在),但API应该正常响应
        success = response.status_code in [200, 401]
        print_test(
            "用户登录API",
            success,
            f"状态码: {response.status_code}"
        )

        if success and response.status_code == 200 and 'data' in data:
            global test_token
            test_token = data['data']['token']
            print(f"{Colors.GREEN}       已保存token: {test_token[:20]}...{Colors.NC}")
    except Exception as e:
        print_test("用户登录API", False, str(e))

def test_auth_password_reset():
    """测试密码重置"""
    print_header("5. 认证模块 - 密码重置测试")

    # 请求重置密码
    try:
        response = requests.post(
            f"{API_URL}/auth/reset-password/request",
            json={"email": "test@example.com"}
        )
        print_test(
            "请求密码重置",
            response.status_code == 200,
            f"状态码: {response.status_code}"
        )
    except Exception as e:
        print_test("请求密码重置", False, str(e))

def test_user_info():
    """测试获取用户信息(需要认证)"""
    print_header("6. 用户模块测试(需要认证)")

    if not test_token:
        print(f"{Colors.YELLOW}⚠ 跳过: 没有可用的token{Colors.NC}")
        return

    headers = {
        "Authorization": f"Bearer {test_token}"
    }

    # 获取用户信息
    try:
        response = requests.get(
            f"{API_URL}/user/info",
            headers=headers
        )
        print_test(
            "获取用户信息",
            response.status_code == 200,
            f"状态码: {response.status_code}"
        )
    except Exception as e:
        print_test("获取用户信息", False, str(e))

    # 每日签到
    try:
        response = requests.post(
            f"{API_URL}/user/checkin",
            headers=headers
        )
        print_test(
            "每日签到",
            response.status_code in [200, 400],  # 400表示已签到
            f"状态码: {response.status_code}"
        )
    except Exception as e:
        print_test("每日签到", False, str(e))

    # 获取节点
    try:
        response = requests.get(
            f"{API_URL}/user/nodes",
            headers=headers
        )
        print_test(
            "获取用户节点",
            response.status_code == 200,
            f"状态码: {response.status_code}"
        )
    except Exception as e:
        print_test("获取用户节点", False, str(e))

    # 获取套餐
    try:
        response = requests.get(
            f"{API_URL}/user/plans",
            headers=headers
        )
        print_test(
            "获取套餐列表",
            response.status_code == 200,
            f"状态码: {response.status_code}"
        )
    except Exception as e:
        print_test("获取套餐列表", False, str(e))

    # 获取商店
    try:
        response = requests.get(
            f"{API_URL}/user/shop",
            headers=headers
        )
        print_test(
            "获取商店商品",
            response.status_code == 200,
            f"状态码: {response.status_code}"
        )
    except Exception as e:
        print_test("获取商店商品", False, str(e))

def test_mu_api():
    """测试Mu API"""
    print_header("7. Mu API测试")

    # 上报节点信息
    try:
        response = requests.post(
            f"{API_URL}/node/mu/nodes/1/info",
            json={"load": "0.50", "onlineUserCount": 10}
        )
        print_test(
            "Mu API - 上报节点信息",
            response.status_code == 200,
            f"状态码: {response.status_code}"
        )
    except Exception as e:
        print_test("Mu API - 上报节点信息", False, str(e))

    # 上报在线用户
    try:
        response = requests.post(
            f"{API_URL}/node/mu/nodes/1/online",
            json={"count": 15}
        )
        print_test(
            "Mu API - 上报在线用户",
            response.status_code == 200,
            f"状态码: {response.status_code}"
        )
    except Exception as e:
        print_test("Mu API - 上报在线用户", False, str(e))

def test_validation():
    """测试数据验证"""
    print_header("8. 数据验证测试")

    # 测试无效邮箱
    try:
        response = requests.post(
            f"{API_URL}/auth/register",
            json={
                "email": "invalid-email",
                "password": "pass",
                "username": "ab"
            }
        )
        # 应该返回400或422验证错误
        print_test(
            "邮箱格式验证",
            response.status_code in [400, 422],
            f"状态码: {response.status_code} (期望验证失败)"
        )
    except Exception as e:
        print_test("邮箱格式验证", False, str(e))

    # 测试密码长度
    try:
        response = requests.post(
            f"{API_URL}/auth/register",
            json={
                "email": "valid@example.com",
                "password": "short",
                "username": "testuser"
            }
        )
        print_test(
            "密码长度验证",
            response.status_code in [400, 422],
            f"状态码: {response.status_code} (期望验证失败)"
        )
    except Exception as e:
        print_test("密码长度验证", False, str(e))

def print_summary():
    """打印测试总结"""
    print_header("测试结果汇总")

    print(f"总测试数: {total_tests}")
    print(f"{Colors.GREEN}通过: {passed_tests}{Colors.NC}")
    print(f"{Colors.RED}失败: {failed_tests}{Colors.NC}")

    if failed_tests == 0:
        success_rate = 100
    else:
        success_rate = (passed_tests / total_tests) * 100

    print(f"\n成功率: {success_rate:.1f}%")

    if failed_tests == 0:
        print(f"\n{Colors.GREEN}🎉 所有测试通过!{Colors.NC}\n")
        return 0
    else:
        print(f"\n{Colors.RED}⚠️  有测试失败,请检查{Colors.NC}\n")
        return 1

def main():
    """主函数"""
    print(f"\n{Colors.BLUE}╔{'='*58}╗{Colors.NC}")
    print(f"{Colors.BLUE}║{' '*20}SPanel API 测试{' '*20}║{Colors.NC}")
    print(f"{Colors.BLUE}╚{'='*58}╝{Colors.NC}")
    print(f"\n测试地址: {API_URL}")
    print(f"开始时间: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    try:
        # 运行所有测试
        test_health_check()
        test_node_list()
        test_auth_register()
        test_auth_login()
        test_auth_password_reset()
        test_user_info()
        test_mu_api()
        test_validation()

        # 打印总结
        exit_code = print_summary()
        sys.exit(exit_code)

    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}测试被中断{Colors.NC}\n")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n{Colors.RED}测试出错: {str(e)}{Colors.NC}\n")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
