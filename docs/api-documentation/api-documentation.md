# 面试后 API 接口文档

## 基础信息

- **Base URL**: `http://localhost:3001`
- **协议**: HTTP/1.1
- **Content-Type**: `application/json`
- **API 前缀**: `/trpc`

## 响应格式说明

### tRPC 响应格式

所有 tRPC 接口返回统一的格式：

```json
{
  "result": {
    "data": {
      // 实际数据
    }
  }
}
```

### 错误响应格式（已统一）

所有错误现在都返回统一的格式：

```json
{
  "success": false,
  "error": {
    "message": "错误信息",
    "code": "错误代码",
    "stack": "堆栈信息（仅开发环境）"
  }
}
```

#### Zod 验证错误格式

```json
{
  "success": false,
  "error": {
    "message": "参数验证失败",
    "code": "VALIDATION_ERROR",
    "validationErrors": [
      { "path": "email", "message": "Invalid email format" },
      { "path": "password", "message": "Password too short" }
    ]
  }
}
```

#### 常见错误代码

| 错误代码 | HTTP 状态码 | 描述 |
|---------|------------|------|
| `BAD_REQUEST` | 400 | 请求参数错误 |
| `VALIDATION_ERROR` | 400 | 参数验证失败（Zod） |
| `UNAUTHORIZED` | 401 | 未授权访问 |
| `FORBIDDEN` | 403 | 权限不足 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `RESOURCE_NOT_FOUND` | 404 | 资源不存在 |
| `DUPLICATE_OPERATION` | 409 | 重复操作 |
| `INTERNAL_SERVER_ERROR` | 500 | 服务器内部错误 |

详细错误处理说明请参考 [错误处理改进文档](../错误处理改进.md)

---

## 认证说明

本系统使用 Better-Auth 进行用户认证，支持邮箱密码登录/注册。

### 认证流程

1. 用户注册/登录成功后，服务器会设置 session cookie
2. 后续请求需要携带 session cookie 以维持登录状态
3. 受保护的接口需要用户登录后才能访问

### Better-Auth Handler 和 tRPC 接口

本系统提供了两种认证接口：

1. **Better-Auth Handler（推荐）**：直接调用 `/api/auth/*` 路径，handler 会自动处理 cookies
2. **tRPC 接口**：通过 `/trpc/auth/*` 路径调用，需要手动传递 cookies

**推荐使用 Better-Auth Handler**，因为它会自动处理 cookies 的设置和清除。

### 权限说明

- **公开接口**: 无需登录即可访问
- **登录接口**: 需要用户登录
- **管理员接口**: 需要管理员权限
- **所有者或管理员接口**: 需要管理员权限或资源所有者权限

---

## 1. 认证接口 (auth)

### 1.1 用户注册（Better-Auth Handler）

**接口路径**: `POST /api/auth/sign-up/email`

**权限**: 公开

**请求参数**:
```typescript
{
  email: string,      // 邮箱地址，必填
  password: string,   // 密码，最少6位，必填
  name?: string       // 用户名，可选，默认使用邮箱前缀
}
```

**请求示例**:
```bash
curl -X POST http://localhost:3001/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123456",
    "name": "测试用户"
  }'
```

**响应示例**:
```json
{
  "token": "hu9pwelBJx8l9RQ4PCv0RRDBhpy5Kisu",
  "user": {
    "id": "ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs",
    "name": "测试用户",
    "email": "test@example.com",
    "emailVerified": false,
    "image": null,
    "createdAt": "2026-01-28T15:13:51.612Z",
    "updatedAt": "2026-01-28T15:13:51.612Z"
  }
}
```

**Set-Cookie 头**:
```
set-cookie: mianshihou.session_token=...; Max-Age=2592000; Path=/; HttpOnly; SameSite=Lax
set-cookie: mianshihou.session_data=...; Max-Age=300; Path=/; HttpOnly; SameSite=Lax
```

**错误响应**:
- `USER_EXISTS`: 该邮箱已被注册

---

### 1.2 用户登录（Better-Auth Handler）

**接口路径**: `POST /api/auth/sign-in/email`

**权限**: 公开

**请求参数**:
```typescript
{
  email: string,      // 邮箱地址，必填
  password: string    // 密码，必填
}
```

**请求示例**:
```bash
curl -X POST http://localhost:3001/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123456"
  }' \
  -c /tmp/cookies.txt
```

**响应示例**:
```json
{
  "token": "jG5s6QvDjbUr95YW1kak9fcI9xsYPi1e",
  "user": {
    "id": "ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs",
    "name": "测试用户",
    "email": "test@example.com",
    "emailVerified": false,
    "image": null,
    "createdAt": "2026-01-28T15:13:51.612Z",
    "updatedAt": "2026-01-28T15:13:51.612Z"
  }
}
```

**Set-Cookie 头**:
```
set-cookie: mianshihou.session_token=...; Max-Age=2592000; Path=/; HttpOnly; SameSite=Lax
set-cookie: mianshihou.session_data=...; Max-Age=300; Path=/; HttpOnly; SameSite=Lax
```

**错误响应**:
- `INVALID_CREDENTIALS`: 邮箱或密码错误

---

### 1.3 用户登出（Better-Auth Handler）

**接口路径**: `POST /api/auth/sign-out`

**权限**: 登录

**请求参数**: 无

**请求头**:
```
Origin: http://localhost:3001  # 必需，用于 CSRF 保护
```

**请求示例**:
```bash
curl -X POST http://localhost:3001/api/auth/sign-out \
  -H "Origin: http://localhost:3001" \
  -b /tmp/cookies.txt
```

**响应示例**:
```json
{
  "success": true
}
```

**Set-Cookie 头**:
```
set-cookie: mianshihou.session_token=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax
set-cookie: mianshihou.session_data=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax
```

---

### 1.4 获取会话信息（Better-Auth Handler）

**接口路径**: `GET /api/auth/get-session`

**权限**: 登录

**请求参数**: 无

**请求示例**:
```bash
curl -X GET http://localhost:3001/api/auth/get-session \
  -b /tmp/cookies.txt
```

