# tRPC 缓存中间件踩坑记录

本文档记录了在实现 tRPC 缓存中间件过程中遇到的问题和解决方案。

---

## 问题 1: 缓存中间件无法识别 tRPC 类型和输入

### 问题描述
缓存中间件无法正确识别 tRPC 的 query/mutation 类型和输入数据，导致缓存逻辑错误。

### 错误代码
```typescript
export function cacheMiddleware(options: CacheMiddlewareOptions = {}) {
  return async ({ ctx, next, input, type }: any) => {
    // type 和 input 可能未定义
    if (type !== 'query') {
      return next()
    }
    // ...
  }
}
```

### 解决方案
```typescript
export function cacheMiddleware(options: CacheMiddlewareOptions = {}) {
  return async (opts: any) => {
    const { ctx, next, input, type } = opts
    
    // 只对查询操作进行缓存
    if (type !== 'query') {
      return next()
    }
    
    // 生成缓存键
    const cacheKey = options.keyGenerator
      ? options.keyGenerator(ctx, input)
      : generateDefaultCacheKey(ctx, input)
    
    // ...
  }
}
```

### 关键要点
- tRPC 中间件接收一个包含 `ctx`, `next`, `input`, `type` 的对象
- `type` 字段标识操作类型：'query' 或 'mutation'
- 只对 query 操作进行缓存，mutation 操作直接执行

---

## 问题 2: 缓存键生成时机错误

### 问题描述
在 tRPC input 验证之前生成缓存键，导致无法使用验证后的输入数据。

### 错误代码
```typescript
const appRouter = t.router({
  getUser: t.procedure
    .use(cacheMiddleware({
      keyGenerator: (ctx, input) => `user:${input.id}`  // input 未验证
    }))
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.query(input.id)
    }),
})
```

### 错误原因
中间件在 input 验证之前执行，`input` 可能是原始数据而不是验证后的数据。

### 解决方案
```typescript
const appRouter = t.router({
  getUser: t.procedure
    .input(z.object({ id: z.number() }))
    .use(cacheMiddleware({
      keyGenerator: (ctx, input) => `user:${input.id}`  // input 已验证
    }))
    .query(async ({ input }) => {
      return db.query(input.id)
    }),
})
```

### 关键要点
- tRPC 中间件执行顺序：input 验证 → 中间件 → resolver
- 将中间件放在 `.input()` 之后，确保使用验证后的输入
- 或者使用 `ctx._def._input` 获取原始输入类型

---

## 问题 3: 缓存失效策略与路由不匹配

### 问题描述
缓存失效中间件的标签与实际路由的缓存标签不匹配，导致缓存无法正确失效。

### 错误代码
```typescript
const appRouter = t.router({
  listPosts: t.procedure
    .use(cacheMiddleware({
      tags: ['posts'],  // 缓存标签
    }))
    .query(async () => {
      return db.query('SELECT * FROM posts')
    }),

  createPost: t.procedure
    .use(invalidateCacheMiddleware({
      tags: ['post'],  // 标签不匹配！
    }))
    .mutation(async ({ input }) => {
      return db.insert('posts').values(input)
    }),
})
```

### 解决方案
```typescript
const appRouter = t.router({
  listPosts: t.procedure
    .use(cacheMiddleware({
      tags: ['posts'],  // 缓存标签
    }))
    .query(async () => {
      return db.query('SELECT * FROM posts')
    }),

  createPost: t.procedure
    .use(invalidateCacheMiddleware({
      tags: ['posts'],  // 标签匹配
    }))
    .mutation(async ({ input }) => {
      return db.insert('posts').values(input)
    }),
})
```

### 关键要点
- 确保缓存失效中间件的标签与缓存中间件的标签完全匹配
- 使用统一的标签命名规范：`{module}:{entity}`
- 建议在路由定义时明确注释标签含义

---

## 问题 4: 缓存键冲突

### 问题描述
不同路由生成相同的缓存键，导致缓存数据混乱。

