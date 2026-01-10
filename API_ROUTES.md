# SPanel Backend API Routes

Base URL: `http://localhost:3000` or `https://test-spanel-bun.freessr.bid`

## Authentication Routes

### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "username": "johndoe",
  "inviteCode": "optional_invite_code"
}
```

**Response:** 201 Created
```json
{
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "username": "johndoe"
    },
    "token": "jwt_token_here"
  }
}
```

### POST /auth/login
Login user with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** 200 OK
```json
{
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "username": "johndoe",
      "isAdmin": false
    },
    "token": "jwt_token_here"
  }
}
```

### POST /auth/logout
Logout user and invalidate token.

**Headers:** `Authorization: Bearer <token>`

**Response:** 200 OK
```json
{
  "message": "Logged out successfully"
}
```

### POST /auth/reset-password/request
Request password reset link.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

### POST /auth/reset-password/confirm
Confirm password reset with token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "token": "reset_token_here",
  "newPassword": "new_password123"
}
```

### POST /auth/send-verification
Send email verification code.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

### POST /auth/verify-email
Verify email with code.

**Request Body:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

---

## User Routes (Require Authentication)

All routes require `Authorization: Bearer <token>` header.

### GET /user/info
Get current user information.

**Response:** 200 OK
```json
{
  "message": "User info retrieved successfully",
  "data": {
    "id": 1,
    "email": "user@example.com",
    "username": "johndoe",
    "u": 0,
    "d": 0,
    "transferEnable": 1073741824,
    "balance": 0
  }
}
```

### GET /user/dashboard
Get user dashboard data with stats, announcements, and nodes.

**Response:** 200 OK
```json
{
  "message": "Dashboard data retrieved successfully",
  "data": {
    "user": { ... },
    "orders": [ ... ],
    "tickets": [ ... ],
    "notices": [ ... ],
    "nodes": [ ... ]
  }
}
```

### POST /user/checkin
Daily check-in to get bonus traffic.

**Response:** 200 OK
```json
{
  "message": "Check-in successful",
  "data": {
    "reward": 10485760,
    "totalTransferEnable": 1084540928
  }
}
```

### PUT /user/profile
Update user profile.

**Request Body:**
```json
{
  "username": "newusername",
  "theme": "material"
}
```

### POST /user/password
Change password.

**Request Body:**
```json
{
  "oldPassword": "old_password123",
  "newPassword": "new_password123"
}
```

### GET /user/nodes
Get available nodes for user.

### GET /user/subscribe
Get subscription link.

### GET /user/traffic
Get traffic logs with pagination.

**Query Params:** `page`, `limit`

### GET /user/tickets
Get user tickets with pagination.

**Query Params:** `page`, `limit`

### POST /user/tickets
Create a new ticket.

**Request Body:**
```json
{
  "title": "Ticket title",
  "content": "Ticket content"
}
```

### PUT /user/tickets/:id
Update ticket.

**Request Body:**
```json
{
  "content": "New message",
  "status": 0
}
```

### GET /user/shop
Get shop items.

### POST /user/shop/:id/buy
Buy shop item.

### POST /user/invite/reset
Reset invite code.

### GET /user/plans
Get available plans.

### POST /user/orders
Create order.

**Request Body:**
```json
{
  "planId": 1,
  "paymentMethod": "alipay"
}
```

---

## Node Routes

### GET /node/list
Get list of active nodes (public).

### GET /node/:id
Get node details.

### POST /node/mu/users/:id/traffic
Mu API - Report user traffic.

**Request Body:**
```json
{
  "u": 1024000,
  "d": 2048000
}
```

### POST /node/mu/nodes/:id/info
Mu API - Report node info.

**Request Body:**
```json
{
  "load": "0.50",
  "onlineUserCount": 10
}
```

### POST /node/mu/nodes/:id/online
Mu API - Report online users count.

**Request Body:**
```json
{
  "count": 15
}
```

### POST /node (Admin Only)
Create new node.

### PUT /node/:id (Admin Only)
Update node.

### DELETE /node/:id (Admin Only)
Delete node.

---

## Admin Routes (Require Admin Authentication)

All routes require `Authorization: Bearer <admin_token>` header.

### GET /admin/dashboard
Get admin dashboard statistics.

**Response:** 200 OK
```json
{
  "message": "Dashboard stats retrieved successfully",
  "data": {
    "totalUsers": 100,
    "activeNodes": 5,
    "totalOrders": 50,
    "openTickets": 3,
    "todayTraffic": 1073741824
  }
}
```

### GET /admin/users
Get users list with pagination and search.

**Query Params:** `page`, `limit`, `search`

### GET /admin/users/:id
Get user details.

### PUT /admin/users/:id
Update user.

### DELETE /admin/users/:id
Delete user.

### GET /admin/nodes
Get all nodes.

### POST /admin/nodes
Create new node.

### PUT /admin/nodes/:id
Update node.

### DELETE /admin/nodes/:id
Delete node.

### GET /admin/tickets
Get all tickets with pagination.

**Query Params:** `page`, `limit`, `status`

### GET /admin/tickets/:id
Get ticket details.

### PUT /admin/tickets/:id
Reply to ticket.

### GET /admin/orders
Get orders with pagination.

**Query Params:** `page`, `limit`, `status`

### GET /admin/plans
Get all plans.

### POST /admin/plans
Create new plan.

### PUT /admin/plans/:id
Update plan.

### DELETE /admin/plans/:id
Delete plan.

### GET /admin/shop
Get shop items.

### POST /admin/shop
Create shop item.

### PUT /admin/shop/:id
Update shop item.

### DELETE /admin/shop/:id
Delete shop item.

### GET /admin/notices
Get notices.

### POST /admin/notices
Create notice.

### PUT /admin/notices/:id
Update notice.

### DELETE /admin/notices/:id
Delete notice.

### GET /admin/codes
Get invite/recharge codes.

### POST /admin/codes
Create new code.

### GET /admin/traffic
Get traffic logs.

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error Type",
  "message": "Detailed error message"
}
```

Common status codes:
- 400: Bad Request
- 401: Unauthorized (invalid/missing token)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 500: Internal Server Error