**响应示例**:
```json
{
  "session": {
    "expiresAt": "2026-02-27T15:29:03.324Z",
    "token": "jG5s6QvDjbUr95YW1kak9fcI9xsYPi1e",
    "createdAt": "2026-01-28T15:29:03.324Z",
    "updatedAt": "2026-01-28T15:29:03.324Z",
    "ipAddress": "",
    "userAgent": "curl/8.7.1",
    "userId": "ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs",
    "id": "lnJqDU3Qlf7jRrYxNZCPGxd2O7mjWpxp"
  },
  "user": {
    "name": "测试用户",
    "email": "test@example.com",
    "emailVerified": false,
    "image": null,
    "createdAt": "2026-01-28T15:13:51.612Z",
    "updatedAt": "2026-01-28T15:13:51.612Z",
    "id": "ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs"
  }
}
```

**未登录响应**:
```json
null
```

---

### 1.5 用户注册（tRPC）

**接口路径**: `POST /trpc/auth.signUp`

**权限**: 公开

**请求参数**:
```typescript
{
  email: string,      // 邮箱地址，必填
  password: string,   // 密码，最少6位，必填
  name?: string       // 用户名，可选，默认使用邮箱前缀
}
```

**请求示例**:
```bash
curl -X POST http://localhost:3001/trpc/auth.signUp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123456",
    "name": "测试用户"
  }'
```

**响应示例**:
```json
{
  "result": {
    "data": {
      "user": {
        "id": "ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs",
        "name": "测试用户",
        "email": "test@example.com",
        "emailVerified": false,
        "image": null,
        "createdAt": "2026-01-28T15:13:51.612Z",
        "updatedAt": "2026-01-28T15:13:51.612Z"
      },
      "message": "注册成功"
    }
  }
}
```

**错误响应**:
- `BAD_REQUEST`: 该邮箱已被注册

**注意**: tRPC 接口不会自动设置 cookies，推荐使用 Better-Auth Handler 接口。

---

### 1.6 用户登录（tRPC）

**接口路径**: `POST /trpc/auth.signIn`

**权限**: 公开

**请求参数**:
```typescript
{
  email: string,      // 邮箱地址，必填
  password: string    // 密码，必填
}
```

**请求示例**:
```bash
curl -X POST http://localhost:3001/trpc/auth.signIn \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123456"
  }'
```

**响应示例**:
```json
{
  "result": {
    "data": {
      "user": {
        "id": "ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs",
        "name": "测试用户",
        "email": "test@example.com",
        "emailVerified": false,
        "image": null,
        "createdAt": "2026-01-28T15:13:51.612Z",
        "updatedAt": "2026-01-28T15:13:51.612Z"
      },
      "message": "登录成功"
    }
  }
}
```

**错误响应**:
- `UNAUTHORIZED`: 邮箱或密码错误

**注意**: tRPC 接口不会自动设置 cookies，推荐使用 Better-Auth Handler 接口。

---

### 1.7 用户登出（tRPC）

**接口路径**: `POST /trpc/auth.signOut`

**权限**: 登录

**请求参数**: 无

**请求示例**:
```bash
curl -X POST http://localhost:3001/trpc/auth.signOut \
  -H "Content-Type: application/json" \
  -b /tmp/cookies.txt
```

**响应示例**:
```json
{
  "result": {
    "data": {
      "success": true,
      "message": "登出成功"
    }
  }
}
```

---

### 1.8 获取会话信息（tRPC）

**接口路径**: `GET /trpc/auth.getSession`

**权限**: 登录

**请求参数**: 无

**请求示例**:
```bash
curl -X GET http://localhost:3001/trpc/auth.getSession \
  -b /tmp/cookies.txt
```

**响应示例**:
```json
{
  "result": {
    "data": {
      "user": {
        "id": "ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs",
        "email": "test@example.com",
        "userName": "测试用户",
        "userAvatar": null,
        "userRole": "user",
        "status": "active"
      },
      "session": {
        "session": {
          "expiresAt": "2026-02-27T15:29:03.324Z",
          "token": "jG5s6QvDjbUr95YW1kak9fcI9xsYPi1e",
          "createdAt": "2026-01-28T15:29:03.324Z",
          "updatedAt": "2026-01-28T15:29:03.324Z",
          "ipAddress": "",
          "userAgent": "curl/8.7.1",
          "userId": "ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs",
          "id": "lnJqDU3Qlf7jRrYxNZCPGxd2O7mjWpxp"
        },
        "user": {
          "name": "测试用户",
          "email": "test@example.com",
          "emailVerified": false,
          "image": null,
          "createdAt": "2026-01-28T15:13:51.612Z",
          "updatedAt": "2026-01-28T15:13:51.612Z",
          "id": "ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs"
        }
      }
    }
  }
}
```

**未登录响应**:
```json
{
  "result": {
    "data": {
      "user": null,
      "session": null
    }
  }
}
```

---

### 1.9 获取用户资料（tRPC）

**接口路径**: `GET /trpc/auth.me`

**权限**: 登录

**请求参数**: 无

**请求示例**:
```bash
curl -X GET http://localhost:3001/trpc/auth.me \
  -b /tmp/cookies.txt
```

**响应示例**:
```json
{
  "result": {
    "data": {
      "id": "ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs",
      "email": "test@example.com",
      "userName": "测试用户",
      "userAvatar": null,
      "userRole": "user",
      "status": "active"
    }
  }
}
```

**未登录响应**:
```json
{
  "result": {
    "data": {}
  }
}
```

---

## 2. 用户管理接口 (users)

### 2.1 获取用户列表

**接口路径**: `GET /trpc/users.list`

**权限**: 管理员

**请求参数**:
```typescript
{
  page?: number,      // 页码，默认 1
  pageSize?: number,  // 每页数量，默认 10，最大 100
  keyword?: string    // 搜索关键词，可选
}
```

**请求示例**:
```bash
curl -X GET 'http://localhost:3001/trpc/users.list?page=1&pageSize=10' \
  -H "Content-Type: application/json"
```

**响应示例**:
```json
{
  "result": {
    "data": [
      {
        "id": "ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs",
        "userName": "测试用户",
        "userAccount": "test@example.com",
        "email": "test@example.com",
        "userRole": "user",
        "status": "active",
        "createTime": "2026-01-28T15:13:51.612Z",
        "updateTime": "2026-01-28T15:13:51.612Z",
        "isDelete": false
      }
    ]
  }
}
```

---

### 2.2 根据 ID 获取用户

