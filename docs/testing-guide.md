# 测试使用指南

## 快速开始

### 1. 运行所有测试
```bash
bun test
```

### 2. 运行单元测试
```bash
bun test tests/unit
```

### 3. 运行集成测试
```bash
bun test tests/integration
```

### 4. 监听模式（开发时使用）
```bash
bun test --watch
```

### 5. 生成覆盖率报告
```bash
bun test --coverage
```

## 测试结果

### 单元测试（已通过 ✅）

```
14 pass
0 fail
18 expect() calls
Ran 14 tests across 2 files. [75.00ms]

覆盖率：
- All files: 60% 函数, 85.45% 行数
- lib/errors.ts: 100% 函数, 100% 行数
- lib/exception.ts: 80% 函数, 98.51% 行数
- lib/cookie-utils.ts: 40% 函数, 46.43% 行数
- lib/logger.ts: 20% 函数, 96.88% 行数
```

### 集成测试（待运行）

集成测试需要：
1. 数据库连接
2. 独立的测试端口
3. 测试数据清理

运行集成测试：
```bash
bun test tests/integration
```

## 测试文件结构

```
tests/
├── setup.ts              # 测试工具和环境设置
├── unit/                 # 单元测试
│   ├── exception.test.ts  # 异常处理测试 ✅
│   └── cookie-utils.test.ts  # Cookie 工具测试 ✅
└── integration/          # 集成测试
    ├── auth.test.ts      # 认证流程测试
    └── trpc.test.ts      # tRPC 接口测试
```

## 编写新测试

### 单元测试模板

```typescript
import { describe, it, expect } from 'bun:test'
import { yourFunction } from '../../lib/your-module'

describe('Your Module', () => {
  it('should do something', () => {
    const result = yourFunction('input')
    expect(result).toBe('expected output')
  })

  it('should throw error for invalid input', () => {
    expect(() => {
      yourFunction('invalid')
    }).toThrow('Error message')
  })
})
```

### 集成测试模板

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import Fastify from 'fastify'
import { db } from '../../index'
import { users } from '../../db/schema'
import { eq } from 'drizzle-orm'

describe('Your Integration Test', () => {
  let server: Fastify.FastifyInstance
  let port = 3004

  beforeAll(async () => {
    // 设置测试服务器
    server = Fastify({ logger: false })
    
    // 注册路由
    server.all('/api/*', async (request, reply) => {
      // 处理请求
    })

    // 启动测试服务器
    await server.listen({ port })
  })

  afterAll(async () => {
    // 清理测试数据
    await db.delete(users).where(eq(users.id, ''))
    
    // 关闭测试服务器
    await server.close()
  })

  it('should test something', async () => {
    const response = await fetch(`http://localhost:${port}/api/test`)
    expect(response.status).toBe(200)
    
    const data = await response.json()
    expect(data).toBeDefined()
  })
})
```

## 测试工具函数

### setup.ts 提供的工具

```typescript
import { 
  cleanupTestData,      // 清理测试数据
  createTestUser,       // 创建测试用户
  createTestSession,    // 创建测试会话
  createMockRequest,    // 创建模拟请求
  createMockResponse,   // 创建模拟响应
  TestUtils            // 测试工具类
} from '../setup'

// 示例：创建测试用户
const user = await createTestUser({
  email: 'test@example.com',
  userName: 'Test User',
})

// 示例：生成唯一测试数据
const testEmail = TestUtils.generateTestEmail()
const testUserId = TestUtils.generateTestUserId()
```

## 常用测试模式

### 1. 测试异步函数

```typescript
it('should handle async operations', async () => {
  const result = await asyncFunction()
  expect(result).toBeDefined()
})
```

### 2. 测试错误处理

```typescript
it('should throw error for invalid input', () => {
  expect(() => {
    yourFunction(null)
  }).toThrow('Invalid input')
})
```

### 3. 测试 HTTP 请求

```typescript
it('should make HTTP request', async () => {
  const response = await fetch('http://localhost:3001/api/test')
  expect(response.status).toBe(200)
  
  const data = await response.json()
  expect(data.success).toBe(true)
})
```

### 4. 测试数据库操作

```typescript
it('should create and retrieve user', async () => {
  const [user] = await db.insert(users).values({
    email: 'test@example.com',
    userName: 'Test User',
  }).returning()
  
  expect(user).toBeDefined()
  expect(user.email).toBe('test@example.com')
  
  // 清理
  await db.delete(users).where(eq(users.id, user.id))
})
```

## 测试最佳实践

### 1. 测试命名

```typescript
// ✅ 好的命名
it('should throw error when user is not found', () => {})
it('should return user data when user exists', () => {})

// ❌ 不好的命名
it('test user', () => {})
it('check error', () => {})
```

### 2. 使用唯一的测试数据

```typescript
// ✅ 使用时间戳生成唯一数据
const testEmail = `test-${Date.now()}@example.com`
const testUserId = `test-user-${Date.now()}`

// ❌ 使用固定数据（可能导致测试冲突）
const testEmail = 'test@example.com'
```

### 3. 测试隔离

```typescript
// ✅ 每个测试独立运行
beforeEach(async () => {
  await cleanupTestData()
})

// ❌ 测试之间有依赖
it('should create user', async () => {
  // 创建用户
})

it('should update user', async () => {
  // 依赖上一个测试创建的用户
})
```

### 4. 测试边界情况

```typescript
// ✅ 测试正常、错误、边界情况
it('should accept valid input', () => {})
it('should reject null input', () => {})
it('should reject empty string', () => {})
it('should reject too long input', () => {})

// ❌ 只测试正常情况
it('should accept valid input', () => {})
```

## 持续集成

### GitHub Actions 示例

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test
      - run: bun test --coverage
```

## 下一步

1. ✅ 单元测试已完成（14 个测试全部通过）
2. ⏳ 运行集成测试（需要数据库连接）
3. ⏳ 为其他模块添加测试
4. ⏳ 设置 CI/CD 自动运行测试
5. ⏳ 提高测试覆盖率到 80% 以上

## 参考资料

- [Bun Test 文档](https://bun.sh/docs/test)
- [测试最佳实践](https://testingjavascript.com/)
- [单元测试 vs 集成测试](https://martinfowler.com/bliki/UnitTest.html)
- [测试覆盖率指南](https://jestjs.io/docs/configuration#collectcoverage-boolean)