### 错误代码
```typescript
// 路由 1
listPosts: t.procedure
  .use(cacheMiddleware({
    keyGenerator: (ctx, input) => `list:${input.page}`,  // 可能冲突
  }))
  .query(async ({ input }) => {
    return db.query('SELECT * FROM posts')
  }),

// 路由 2
listUsers: t.procedure
  .use(cacheMiddleware({
    keyGenerator: (ctx, input) => `list:${input.page}`,  // 冲突！
  }))
  .query(async ({ input }) => {
    return db.query('SELECT * FROM users')
  }),
})
```

### 解决方案
```typescript
// 路由 1
listPosts: t.procedure
  .use(cacheMiddleware({
    keyGenerator: (ctx, input) => `posts:list:${input.page}`,
  }))
  .query(async ({ input }) => {
    return db.query('SELECT * FROM posts')
  }),

// 路由 2
listUsers: t.procedure
  .use(cacheMiddleware({
    keyGenerator: (ctx, input) => `users:list:${input.page}`,
  }))
  .query(async ({ input }) => {
    return db.query('SELECT * FROM users')
  }),
})
```

### 关键要点
- 缓存键应该包含路由信息，避免冲突
- 使用 `module:action:params` 格式生成缓存键
- 对于复杂的路由，可以使用完整的路径：`router1.router2.action`

---

## 问题 5: 缓存序列化问题

### 问题描述
缓存的数据包含特殊类型（BigInt、Date、Buffer），导致序列化失败或反序列化错误。

### 错误代码
```typescript
const data = {
  id: BigInt(123),
  createdAt: new Date(),
  buffer: Buffer.from('hello'),
}

await cache.set('key', data)  // 序列化失败
```

### 解决方案
```typescript
// 方案 1：自定义序列化
function serialize(value: any): string {
  return JSON.stringify(value, (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString()
    }
    if (value instanceof Date) {
      return value.toISOString()
    }
    if (Buffer.isBuffer(value)) {
      return value.toString('base64')
    }
    return value
  })
}

function deserialize(value: string): any {
  return JSON.parse(value, (key, value) => {
    if (key === 'id' && typeof value === 'string' && /^\d+$/.test(value)) {
      return BigInt(value)
    }
    if (key === 'createdAt' && typeof value === 'string') {
      return new Date(value)
    }
    if (key === 'buffer' && typeof value === 'string') {
      return Buffer.from(value, 'base64')
    }
    return value
  })
}

// 方案 2：使用标准库（推荐）
import { parse, stringify } from 'lossless-json'

await cache.set('key', stringify(data))
const data = parse(await cache.get('key'))
```

### 关键要点
- 避免缓存包含特殊类型的数据
- 如果必须缓存，使用自定义序列化或 lossless-json
- 考虑只缓存需要的数据，而不是整个对象

---

## 问题 6: 缓存中间件与 tRPC Context 不兼容

### 问题描述
缓存中间件无法访问 tRPC 的 Context，导致无法基于用户信息生成缓存键。

### 错误代码
```typescript
export function cacheMiddleware(options: CacheMiddlewareOptions = {}) {
  return async ({ ctx, next }: any) => {
    // ctx 可能不包含用户信息
    const userId = ctx.user?.id
    const cacheKey = `user:${userId}:data`
    // ...
  }
}
```

### 解决方案
```typescript
// 在 tRPC Context 中添加用户信息
export const createContext = async () => {
  return {
    user: await getUserFromSession(),
  }
}

// 在缓存中间件中使用
export function cacheMiddleware(options: CacheMiddlewareOptions = {}) {
  return async ({ ctx, next }: any) => {
    const userId = ctx.user?.id || 'anonymous'
    const cacheKey = `user:${userId}:${options.key}`
    // ...
  }
}
```

### 关键要点
- 确保缓存中间件能够访问必要的 Context 数据
- 对于需要用户信息的缓存，确保认证中间件在缓存中间件之前执行
- 使用默认值处理 Context 中可能缺失的数据

---

## 问题 7: 缓存失效时机错误

### 问题描述
在 mutation 中清除缓存，但清除时机不正确，导致其他请求仍然使用旧数据。

### 错误代码
```typescript
createPost: t.procedure
  .use(cacheMiddleware({ tags: ['posts'] }))  // 错误：mutation 不应该缓存
  .use(invalidateCacheMiddleware({ tags: ['posts'] }))
  .mutation(async ({ input }) => {
    return db.insert('posts').values(input)
  }),
```