**接口路径**: `GET /trpc/users.byId`

**权限**: 管理员或资源所有者

**请求参数**:
```typescript
{
  id: string  // 用户 ID，必填
}
```

**请求示例**:
```bash
curl -X GET 'http://localhost:3001/trpc/users.byId?id=ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs' \
  -H "Content-Type: application/json"
```

**响应示例**:
```json
{
  "result": {
    "data": {
      "id": "ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs",
      "userName": "测试用户",
      "userAccount": "test@example.com",
      "email": "test@example.com",
      "userRole": "user",
      "status": "active",
      "createTime": "2026-01-28T15:13:51.612Z",
      "updateTime": "2026-01-28T15:13:51.612Z",
      "isDelete": false
    }
  }
}
```

---

### 2.3 创建用户

**接口路径**: `POST /trpc/users.create`

**权限**: 管理员

**请求参数**:
```typescript
{
  userAccount: string,   // 用户账号，3-256 字符，必填
  userPassword: string,  // 密码，6-64 字符，必填
  email?: string,        // 邮箱地址，可选
  userName?: string      // 用户名，1-256 字符，可选
}
```

**请求示例**:
```bash
curl -X POST http://localhost:3001/trpc/users.create \
  -H "Content-Type: application/json" \
  -d '{
    "userAccount": "newuser",
    "userPassword": "password123",
    "email": "newuser@example.com",
    "userName": "新用户"
  }'
```

**响应示例**:
```json
{
  "result": {
    "data": {
      "id": "new_user_id",
      "userAccount": "newuser",
      "userName": "新用户",
      "email": "newuser@example.com",
      "userRole": "user",
      "status": "active",
      "createTime": "2026-01-28T15:20:00.000Z",
      "updateTime": "2026-01-28T15:20:00.000Z",
      "isDelete": false
    }
  }
}
```

---

### 2.4 更新用户

**接口路径**: `POST /trpc/users.update`

**权限**: 管理员或资源所有者

**请求参数**:
```typescript
{
  id: string,              // 用户 ID，必填
  userName?: string,       // 用户名，可选
  userAvatar?: string,     // 头像 URL，可选
  userProfile?: string     // 个人简介，最多 512 字符，可选
}
```

**请求示例**:
```bash
curl -X POST http://localhost:3001/trpc/users.update \
  -H "Content-Type: application/json" \
  -d '{
    "id": "ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs",
    "userName": "更新后的用户名",
    "userAvatar": "https://example.com/avatar.jpg",
    "userProfile": "这是我的个人简介"
  }'
```

**响应示例**:
```json
{
  "result": {
    "data": {
      "id": "ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs",
      "userName": "更新后的用户名",
      "userAvatar": "https://example.com/avatar.jpg",
      "userProfile": "这是我的个人简介",
      "updateTime": "2026-01-28T15:25:00.000Z"
    }
  }
}
```

---

### 2.5 删除用户

**接口路径**: `POST /trpc/users.delete`

**权限**: 管理员

**请求参数**:
```typescript
{
  id: string  // 用户 ID，必填
}
```

**请求示例**:
```bash
curl -X POST http://localhost:3001/trpc/users.delete \
  -H "Content-Type: application/json" \
  -d '{
    "id": "user_id_to_delete"
  }'
```

**响应示例**:
```json
{
  "result": {
    "data": {
      "success": true,
      "id": "user_id_to_delete"
    }
  }
}
```

---

### 2.6 批量创建用户

**接口路径**: `POST /trpc/users.batchCreate`

**权限**: 管理员

**请求参数**:
```typescript
{
  users: Array<{
    userAccount: string,   // 用户账号，3-256 字符，必填
    userPassword: string,  // 用户密码，6-64 字符，必填
    email?: string,        // 邮箱，可选
    userName?: string      // 用户名，1-256 字符，可选
  }>
}
```

**参数限制**:
- `users` 数组长度：1-100 条

**请求示例**:
```bash
curl -X POST http://localhost:3001/trpc/users.batchCreate \
  -H "Content-Type: application/json" \
  -d '{
    "users": [
      {
        "userAccount": "user001",
        "userPassword": "password123",
        "email": "user001@example.com",
        "userName": "用户001"
      },
      {
        "userAccount": "user002",
        "userPassword": "password456",
        "email": "user002@example.com",
        "userName": "用户002"
      }
    ]
  }'
```

**响应示例**:
```json
{
  "result": {
    "data": {
      "success": true,
      "message": "批量创建用户完成：成功 2，失败 0",
      "data": {
        "success": ["user_id_001", "user_id_002"],
        "failed": []
      }
    }
  }
}
```

**失败响应示例**:
```json
{
  "result": {
    "data": {
      "success": true,
      "message": "批量创建用户完成：成功 1，失败 1",
      "data": {
        "success": ["user_id_001"],
        "failed": [
          {
            "userAccount": "user002",
            "reason": "账号已存在"
          }
        ]
      }
    }
  }
}
```

---

### 2.7 批量删除用户

**接口路径**: `POST /trpc/users.batchDelete`

**权限**: 管理员

**请求参数**:
```typescript
{
  ids: string[]  // 用户 ID 数组，1-100 条
}
```

**参数限制**:
- `ids` 数组长度：1-100 条

**请求示例**:
```bash
curl -X POST http://localhost:3001/trpc/users.batchDelete \
  -H "Content-Type: application/json" \
  -d '{
    "ids": ["user_id_001", "user_id_002", "user_id_003"]
  }'
```

**响应示例**:
```json
{
  "result": {
    "data": {
      "success": true,
      "message": "批量删除用户完成：成功 2，失败 1",
      "data": {
        "success": ["user_id_001", "user_id_002"],
        "failed": [
          {
            "id": "user_id_003",
            "reason": "用户不存在或已删除"
          }
        ]
      }
    }
  }
}
```

---

### 2.8 用户列表 + 统计信息

**接口路径**: `GET /trpc/users.listWithStats`

**权限**: 管理员

**请求参数**:
```typescript
{
  page?: number,      // 页码，默认 1
  pageSize?: number,  // 每页数量，默认 10，最大 100
  keyword?: string    // 搜索关键词，可选
}
```

