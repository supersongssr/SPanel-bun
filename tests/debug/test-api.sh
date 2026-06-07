#!/bin/bash

# SPanel Backend API 测试脚本
# 测试基础功能是否正常

API_URL="http://localhost:3000"
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "========================================"
echo "  SPanel Backend API 测试脚本"
echo "========================================"
echo ""

# 测试计数
total=0
passed=0
failed=0

# 测试函数
test_api() {
    local name="$1"
    local method="$2"
    local url="$3"
    local data="$4"
    local expected="$5"

    total=$((total + 1))
    echo -n "测试 $total: $name ... "

    if [ -n "$data" ]; then
        response=$(curl -s -X "$method" "$API_URL$url" \
            -H "Content-Type: application/json" \
            -d "$data")
    else
        response=$(curl -s -X "$method" "$API_URL$url")
    fi

    if echo "$response" | grep -q "$expected"; then
        echo -e "${GREEN}✓ PASS${NC}"
        passed=$((passed + 1))
    else
        echo -e "${RED}✗ FAIL${NC}"
        echo "  期望包含: $expected"
        echo "  实际响应: $response"
        failed=$((failed + 1))
    fi
}

echo "1. 健康检查测试"
echo "----------------------------------------"
test_api "API欢迎页" "GET" "/" "SPanel API"
test_api "健康检查" "GET" "/health" "healthy"
echo ""

echo "2. 认证模块测试"
echo "----------------------------------------"
# 注册测试
test_api "用户注册" "POST" "/auth/register" \
    '{"email":"test'$RANDOM'@example.com","password":"password123","username":"testuser'$RANDOM'"}' \
    "registered successfully\|User registered"

# 登录测试
test_api "用户登录" "POST" "/auth/login" \
    '{"email":"test@example.com","password":"password123"}' \
    "Login\|token\|success"

echo ""

echo "3. 节点模块测试"
echo "----------------------------------------"
test_api "获取节点列表" "GET" "/node/list" ""
echo ""

echo "========================================"
echo "  测试结果汇总"
echo "========================================"
echo -e "总计: $total"
echo -e "${GREEN}通过: $passed${NC}"
echo -e "${RED}失败: $failed${NC}"
echo ""

if [ $failed -eq 0 ]; then
    echo -e "${GREEN}✓ 所有测试通过!${NC}"
    exit 0
else
    echo -e "${RED}✗ 有测试失败,请检查${NC}"
    exit 1
fi
