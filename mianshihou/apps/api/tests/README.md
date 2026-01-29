# 测试指南

本项目使用 **Bun Test** 作为测试框架，它内置在 Bun 中，性能优秀且配置简单。

## 目录结构

```
tests/
├── setup.ts              # 测试工具和环境设置
├── unit/                 # 单元测试
│   ├── exception.test.ts
│   └── cookie-utils.test.ts
└── integration/          # 集成测试
    ├── auth.test.ts
    └── trpc.test.ts
```

## 运行测试

### 运行所有测试
```bash
bun test
```

### 只运行单元测试
```bash
bun test tests/unit
```

### 只运行集成测试
```bash
bun test tests/integration
```

### 监听模式（文件变化时自动重新运行）
```bash
bun test --watch
```

### 生成覆盖率报告
```bash
bun test --coverage
```

### 运行特定测试文件
```bash
bun test tests/unit/exception.test.ts
```

## 编写测试

### 单元测试示例

单元测试用于测试单个函数、类或模块的功能。

```typescript
import { describe, it, expect } from 'bun:test'
import { throwIfNull } from '../../lib/exception'
import { ErrorType } from '../../lib/errors'

describe('Exception Utils', () => {
  describe('throwIfNull', () => {
    it('should throw when value is null', () => {
      expect(() => {
        throwIfNull(null, ErrorType.USER_NOT_FOUND)
      }).toThrow('Resource not found')
    })

    it('should not throw when value is not null', () => {
      expect(() => {
        throwIfNull('valid value', ErrorType.USER_NOT_FOUND)
      }).not.toThrow()
    })
  })
})
```

### 集成测试示例

集成测试用于测试多个组件或系统的协作。

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import Fastify from 'fastify'
import { auth } from '../../lib/auth'

describe('Authentication Integration Tests', () => {
  let server: Fastify.FastifyInstance
  let port = 3002

  beforeAll(async () => {
    // 设置测试服务器
    server = Fastify({ logger: false })
    
    // 注册路由
    server.all('/api/auth/*', async (request, reply) => {
      // 处理认证请求
    })

    // 启动测试服务器
    await server.listen({ port })
  })

  afterAll(async () => {
    // 清理测试数据
    await cleanupTestData()
    
    // 关闭测试服务器
    await server.close()
  })

  it('should register a new user successfully', async () => {
    const response = await fetch(`http://localhost:${port}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'test123456',
        name: 'Test User',
      }),
    })

    expect(response.status).toBe(200)
    
    const data = await response.json()
    expect(data.user).toBeDefined()
    expect(data.user.email).toBe('test@example.com')
  })
})
```

## 测试工具

### setup.ts 提供的工具函数

```typescript
import { 
  cleanupTestData, 
  createTestUser, 
  createTestSession,
  createMockRequest,
  createMockResponse,
  TestUtils 
} from '../setup'

// 清理测试数据
await cleanupTestData()

// 创建测试用户
const user = await createTestUser({
  email: 'test@example.com',
  userName: 'Test User',
})

// 创建测试会话
const session = await createTestSession(user.id)

// 创建模拟请求对象
const mockRequest = createMockRequest()

// 创建模拟响应对象
const mockResponse = createMockResponse()

// 生成测试邮箱
const testEmail = TestUtils.generateTestEmail()
```

## 测试最佳实践

### 1. 测试命名

- 使用描述性的测试名称
- 测试名称应该说明它测试什么和期望的结果

```typescript
// 好的测试名称
it('should throw error when user is not found', () => {})
it('should return user data when user exists', () => {})

// 不好的测试名称
it('test user', () => {})
it('check error', () => {})
```

### 2. 测试隔离

- 每个测试应该独立运行
- 使用 `beforeAll` 和 `afterAll` 设置和清理测试环境
- 使用 `beforeEach` 和 `afterEach` 清理每个测试的数据

```typescript
describe('User Service', () => {
  beforeAll(async () => {
    // 设置测试数据库
    await setupTestDatabase()
  })

  afterAll(async () => {
    // 清理测试数据库
    await cleanupTestDatabase()
  })

  beforeEach(async () => {
    // 每个测试前清理数据
    await cleanupTestData()
  })

  it('should create user', async () => {
    // 测试代码
  })
})
```

### 3. 使用唯一的测试数据

- 使用时间戳或 UUID 生成唯一的测试数据
- 避免测试之间的数据冲突

```typescript
const testEmail = `test-${Date.now()}@example.com`
const testUserId = `test-user-${Date.now()}`
```

### 4. 测试边界情况

- 测试正常情况
- 测试错误情况
- 测试边界值

```typescript
describe('Password Validation', () => {
  it('should accept valid password', () => {
    expect(validatePassword('ValidPass123')).toBe(true)
  })

  it('should reject password that is too short', () => {
    expect(validatePassword('12345')).toBe(false)
  })

  it('should reject password that is too long', () => {
    expect(validatePassword('a'.repeat(129))).toBe(false)
  })
})
```

### 5. 使用 Mock 对象

- 使用 mock 对象模拟外部依赖
- 避免在测试中使用真实的数据库或外部 API

```typescript
const mockRequest = createMockRequest()
const mockResponse = createMockResponse()

await handler(mockRequest, mockResponse)
```

## 测试覆盖率

### 生成覆盖率报告

```bash
bun test --coverage
```

覆盖率报告会生成在 `coverage/` 目录中。

### 查看覆盖率报告

```bash
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
start coverage/index.html  # Windows
```

## 常见问题

### 1. 测试超时

如果测试超时，可以在 `bunfig.toml` 中增加超时时间：

```toml
[test]
timeout = 60000  # 60秒
```

### 2. 数据库连接错误

确保 `.env` 文件中配置了正确的数据库连接字符串：

```env
DATABASE_URL=postgres://user:password@localhost:5432/test_db
```

### 3. 端口冲突

如果测试服务器端口冲突，可以修改测试文件中的端口号：

```typescript
let port = 3004  // 修改为其他端口
```

## 下一步

1. 为每个模块添加单元测试
2. 为关键业务逻辑添加集成测试
3. 设置 CI/CD 自动运行测试
4. 定期检查测试覆盖率，保持高覆盖率

## 参考资料

- [Bun Test 文档](https://bun.sh/docs/test)
- [Testing Best Practices](https://testingjavascript.com/)
- [单元测试 vs 集成测试](https://martinfowler.com/bliki/UnitTest.html)