**请求示例**:
```bash
curl -X GET 'http://localhost:3001/trpc/users.listWithStats?page=1&pageSize=10' \
  -H "Content-Type: application/json"
```

**响应示例**:
```json
{
  "result": {
    "data": {
      "success": true,
      "message": "获取用户列表和统计信息成功",
      "data": {
        "items": [
          {
            "id": "ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs",
            "userName": "测试用户",
            "userAccount": "test@example.com",
            "email": "test@example.com",
            "userRole": "user",
            "status": "active",
            "createTime": "2026-01-28T15:13:51.612Z",
            "updateTime": "2026-01-28T15:13:51.612Z",
            "isDelete": false
          }
        ],
        "pagination": {
          "page": 1,
          "pageSize": 10,
          "total": 100,
          "totalPages": 10
        },
        "stats": {
          "totalUsers": 100,
          "activeUsers": 45,
          "newUsers": 8
        }
      }
    }
  }
}
```

**统计数据说明**:
- `totalUsers`: 总用户数
- `activeUsers`: 活跃用户数（30天内登录）
- `newUsers`: 新增用户数（7天内）

---

## 3. 帖子接口 (posts)

### 3.1 创建帖子

**接口路径**: `POST /trpc/posts.create`

**权限**: 公开（实际应该需要登录）

**请求参数**:
```typescript
{
  title: string,     // 标题，必填
  content: string,   // 内容，必填
  tags?: string,     // 标签，可选
  userId: string     // 用户 ID，必填
}
```

**请求示例**:
```bash
curl -X POST http://localhost:3001/trpc/posts.create \
  -H "Content-Type: application/json" \
  -d '{
    "title": "这是一个测试帖子",
    "content": "这是帖子的内容",
    "tags": "技术,测试",
    "userId": "ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs"
  }'
```

**响应示例**:
```json
{
  "result": {
    "data": {
      "id": 1,
      "title": "这是一个测试帖子",
      "content": "这是帖子的内容",
      "tags": "技术,测试",
      "userId": "ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs",
      "thumbNum": 0,
      "favourNum": 0,
      "createTime": "2026-01-28T15:30:00.000Z",
      "updateTime": "2026-01-28T15:30:00.000Z",
      "isDelete": false
    }
  }
}
```

---

### 3.2 获取帖子列表

**接口路径**: `GET /trpc/posts.list`

**权限**: 公开

**请求参数**:
```typescript
{
  page?: number,      // 页码，默认 1
  pageSize?: number,  // 每页数量，默认 10，最大 100
  title?: string,     // 标题搜索关键词，可选
  userId?: string     // 用户 ID，可选
}
```

**请求示例**:
```bash
curl -X GET 'http://localhost:3001/trpc/posts.list?page=1&pageSize=10' \
  -H "Content-Type: application/json"
```

**响应示例**:
```json
{
  "result": {
    "data": [
      {
        "id": 1,
        "title": "这是一个测试帖子",
        "content": "这是帖子的内容",
        "tags": "技术,测试",
        "userId": "ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs",
        "thumbNum": 0,
        "favourNum": 0,
        "createTime": "2026-01-28T15:30:00.000Z",
        "updateTime": "2026-01-28T15:30:00.000Z",
        "isDelete": false
      }
    ]
  }
}
```

---

### 3.3 删除帖子

**接口路径**: `POST /trpc/posts.delete`

**权限**: 公开（实际应该需要登录或权限验证）

**请求参数**:
```typescript
{
  id: number  // 帖子 ID，必填
}
```

**请求示例**:
```bash
curl -X POST http://localhost:3001/trpc/posts.delete \
  -H "Content-Type: application/json" \
  -d '{
    "id": 1
  }'
```

**响应示例**:
```json
{
  "result": {
    "data": {
      "success": true,
      "id": 1
    }
  }
}
```

---

### 3.4 帖子列表 + 用户状态

**接口路径**: `GET /trpc/posts.listWithUserStatus`

**权限**: 公开

**请求参数**:
```typescript
{
  page?: number,      // 页码，默认 1
  pageSize?: number,  // 每页数量，默认 10，最大 100
  title?: string,     // 标题搜索关键词，可选
  userId?: string    // 用户 ID，可选
}
```

**请求示例**:
```bash
curl -X GET 'http://localhost:3001/trpc/posts.listWithUserStatus?page=1&pageSize=10' \
  -H "Content-Type: application/json" \
  -H "Cookie: session=your_session_token"
```

**响应示例**:
```json
{
  "result": {
    "data": {
      "success": true,
      "message": "查询帖子列表和用户状态成功",
      "data": {
        "items": [
          {
            "id": 1,
            "title": "这是一个测试帖子",
            "content": "这是帖子的内容",
            "tags": "技术,测试",
            "thumbNum": 10,
            "favourNum": 5,
            "userId": "ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs",
            "createTime": "2026-01-28T15:13:51.612Z",
            "updateTime": "2026-01-28T15:13:51.612Z",
            "isDelete": false,
            "isThumbed": true,    // 当前用户是否点赞
            "isFavoured": false   // 当前用户是否收藏
          },
          {
            "id": 2,
            "title": "另一个测试帖子",
            "content": "这是另一个帖子的内容",
            "tags": "开发,日志",
            "thumbNum": 8,
            "favourNum": 3,
            "userId": "user_id_002",
            "createTime": "2026-01-28T16:20:00.000Z",
            "updateTime": "2026-01-28T16:20:00.000Z",
            "isDelete": false,
            "isThumbed": false,
            "isFavoured": true
          }
        ],
        "pagination": {
          "page": 1,
          "pageSize": 10,
          "total": 50,
          "totalPages": 5
        }
      }
    }
  }
}
```

**说明**:
- `isThumbed`: 当前登录用户是否已点赞该帖子
- `isFavoured`: 当前登录用户是否已收藏该帖子
- 如果用户未登录，这两个字段都为 `false`

---

## 4. 帖子点赞接口 (postThumbs)

### 4.1 点赞帖子

**接口路径**: `POST /trpc/postThumbs.create`

**权限**: 公开

**请求参数**:
```typescript
{
  postId: number,   // 帖子 ID，必填
  userId: string    // 用户 ID，必填
}
```

**请求示例**:
```bash
curl -X POST http://localhost:3001/trpc/postThumbs.create \
  -H "Content-Type: application/json" \
  -d '{
    "postId": 1,
    "userId": "ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs"
  }'
```