### 解决方案
```typescript
createPost: t.procedure
  .use(invalidateCacheMiddleware({ tags: ['posts'] }))  // 只使用失效中间件
  .mutation(async ({ input }) => {
    return db.insert('posts').values(input)
  }),
```

### 关键要点
- mutation 操作不应该使用缓存中间件
- 只在 mutation 操作中使用缓存失效中间件
- 确保缓存失效在数据库操作之后执行

---

## 最佳实践

### 1. 缓存键命名规范
```typescript
// 格式：{module}:{action}:{params}
keyGenerator: (ctx, input) => `posts:list:page:${input.page}`
keyGenerator: (ctx, input) => `users:byId:${input.id}`
keyGenerator: (ctx, input) => `questions:list:tag:${input.tag}`
```

### 2. 缓存 TTL 配置
```typescript
// 热点数据：短 TTL
hotData: t.procedure
  .use(cacheMiddleware({ ttl: 60 }))

// 温点数据：中等 TTL
warmData: t.procedure
  .use(cacheMiddleware({ ttl: 300 }))

// 冷点数据：长 TTL
coldData: t.procedure
  .use(cacheMiddleware({ ttl: 1800 }))
```

### 3. 标签使用规范
```typescript
// 按模块分组
tags: ['posts', 'posts:detail']

// 按用户分组
tags: [`user:${userId}`, 'user:profile']

// 按实体分组
tags: [`post:${postId}`, 'post:comments']
```

### 4. 中间件执行顺序
```typescript
const appRouter = t.router({
  // 1. Input 验证
  getUser: t.procedure
    .input(z.object({ id: z.number() }))
    // 2. 认证中间件
    .use(authMiddleware)
    // 3. 权限中间件
    .use(permissionMiddleware)
    // 4. 缓存中间件
    .use(cacheMiddleware({ ttl: 300 }))
    // 5. Resolver
    .query(async ({ input }) => {
      return db.query('SELECT * FROM users WHERE id = ?', [input.id])
    }),
})
```

### 5. 错误处理
```typescript
export function cacheMiddleware(options: CacheMiddlewareOptions = {}) {
  return async ({ ctx, next }: any) => {
    try {
      const cached = await cache.get(cacheKey)
      if (cached !== undefined) {
        return cached
      }

      const result = await next()
      await cache.set(cacheKey, result, options)
      return result
    } catch (error) {
      logger.error('Cache middleware error:', error)
      // 降级到直接执行
      return next()
    }
  }
}
```

---

## 完整示例

### 基本用法
```typescript
import { initTRPC } from '@trpc/server'
import { cacheMiddleware, invalidateCacheMiddleware } from './middleware/cache'

const t = initTRPC.context<Context>().create()

const appRouter = t.router({
  // 缓存查询结果
  posts: t.router({
    list: t.procedure
      .input(z.object({ page: z.number().optional().default(1) }))
      .use(cacheMiddleware({
        ttl: 300,
        randomTtl: 60,
        keyGenerator: (ctx, input) => `posts:list:page:${input.page}`,
        tags: ['posts'],
      }))
      .query(async ({ input }) => {
        return db.query('SELECT * FROM posts LIMIT ? OFFSET ?', [10, (input.page - 1) * 10])
      }),

    byId: t.procedure
      .input(z.object({ id: z.number() }))
      .use(cacheMiddleware({
        ttl: 600,
        keyGenerator: (ctx, input) => `posts:byId:${input.id}`,
        tags: ['posts', `post:${input.id}`],
      }))
      .query(async ({ input }) => {
        return db.query('SELECT * FROM posts WHERE id = ?', [input.id])
      }),
  }),

  // 创建和更新时清除缓存
  createPost: t.procedure
    .input(z.object({ title: z.string(), content: z.string() }))
    .use(invalidateCacheMiddleware({ tags: ['posts'] }))
    .mutation(async ({ input }) => {
      return db.insert('posts').values(input)
    }),

  updatePost: t.procedure
    .input(z.object({ id: z.number(), title: z.string().optional(), content: z.string().optional() }))
    .use(invalidateCacheMiddleware({ tags: ['posts', `post:${input.id}`] }))
    .mutation(async ({ input }) => {
      return db.update('posts').set(input).where('id', input.id)
    }),

  deletePost: t.procedure
    .input(z.object({ id: z.number() }))
    .use(invalidateCacheMiddleware({ tags: ['posts', `post:${input.id}`] }))
    .mutation(async ({ input }) => {
      return db.delete('posts').where('id', input.id)
    }),
})
```