**响应示例**:
```json
{
  "result": {
    "data": {
      "id": 1,
      "postId": 1,
      "userId": "ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs",
      "createTime": "2026-01-28T15:35:00.000Z"
    }
  }
}
```

**错误响应**:
- `DUPLICATE_OPERATION`: 已经点赞过了

---

### 4.2 取消点赞

**接口路径**: `POST /trpc/postThumbs.delete`

**权限**: 公开

**请求参数**:
```typescript
{
  postId: number,   // 帖子 ID，必填
  userId: string    // 用户 ID，必填
}
```

**请求示例**:
```bash
curl -X POST http://localhost:3001/trpc/postThumbs.delete \
  -H "Content-Type: application/json" \
  -d '{
    "postId": 1,
    "userId": "ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs"
  }'
```

**响应示例**:
```json
{
  "result": {
    "data": {
      "success": true,
      "id": 1
    }
  }
}
```

---

### 4.3 检查是否已点赞

**接口路径**: `GET /trpc/postThumbs.check`

**权限**: 公开

**请求参数**:
```typescript
{
  postId: number,   // 帖子 ID，必填
  userId: string    // 用户 ID，必填
}
```

**请求示例**:
```bash
curl -X GET 'http://localhost:3001/trpc/postThumbs.check?postId=1&userId=ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs' \
  -H "Content-Type: application/json"
```

**响应示例**:
```json
{
  "result": {
    "data": {
      "isLiked": true
    }
  }
}
```

---

### 4.4 获取帖子的点赞列表

**接口路径**: `GET /trpc/postThumbs.getByPostId`

**权限**: 公开

**请求参数**:
```typescript
{
  postId: number  // 帖子 ID，必填
}
```

**请求示例**:
```bash
curl -X GET 'http://localhost:3001/trpc/postThumbs.getByPostId?postId=1' \
  -H "Content-Type: application/json"
```

**响应示例**:
```json
{
  "result": {
    "data": [
      {
        "id": 1,
        "postId": 1,
        "userId": "ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs",
        "createTime": "2026-01-28T15:35:00.000Z"
      }
    ]
  }
}
```

---

### 4.5 获取用户的点赞列表

**接口路径**: `GET /trpc/postThumbs.getByUserId`

**权限**: 公开

**请求参数**:
```typescript
{
  userId: string  // 用户 ID，必填
}
```

**请求示例**:
```bash
curl -X GET 'http://localhost:3001/trpc/postThumbs.getByUserId?userId=ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs' \
  -H "Content-Type: application/json"
```

**响应示例**:
```json
{
  "result": {
    "data": [
      {
        "id": 1,
        "postId": 1,
        "userId": "ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs",
        "createTime": "2026-01-28T15:35:00.000Z"
      }
    ]
  }
}
```

---

## 5. 帖子收藏接口 (postFavours)

### 5.1 收藏帖子

**接口路径**: `POST /trpc/postFavours.create`

**权限**: 公开

**请求参数**:
```typescript
{
  postId: number,   // 帖子 ID，必填
  userId: string    // 用户 ID，必填
}
```

**请求示例**:
```bash
curl -X POST http://localhost:3001/trpc/postFavours.create \
  -H "Content-Type: application/json" \
  -d '{
    "postId": 1,
    "userId": "ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs"
  }'
```

**响应示例**:
```json
{
  "result": {
    "data": {
      "id": 1,
      "postId": 1,
      "userId": "ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs",
      "createTime": "2026-01-28T15:40:00.000Z"
    }
  }
}
```

**错误响应**:
- `DUPLICATE_OPERATION`: 已经收藏过了

---

### 5.2 取消收藏

**接口路径**: `POST /trpc/postFavours.delete`

**权限**: 公开

**请求参数**:
```typescript
{
  postId: number,   // 帖子 ID，必填
  userId: string    // 用户 ID，必填
}
```

**请求示例**:
```bash
curl -X POST http://localhost:3001/trpc/postFavours.delete \
  -H "Content-Type: application/json" \
  -d '{
    "postId": 1,
    "userId": "ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs"
  }'
```

**响应示例**:
```json
{
  "result": {
    "data": {
      "success": true,
      "id": 1
    }
  }
}
```

---

### 5.3 检查是否已收藏

**接口路径**: `GET /trpc/postFavours.check`

**权限**: 公开

**请求参数**:
```typescript
{
  postId: number,   // 帖子 ID，必填
  userId: string    // 用户 ID，必填
}
```

**请求示例**:
```bash
curl -X GET 'http://localhost:3001/trpc/postFavours.check?postId=1&userId=ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs' \
  -H "Content-Type: application/json"
```

**响应示例**:
```json
{
  "result": {
    "data": {
      "isFavoured": true
    }
  }
}
```

---

### 5.4 获取帖子的收藏列表

**接口路径**: `GET /trpc/postFavours.getByPostId`

**权限**: 公开

**请求参数**:
```typescript
{
  postId: number  // 帖子 ID，必填
}
```

**请求示例**:
```bash
curl -X GET 'http://localhost:3001/trpc/postFavours.getByPostId?postId=1' \
  -H "Content-Type: application/json"
```

**响应示例**:
```json
{
  "result": {
    "data": [
      {
        "id": 1,
        "postId": 1,
        "userId": "ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs",
        "createTime": "2026-01-28T15:40:00.000Z"
      }
    ]
  }
}
```

---

### 5.5 获取用户的收藏列表

**接口路径**: `GET /trpc/postFavours.getByUserId`

**权限**: 公开

**请求参数**:
```typescript
{
  userId: string  // 用户 ID，必填
}
```

**请求示例**:
```bash
curl -X GET 'http://localhost:3001/trpc/postFavours.getByUserId?userId=ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs' \
  -H "Content-Type: application/json"
```

**响应示例**:
```json
{
  "result": {
    "data": [
      {
        "id": 1,
        "postId": 1,
        "userId": "ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs",
        "createTime": "2026-01-28T15:40:00.000Z"
      }
    ]
  }
}
```

---

## 6. 题库接口 (questionBanks)

### 6.1 创建题库

**接口路径**: `POST /trpc/questionBanks.create`

**权限**: 公开

**请求参数**:
```typescript
{
  title: string,       // 标题，必填
  description?: string, // 描述，可选
  picture?: string,     // 图片 URL，可选
  userId: string        // 用户 ID，必填
}
```

**请求示例**:
```bash
curl -X POST http://localhost:3001/trpc/questionBanks.create \
  -H "Content-Type: application/json" \
  -d '{
    "title": "JavaScript 题库",
    "description": "JavaScript 相关面试题",
    "userId": "ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs"
  }'
```

**响应示例**:
```json
{
  "result": {
    "data": {
      "id": 1,
      "title": "JavaScript 题库",
      "description": "JavaScript 相关面试题",
      "picture": null,
      "userId": "ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs",
      "createTime": "2026-01-28T15:45:00.000Z",
      "updateTime": "2026-01-28T15:45:00.000Z",
      "isDelete": false
    }
  }
}
```

---

### 6.2 获取题库列表

**接口路径**: `GET /trpc/questionBanks.list`

**权限**: 公开

**请求参数**:
```typescript
{
  page?: number,      // 页码，默认 1
  pageSize?: number,  // 每页数量，默认 10，最大 100
  title?: string,     // 标题搜索关键词，可选
  userId?: string     // 用户 ID，可选
}
```

**请求示例**:
```bash
curl -X GET 'http://localhost:3001/trpc/questionBanks.list?page=1&pageSize=10' \
  -H "Content-Type: application/json"
```

**响应示例**:
```json
{
  "result": {
    "data": [
      {
        "id": 1,
        "title": "JavaScript 题库",
        "description": "JavaScript 相关面试题",
        "picture": null,
        "userId": "ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs",
        "createTime": "2026-01-28T15:45:00.000Z",
        "updateTime": "2026-01-28T15:45:00.000Z",
        "isDelete": false
      }
    ]
  }
}
```

---

### 6.3 删除题库

**接口路径**: `POST /trpc/questionBanks.delete`

**权限**: 公开

**请求参数**:
```typescript
{
  id: number  // 题库 ID，必填
}
```

**请求示例**:
```bash
curl -X POST http://localhost:3001/trpc/questionBanks.delete \
  -H "Content-Type: application/json" \
  -d '{
    "id": 1
  }'
```

**响应示例**:
```json
{
  "result": {
    "data": {
      "success": true,
      "id": 1
    }
  }
}
```

---

### 6.4 批量创建题库

**接口路径**: `POST /trpc/questionBanks.batchCreate`

**权限**: 公开

**请求参数**:
```typescript
{
  questionBanks: Array<{
    title: string,        // 题库标题，必填
    description?: string,  // 题库描述，可选
    picture?: string,      // 题库图片，可选
    userId: string         // 用户 ID，必填
  }>
}
```

**参数限制**:
- `questionBanks` 数组长度：1-50 条

**请求示例**:
```bash
curl -X POST http://localhost:3001/trpc/questionBanks.batchCreate \
  -H "Content-Type: application/json" \
  -d '{
    "questionBanks": [
      {
        "title": "数学题库",
        "description": "高中数学题目",
        "userId": "ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs"
      },
      {
        "title": "英语题库",
        "description": "英语四级题目",
        "userId": "ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs"
      }
    ]
  }'
```

**响应示例**:
```json
{
  "result": {
    "data": {
      "success": true,
      "message": "批量创建题库完成：成功 2，失败 0",
      "data": {
        "success": [1, 2],
        "failed": []
      }
    }
  }
}
```

---

### 6.5 批量删除题库

**接口路径**: `POST /trpc/questionBanks.batchDelete`

**权限**: 公开

**请求参数**:
```typescript
{
  ids: number[]  // 题库 ID 数组，1-50 条
}
```

**参数限制**:
- `ids` 数组长度：1-50 条

**请求示例**:
```bash
curl -X POST http://localhost:3001/trpc/questionBanks.batchDelete \
  -H "Content-Type: application/json" \
  -d '{
    "ids": [1, 2, 3]
  }'
```

**响应示例**:
```json
{
  "result": {
    "data": {
      "success": true,
      "message": "批量删除题库完成：成功 2，失败 1",
      "data": {
        "success": [1, 2],
        "failed": [
          {
            "id": 3,
            "reason": "题库不存在或已删除"
          }
        ]
      }
    }
  }
}
```

---

### 6.6 题库列表 + 题目数量

**接口路径**: `GET /trpc/questionBanks.listWithQuestionCount`

**权限**: 公开

**请求参数**:
```typescript
{
  page?: number,      // 页码，默认 1
  pageSize?: number,  // 每页数量，默认 10，最大 100
  title?: string     // 标题搜索关键词，可选
}
```

**请求示例**:
```bash
curl -X GET 'http://localhost:3001/trpc/questionBanks.listWithQuestionCount?page=1&pageSize=10' \
  -H "Content-Type: application/json"
```

**响应示例**:
```json
{
  "result": {
    "data": {
      "success": true,
      "message": "查询题库列表和题目数量成功",
      "data": {
        "items": [
          {
            "id": 1,
            "title": "数学题库",
            "description": "高中数学题目",
            "picture": "https://example.com/math.jpg",
            "userId": "ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs",
            "createTime": "2026-01-28T15:13:51.612Z",
            "updateTime": "2026-01-28T15:13:51.612Z",
            "isDelete": false,
            "questionCount": 150
          },
          {
            "id": 2,
            "title": "英语题库",
            "description": "英语四级题目",
            "picture": "https://example.com/english.jpg",
            "userId": "ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs",
            "createTime": "2026-01-28T15:13:51.612Z",
            "updateTime": "2026-01-28T15:13:51.612Z",
            "isDelete": false,
            "questionCount": 200
          }
        ],
        "pagination": {
          "page": 1,
          "pageSize": 10,
          "total": 50,
          "totalPages": 5
        }
      }
    }
  }
}
```

---

## 7. 题目接口 (questions)

### 7.1 创建题目

**接口路径**: `POST /trpc/questions.create`

**权限**: 公开

**请求参数**:
```typescript
{
  title: string,            // 标题，必填
  content: string,          // 内容，必填
  answer?: string,          // 答案，可选
  tags?: string[],          // 标签数组，可选
  questionBankId?: number,  // 题库 ID，可选
  userId: string            // 用户 ID，必填
}
```