### 高级用法：动态缓存策略
```typescript
const appRouter = t.router({
  // 根据用户角色动态调整 TTL
  getDashboard: t.procedure
    .use(authMiddleware)
    .use(cacheMiddleware({
      ttl: (ctx) => {
        // 管理员用户：短 TTL
        if (ctx.user.role === 'admin') {
          return 60
        }
        // 普通用户：长 TTL
        return 300
      },
      keyGenerator: (ctx) => `dashboard:${ctx.user.id}`,
      tags: [`user:${ctx.user.id}`],
    }))
    .query(async () => {
      return generateDashboard()
    }),

  // 条件缓存：只有特定用户才缓存
  getPremiumContent: t.procedure
    .use(authMiddleware)
    .use(cacheMiddleware({
      ttl: 600,
      enableNullCache: true,
      keyGenerator: (ctx) => `premium:${ctx.user.id}`,
      tags: [`user:${ctx.user.id}`],
      shouldCache: (ctx) => ctx.user.isPremium,  // 条件缓存
    }))
    .query(async () => {
      return getPremiumContent()
    }),
})
```

---

## 性能优化

### 1. 减少缓存键计算开销
```typescript
// 预编译缓存键生成器
const keyGeneratorCache = new Map<string, Function>()

function getKeyGenerator(keyTemplate: string): Function {
  if (!keyGeneratorCache.has(keyTemplate)) {
    keyGeneratorCache.set(keyTemplate, (input: any) => {
      return keyTemplate.replace(/\{(\w+)\}/g, (_, key) => input[key])
    })
  }
  return keyGeneratorCache.get(keyTemplate)!
}

const middleware = cacheMiddleware({
  keyGenerator: getKeyGenerator('posts:list:page:{page}'),
})
```

### 2. 批量缓存失效
```typescript
// 一次性失效多个标签
invalidateCacheMiddleware({
  tags: ['posts', 'comments', 'tags'],
})
```

### 3. 缓存预热
```typescript
// 在应用启动时预热缓存
async function warmupCache() {
  const popularPosts = await db.query('SELECT * FROM posts ORDER BY views DESC LIMIT 100')
  
  for (const post of popularPosts) {
    await cache.set(`posts:byId:${post.id}`, post, { ttl: 300, tags: ['posts'] })
  }
}
```

---

## 监控和调试

### 1. 添加缓存日志
```typescript
const middleware = cacheMiddleware({
  keyGenerator: (ctx, input) => `posts:list:${input.page}`,
  onHit: (key) => logger.debug(`Cache hit: ${key}`),
  onMiss: (key) => logger.debug(`Cache miss: ${key}`),
  onSet: (key) => logger.debug(`Cache set: ${key}`),
  onInvalidate: (tags) => logger.info(`Cache invalidated: ${tags.join(', ')}`),
})
```

### 2. 缓存统计
```typescript
const cacheStats = {
  hits: 0,
  misses: 0,
  sets: 0,
  invalidations: 0,
}

// 定期输出统计
setInterval(() => {
  const hitRate = cacheStats.hits / (cacheStats.hits + cacheStats.misses)
  logger.info(`Cache stats: hits=${cacheStats.hits}, misses=${cacheStats.misses}, hitRate=${hitRate.toFixed(2)}`)
}, 60000)
```

---

## 参考资料

- [tRPC 中间件文档](https://trpc.io/docs/server/middlewares)
- [缓存设计模式](https://docs.microsoft.com/en-us/azure/architecture/patterns/caching/)
- [Redis 缓存最佳实践](https://redis.io/docs/manual/patterns/)

---

**最后更新**: 2026-01-29
**维护者**: lora-sys