**请求示例**:
```bash
curl -X POST http://localhost:3001/trpc/questions.create \
  -H "Content-Type: application/json" \
  -d '{
    "title": "什么是闭包？",
    "content": "请解释 JavaScript 中的闭包概念",
    "answer": "闭包是指有权访问另一个函数作用域中变量的函数",
    "tags": ["JavaScript", "基础"],
    "userId": "ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs"
  }'
```

**响应示例**:
```json
{
  "result": {
    "data": {
      "id": 1,
      "title": "什么是闭包？",
      "content": "请解释 JavaScript 中的闭包概念",
      "answer": "闭包是指有权访问另一个函数作用域中变量的函数",
      "tags": "[\"JavaScript\",\"基础\"]",
      "questionBankId": null,
      "userId": "ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs",
      "createTime": "2026-01-28T15:50:00.000Z",
      "updateTime": "2026-01-28T15:50:00.000Z",
      "isDelete": false
    }
  }
}
```

---

### 7.2 获取题目列表

**接口路径**: `GET /trpc/questions.list`

**权限**: 公开

**请求参数**:
```typescript
{
  page?: number,          // 页码，默认 1
  pageSize?: number,      // 每页数量，默认 10，最大 100
  title?: string,         // 标题搜索关键词，可选
  userId?: string,        // 用户 ID，可选
  questionBankId?: number // 题库 ID，可选
}
```

**请求示例**:
```bash
curl -X GET 'http://localhost:3001/trpc/questions.list?page=1&pageSize=10' \
  -H "Content-Type: application/json"
```

**响应示例**:
```json
{
  "result": {
    "data": [
      {
        "id": 1,
        "title": "什么是闭包？",
        "content": "请解释 JavaScript 中的闭包概念",
        "answer": "闭包是指有权访问另一个函数作用域中变量的函数",
        "tags": "[\"JavaScript\",\"基础\"]",
        "questionBankId": null,
        "userId": "ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs",
        "createTime": "2026-01-28T15:50:00.000Z",
        "updateTime": "2026-01-28T15:50:00.000Z",
        "isDelete": false
      }
    ]
  }
}
```

---

### 7.3 批量创建题目

**接口路径**: `POST /trpc/questions.batchCreate`

**权限**: 公开

**请求参数**:
```typescript
{
  questions: Array<{
    title: string,              // 题目标题，必填
    content: string,            // 题目内容，必填
    answer?: string,             // 答案，可选
    tags?: string[],             // 标签数组，可选
    questionBankId?: number,     // 题库 ID，可选
    userId: string               // 用户 ID，必填
  }>
}
```

**参数限制**:
- `questions` 数组长度：1-100 条

**请求示例**:
```bash
curl -X POST http://localhost:3001/trpc/questions.batchCreate \
  -H "Content-Type: application/json" \
  -d '{
    "questions": [
      {
        "title": "什么是闭包？",
        "content": "请解释 JavaScript 中的闭包概念",
        "answer": "闭包是指有权访问另一个函数作用域中变量的函数",
        "tags": ["JavaScript", "基础"],
        "userId": "ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs"
      },
      {
        "title": "什么是原型？",
        "content": "请解释 JavaScript 中的原型概念",
        "answer": "原型是 JavaScript 对象之间继承的基础",
        "tags": ["JavaScript", "基础"],
        "userId": "ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs"
      }
    ]
  }'
```

**响应示例**:
```json
{
  "result": {
    "data": {
      "success": true,
      "message": "批量创建题目完成：成功 2，失败 0",
      "data": {
        "success": [1, 2],
        "failed": []
      }
    }
  }
}
```

---

### 7.4 批量删除题目

**接口路径**: `POST /trpc/questions.batchDelete`

**权限**: 公开

**请求参数**:
```typescript
{
  ids: number[]  // 题目 ID 数组，1-100 条
}
```

**参数限制**:
- `ids` 数组长度：1-100 条

**请求示例**:
```bash
curl -X POST http://localhost:3001/trpc/questions.batchDelete \
  -H "Content-Type: application/json" \
  -d '{
    "ids": [1, 2, 3]
  }'
```

**响应示例**:
```json
{
  "result": {
    "data": {
      "success": true,
      "message": "批量删除题目完成：成功 2，失败 1",
      "data": {
        "success": [1, 2],
        "failed": [
          {
            "id": 3,
            "reason": "题目不存在或已删除"
          }
        ]
      }
    }
  }
}
```

---

## 8. 文件上传接口 (upload)

### 8.1 上传头像

**接口路径**: `POST /trpc/upload.uploadAvatar`

**权限**: 需要登录

**请求参数**: `multipart/form-data`

```
file: File  // 图片文件
```

**文件限制**:
- 支持格式：JPEG, PNG, GIF, WebP, SVG
- 文件大小：最大 5MB
- 处理方式：自动压缩为 200x200，JPEG 格式，85% 质量

**请求示例**:
```bash
curl -X POST http://localhost:3001/trpc/upload.uploadAvatar \
  -F "file=@/path/to/avatar.jpg" \
  -H "Cookie: session=your_session_token"
```

**响应示例**:
```json
{
  "result": {
    "data": {
      "success": true,
      "message": "头像上传成功",
      "data": {
        "filename": "1769933000000_abc123.jpg",
        "originalName": "avatar.jpg",
        "size": 102400,
        "mimetype": "image/jpeg",
        "path": "/path/to/uploads/avatar/1769933000000_abc123.jpg",
        "url": "http://localhost:3001/uploads/avatar/1769933000000_abc123.jpg"
      }
    }
  }
}
```

---

### 8.2 上传附件

**接口路径**: `POST /trpc/upload.uploadAttachment`

**权限**: 需要登录

**请求参数**: `multipart/form-data`

```
file: File  // 文件
```

**文件限制**:
- 支持格式：JPEG, PNG, GIF, WebP, SVG, PDF, Word, Excel, Text, Markdown
- 文件大小：最大 10MB
- 图片处理：自动压缩为 1920x1080，JPEG 格式，80% 质量
- 文档：直接保存

**请求示例**:
```bash
curl -X POST http://localhost:3001/trpc/upload.uploadAttachment \
  -F "file=@/path/to/document.pdf" \
  -H "Cookie: session=your_session_token"
```

**响应示例**:
```json
{
  "result": {
    "data": {
      "success": true,
      "message": "附件上传成功",
      "data": {
        "filename": "1769933000000_xyz789.pdf",
        "originalName": "document.pdf",
        "size": 2048000,
        "mimetype": "application/pdf",
        "path": "/path/to/uploads/attachment/1769933000000_xyz789.pdf",
        "url": "http://localhost:3001/uploads/attachment/1769933000000_xyz789.pdf"
      }
    }
  }
}
```

---

### 8.3 删除文件

**接口路径**: `POST /trpc/upload.deleteFile`

**权限**: 需要登录

**请求参数**:
```typescript
{
  filename: string,  // 文件名
  type: 'avatar' | 'attachment'  // 文件类型
}
```

**请求示例**:
```bash
curl -X POST http://localhost:3001/trpc/upload.deleteFile \
  -H "Content-Type: application/json" \
  -H "Cookie: session=your_session_token" \
  -d '{
    "filename": "1769933000000_abc123.jpg",
    "type": "avatar"
  }'
```

**响应示例**:
```json
{
  "result": {
    "data": {
      "success": true,
      "message": "文件删除成功"
    }
  }
}
```

---

### 8.4 获取文件信息

**接口路径**: `POST /trpc/upload.getFileInfo`

**权限**: 需要登录

**请求参数**:
```typescript
{
  filename: string,  // 文件名
  type: 'avatar' | 'attachment'  // 文件类型
}
```

**请求示例**:
```bash
curl -X POST http://localhost:3001/trpc/upload.getFileInfo \
  -H "Content-Type: application/json" \
  -H "Cookie: session=your_session_token" \
  -d '{
    "filename": "1769933000000_abc123.jpg",
    "type": "avatar"
  }'
```

**响应示例**:
```json
{
  "result": {
    "data": {
      "success": true,
      "message": "获取文件信息成功",
      "data": {
        "filename": "1769933000000_abc123.jpg",
        "originalName": "avatar.jpg",
        "size": 102400,
        "mimetype": "image/jpeg",
        "path": "/path/to/uploads/avatar/1769933000000_abc123.jpg",
        "url": "http://localhost:3001/uploads/avatar/1769933000000_abc123.jpg"
      }
    }
  }
}
```

---

### 8.5 批量删除文件

**接口路径**: `POST /trpc/upload.batchDeleteFiles`

**权限**: 管理员

**请求参数**:
```typescript
{
  files: Array<{
    filename: string,  // 文件名
    type: 'avatar' | 'attachment'  // 文件类型
  }>
}
```

**请求示例**:
```bash
curl -X POST http://localhost:3001/trpc/upload.batchDeleteFiles \
  -H "Content-Type: application/json" \
  -H "Cookie: session=your_session_token" \
  -d '{
    "files": [
      {
        "filename": "1769933000000_abc123.jpg",
        "type": "avatar"
      },
      {
        "filename": "1769933000000_xyz789.pdf",
        "type": "attachment"
      }
    ]
  }'
```

**响应示例**:
```json
{
  "result": {
    "data": {
      "success": true,
      "message": "批量删除文件完成：成功 2，失败 0",
      "data": {
        "success": ["1769933000000_abc123.jpg", "1769933000000_xyz789.pdf"],
        "failed": []
      }
    }
  }
}
```

---

## 9. 其他接口

### 8.1 健康检查

**接口路径**: `GET /trpc/health`

**权限**: 公开

**请求参数**: 无

**请求示例**:
```bash
curl -X GET http://localhost:3001/trpc/health
```

**响应示例**:
```json
{
  "result": {
    "data": {
      "status": "ok",
      "timestamp": "2026-01-28T15:55:00.000Z"
    }
  }
}
```

---

### 8.2 Hello 接口

**接口路径**: `GET /trpc/hello`

**权限**: 公开

**请求参数**:
```typescript
{
  name: string  // 名字，必填
}
```

**请求示例**:
```bash
curl -X GET 'http://localhost:3001/trpc/hello?name=World'
```

**响应示例**:
```json
{
  "result": {
    "data": {
      "message": "Hello World!"
    }
  }
}
```

---

## 通用错误响应

所有接口可能返回以下错误：

```json
{
  "success": false,
  "error": {
    "message": "错误描述",
    "code": "ERROR_CODE",
    "stack": "错误堆栈信息（仅开发环境）"
  }
}
```

### 常见错误码

- `BAD_REQUEST` (400): 请求参数错误
- `VALIDATION_ERROR` (400): 参数验证失败（Zod）
- `UNAUTHORIZED` (401): 未授权访问
- `FORBIDDEN` (403): 权限不足
- `RESOURCE_NOT_FOUND` (404): 资源不存在
- `DUPLICATE_OPERATION` (409): 重复操作
- `INTERNAL_SERVER_ERROR` (500): 服务器内部错误

### Zod 验证错误示例

当请求参数验证失败时，返回详细的验证错误：

```json
{
  "success": false,
  "error": {
    "message": "参数验证失败",
    "code": "VALIDATION_ERROR",
    "validationErrors": [
      {
        "path": "email",
        "message": "Invalid email format"
      },
      {
        "path": "password",
        "message": "Password too short"
      }
    ]
  }
}
```

### 使用错误处理器

在代码中使用全局异常处理器：

```typescript
import { throwIfNull, throwIf } from './lib/exception';
import { ErrorType } from './lib/errors';

// 检查资源是否存在
throwIfNull(user, ErrorType.USER_NOT_FOUND);

// 自定义消息
throwIfNull(user, ErrorType.USER_NOT_FOUND, '用户不存在', { userId });

// 条件抛出异常
throwIf(!hasPermission, ErrorType.FORBIDDEN, '无权限访问');
```

---

## 注意事项

1. 所有时间戳均为 ISO 8601 格式
2. 用户 ID 为字符串类型，其他 ID 为数字类型
3. 删除操作为软删除，不会真正删除数据，只是标记 `isDelete` 为 `true`
4. 分页接口默认返回第一页，每页 10 条数据
5. 搜索接口支持模糊匹配
6. 所有错误响应都使用统一的格式（见上方"错误响应格式说明"）
7. Zod 验证错误会自动格式化并返回详细的验证错误信息
8. 开发环境会返回堆栈信息，生产环境会隐藏