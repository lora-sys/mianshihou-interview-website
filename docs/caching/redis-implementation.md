# Redis 缓存系统实现踩坑记录

本文档记录了在实现 Redis 缓存系统过程中遇到的所有问题、解决方案和最佳实践。

---

## 错误 1: ioredis 方法命名不一致

### 错误描述
在使用 ioredis 时，调用了 `flushDb()` 方法，但该方法不存在。

### 错误代码
```typescript
await redis.flushDb()  // 错误：方法不存在
```

### 错误原因
ioredis 的方法命名使用驼峰命名法（camelCase），正确的方法名是 `flushdb()`，而不是 `flushDb()`。

### 解决方案
```typescript
await redis.flushdb()  // 正确：全部小写
```

### 修改文件
- `mianshihou/apps/api/lib/redis.ts`
- `mianshihou/apps/api/tests/unit/redis.test.ts`

### 关键要点
- ioredis 的方法命名遵循驼峰命名法
- Redis 命令 `FLUSHDB` 在 ioredis 中对应 `flushdb()` 方法
- 注意大小写：`flushdb()` 不是 `flushDb()`

---

## 错误 2: 空字符串前缀被 falsy 值覆盖

### 错误描述
当缓存前缀设置为空字符串 `''` 时，代码使用了默认前缀，而不是预期的无前缀。

### 错误代码
```typescript
constructor(config: CacheConfig) {
  this.prefix = config.prefix || CACHE_KEY_PREFIX  // 错误：'' 是 falsy 值
}
```

### 错误原因
JavaScript 中，空字符串 `''` 是 falsy 值，导致 `||` 运算符使用了默认值。

### 解决方案
```typescript
constructor(config: CacheConfig) {
  this.prefix = 'prefix' in config ? config.prefix! : CACHE_KEY_PREFIX
}
```

### 修改文件
- `mianshihou/apps/api/lib/cache.ts`

### 关键要点
- 使用 `'prefix' in config` 检查属性是否存在，而不是使用 `||` 运算符
- 空字符串是有效的配置值，应该被保留
- 使用可选链和类型守卫确保类型安全

---

## 错误 3: 无法区分缓存不存在和缓存值为 null

### 错误描述
在实现空值缓存时，无法区分"缓存不存在"和"缓存值为 null"，导致缓存穿透防护失效。

### 错误代码
```typescript
async get<T>(key: string): Promise<T | null> {
  const value = await this.redis.get(key)
  return this.deserialize(value) as T | null
}

// 使用
const cached = await cache.get('key')
if (cached !== null) {
  return cached  // 无法区分缓存不存在和缓存值为 null
}
```

### 错误原因
`redis.get()` 在键不存在时返回 `null`，反序列化后也返回 `null`，导致无法区分两种情况。

### 解决方案

**方案 1：使用 `undefined` 表示缓存不存在**
```typescript
async get<T>(key: string): Promise<T | undefined> {
  const value = await this.redis.get(key)
  if (value === null) {
    return undefined  // 缓存不存在
  }
  return this.deserialize(value) as T
}

// 使用
const cached = await cache.get('key')
if (cached !== undefined) {
  return cached  // 缓存存在（包括 null 值）
}
```

**方案 2：使用特殊标记序列化 null 值**
```typescript
private serialize(value: any): string {
  if (value === null) {
    return JSON.stringify({ __null: true })
  }
  return JSON.stringify(value)
}

private deserialize(value: string | null): any {
  if (value === null) {
    return null  // 缓存不存在
  }
  try {
    const parsed = JSON.parse(value)
    if (parsed && typeof parsed === 'object' && parsed.__null === true) {
      return null  // 缓存值为 null
    }
    return parsed
  } catch (error) {
    return null
  }
}
```

### 修改文件
- `mianshihou/apps/api/lib/cache.ts`
- `mianshihou/apps/api/trpc/middleware/cache.ts`
- `mianshihou/apps/api/tests/unit/cache.test.ts`

### 关键要点
- 使用 `undefined` 表示缓存不存在，`null` 表示缓存值为 null
- 使用 `__null` 标记序列化 null 值，确保反序列化时能正确识别
- 在缓存中间件中使用 `cached !== undefined` 检查缓存是否存在

---

## 错误 4: 空值缓存优先级配置错误

### 错误描述
当全局启用了空值缓存（`enableNullCache: true`），但单个缓存操作明确禁用（`setNull: false`）时，缓存仍然被设置。

### 错误代码
```typescript
async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
  const { setNull } = options

  // 检查是否缓存 null 值
  if (value === null && !setNull && !this.enableNullCache) {
    return
  }
  // ... 继续缓存
}
```

### 错误原因
当 `this.enableNullCache` 为 `true` 时，即使 `setNull: false`，条件 `!setNull && !this.enableNullCache` 也为 `false`，导致缓存被设置。

### 解决方案
```typescript
async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
  const { setNull } = options

  // 如果明确指定了 setNull，则使用该值；否则使用全局配置
  const shouldCacheNull = setNull !== undefined ? setNull : this.enableNullCache
  if (value === null && !shouldCacheNull) {
    return
  }
  // ... 继续缓存
}
```

### 修改文件
- `mianshihou/apps/api/lib/cache.ts`

### 关键要点
- 参数级别的配置应该优先于全局配置
- 使用 `!== undefined` 检查参数是否明确设置
- 提供灵活的配置选项，允许在不同场景下覆盖全局设置

---

## 错误 5: 缓存中间件无法使用外部缓存实例

### 错误描述
在测试中，缓存中间件使用全局单例缓存实例，导致测试数据和实际数据混在一起。

### 错误代码
```typescript
export function cacheMiddleware(options: CacheMiddlewareOptions = {}) {
  const cache = getCacheClient()  // 总是使用全局单例
  // ...
}
```

### 错误原因
缓存中间件强制使用全局单例缓存实例，无法在测试中使用独立的缓存实例。

### 解决方案
```typescript
export function cacheMiddleware(options: CacheMiddlewareOptions = {}) {
  const cache = options.cache || getCacheClient()  // 支持外部传入
  // ...
}
```

### 修改文件
- `mianshihou/apps/api/trpc/middleware/cache.ts`

### 关键要点
- 支持依赖注入，允许外部传入缓存实例
- 在测试中使用独立的缓存实例，避免数据污染
- 在生产环境中使用全局单例，减少资源消耗

---

## 错误 6: 双重检查锁中的并发问题

### 错误描述
在实现缓存击穿防护时，多个并发请求可能同时获取锁，导致重复查询数据库。

### 错误代码
```typescript
async getWithDoubleCheckLock(key: string, fn: () => Promise<any>, ttl: number) {
  const cached = await cache.get(key)
  if (cached !== undefined) {
    return cached
  }

  // 获取锁
  const lockKey = `lock:${key}`
  const acquired = await cache.set(lockKey, 'locked', { ttl: 10 })

  if (acquired) {
    // 直接计算数据，没有第二次检查
    const data = await fn()
    cache.set(key, data, ttl)
    return data
  }

  // 等待并重试
  await sleep(100)
  return getWithDoubleCheckLock(key, fn, ttl)
}
```

### 错误原因
在获取锁成功后，没有进行第二次检查，可能其他请求已经计算并缓存了数据。

### 解决方案
```typescript
async getWithDoubleCheckLock(key: string, fn: () => Promise<any>, ttl: number) {
  // 第一次检查
  const cached = await cache.get(key)
  if (cached !== undefined) {
    return cached
  }

  // 获取锁
  const lockKey = `lock:${key}`
  const lockValue = Date.now()
  const acquired = await cache.set(lockKey, lockValue, { ttl: 10 })

  if (acquired) {
    try {
      // 第二次检查（关键！）
      const cachedAgain = await cache.get(key)
      if (cachedAgain !== undefined) {
        return cachedAgain
      }

      // 计算数据
      const data = await fn()
      cache.set(key, data, ttl)
      return data
    } finally {
      // 释放锁
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `
      await cache.eval(script, 1, lockKey, lockValue)
    }
  }

  // 获取锁失败，等待后重试
  await sleep(100)
  return getWithDoubleCheckLock(key, fn, ttl)
}
```

### 修改文件
- `mianshihou/apps/api/lib/cache-protection.ts`

### 关键要点
- 双重检查锁的关键是"获取锁后再次检查缓存"
- 使用 Lua 脚本确保原子性操作
- 设置锁的超时时间，防止死锁
- 在 finally 块中释放锁，确保锁总是被释放

---

## 错误 7: 随机 TTL 边界值问题

### 错误描述
在测试随机 TTL 时，期望 TTL 分布在 50-70 秒之间，但实际得到 50 秒。

### 错误代码
```typescript
const randomOffset = Math.floor(Math.random() * randomRange * 2) - randomRange
const actualTTL = ttl + randomOffset

// 当 randomRange = 10, random() = 0 时
// randomOffset = 0 - 10 = -10
// actualTTL = 60 - 10 = 50
```

### 错误原因
随机范围计算使用 `Math.random()`，当 `random()` 返回 0 时，得到最小值，不是预期范围。

### 解决方案
```typescript
const randomOffset = Math.floor(Math.random() * randomRange * 2) - randomRange
// 或者使用更清晰的方式
const minTTL = ttl - randomRange
const maxTTL = ttl + randomRange
const actualTTL = Math.floor(Math.random() * (maxTTL - minTTL + 1)) + minTTL
```

### 测试修正
```typescript
// 期望 TTL 分布在 50-70 秒之间（包含边界）
expect(ttl).toBeGreaterThanOrEqual(50)
expect(ttl).toBeLessThanOrEqual(70)
```

### 修改文件
- `mianshihou/apps/api/tests/unit/cache.test.ts`

### 关键要点
- 随机数生成可能返回边界值，测试时应该包含边界
- 使用 `toBeGreaterThanOrEqual` 而不是 `toBeGreaterThan` 包含边界值
- 随机 TTL 的目的是防止缓存雪崩，不是精确控制过期时间

---

## 错误 8: 布隆过滤器误判率问题

### 错误描述
布隆过滤器存在误判率，导致实际存在的数据被误判为不存在。

### 错误代码
```typescript
if (!bloomFilter.has(key)) {
  return null  // 可能误判
}
```

### 错误原因
布隆过滤器的特性：
- 存在误判率（false positive）
- 不存在误判（false negative）
- 误判率取决于过滤器大小和哈希函数数量

### 解决方案
```typescript
if (!bloomFilter.has(key)) {
  // 可能误判，但概率很低
  // 直接查询数据库
  const data = await db.query(key)
  
  // 如果数据存在，添加到布隆过滤器
  if (data) {
    bloomFilter.add(key)
  }
  
  return data
}

// 如果过滤器说存在，再去缓存检查
const cached = await cache.get(key)
if (cached !== undefined) {
  return cached
}
```

### 修改文件
- `mianshihou/apps/api/lib/cache-protection.ts`

### 关键要点
- 布隆过滤器不能 100% 准确，只能作为辅助手段
- 误判时应该查询数据库，而不是直接返回 null
- 定期重建布隆过滤器，控制误判率
- 根据数据量选择合适的过滤器大小和哈希函数数量

---

## 错误 9: 熔断器状态转换逻辑错误

### 错误描述
熔断器在错误次数达到阈值后应该打开，但实际没有正确转换状态。

### 错误代码
```typescript
if (this.errorCount >= this.errorThreshold) {
  this.state = 'OPEN'
  this.lastErrorTime = Date.now()
}
```

### 错误原因
缺少状态转换逻辑，没有实现 HALF_OPEN 状态和自动恢复机制。

### 解决方案
```typescript
async recordSuccess() {
  if (this.state === 'OPEN') {
    // 检查是否可以进入 HALF_OPEN 状态
    if (Date.now() - this.lastErrorTime >= this.timeout) {
      this.state = 'HALF_OPEN'
      this.errorCount = 0
      logger.info('Circuit breaker transitioned to HALF_OPEN')
    }
  } else if (this.state === 'HALF_OPEN') {
    // 如果连续成功，恢复到 CLOSED 状态
    this.successCount++
    if (this.successCount >= this.successThreshold) {
      this.state = 'CLOSED'
      this.successCount = 0
      logger.info('Circuit breaker recovered')
    }
  } else {
    // CLOSED 状态，重置计数器
    this.errorCount = 0
    this.successCount = 0
  }
}

async recordFailure() {
  this.errorCount++
  if (this.errorCount >= this.errorThreshold) {
    this.state = 'OPEN'
    this.lastErrorTime = Date.now()
    logger.error('Circuit breaker opened after failures')
  }
}
```

### 修改文件
- `mianshihou/apps/api/lib/cache-protection.ts`

### 关键要点
- 熔断器有三种状态：CLOSED（关闭）、OPEN（打开）、HALF_OPEN（半开）
- CLOSED → OPEN：错误次数达到阈值
- OPEN → HALF_OPEN：超时后尝试恢复
- HALF_OPEN → CLOSED：连续成功次数达到阈值
- HALF_OPEN → OPEN：再次失败

---

## 错误 10: 限流器算法选择问题

### 错误描述
限流器使用固定窗口算法，导致边界流量突增。

### 错误代码
```typescript
// 固定窗口算法
const key = `rate:${userId}:${Math.floor(Date.now() / windowSize)}`
const count = await redis.incr(key)
if (count > limit) {
  throw new Error('Rate limit exceeded')
}
```

### 错误原因
固定窗口算法在窗口边界处可能允许双倍流量通过。

### 解决方案
```typescript
// 滑动窗口算法
const now = Date.now()
const key = `rate:${userId}`
const pipeline = redis.pipeline()

// 移除窗口外的记录
pipeline.zremrangebyscore(key, 0, now - windowSize)

// 添加当前请求
pipeline.zadd(key, now, now)

// 获取窗口内的请求数
pipeline.zcard(key)

const results = await pipeline.exec()
const count = results[2][1] as number

if (count > limit) {
  throw new Error('Rate limit exceeded')
}

// 设置过期时间
redis.expire(key, windowSize)
```

### 修改文件
- `mianshihou/apps/api/lib/cache-protection.ts`

### 关键要点
- 固定窗口算法简单但精度低
- 滑动窗口算法精度高但消耗更多资源
- 令牌桶算法适合突发流量
- 漏桶算法适合平滑流量
- 根据业务场景选择合适的算法

---

## 最佳实践

### 1. 缓存键命名规范
```typescript
// 格式：{prefix}:{module}:{action}:{params}
'mianshihou:posts:list:page:1'
'mianshihou:user:byId:user123'
'mianshihou:questions:list:tag:JavaScript'
```

### 2. TTL 配置建议
```typescript
// 热点数据：较短的 TTL
const hotDataTTL = 60  // 1分钟

// 温点数据：中等 TTL
const warmDataTTL = 300  // 5分钟

// 冷点数据：较长的 TTL
const coldDataTTL = 3600  // 1小时

// 添加随机 TTL 防止雪崩
cache.set(key, value, { ttl: warmDataTTL, randomTtl: 60 })
```

### 3. 缓存失效策略
```typescript
// 主动失效：数据变更时清除
await cache.clearByTag('posts')

// 被动失效：TTL 自动过期
cache.set(key, value, { ttl: 300 })

// 版本控制：批量失效
cache.incrementVersion('user_v1')
```

### 4. 错误处理
```typescript
try {
  const cached = await cache.get(key)
  if (cached !== undefined) {
    return cached
  }
  
  const result = await fetchData()
  await cache.set(key, result, { ttl: 300 })
  return result
} catch (error) {
  // 缓存失败，降级到直接查询
  logger.error('Cache error:', error)
  return await fetchData()
}
```

### 5. 监控和日志
```typescript
logger.debug(`Cache hit: ${cacheKey}`)
logger.debug(`Cache miss: ${cacheKey}`)
logger.info(`Invalidated cache by tag: ${tag}`)
logger.error('Cache deserialization error:', error)
```

---

## 性能优化建议

### 1. 使用 Pipeline 批量操作
```typescript
const pipeline = redis.pipeline()
for (const key of keys) {
  pipeline.get(key)
}
const results = await pipeline.exec()
```

### 2. 使用 Lua 脚本减少网络往返
```typescript
const script = `
  local key = KEYS[1]
  local value = redis.call("get", key)
  if value then
    redis.call("expire", key, ARGV[1])
    return value
  end
  return nil
`
const result = await redis.eval(script, 1, key, ttl)
```

### 3. 合理设置 TTL
- 热点数据：短 TTL（1-5 分钟）
- 温点数据：中 TTL（5-30 分钟）
- 冷点数据：长 TTL（30 分钟 - 1 小时）
- 添加随机 TTL 防止雪崩

### 4. 避免大对象缓存
```typescript
// 不要缓存整个大对象
await cache.set('largeObject', bigData)

// 只缓存需要的字段
await cache.set('user:summary', {
  id: user.id,
  name: user.name,
  avatar: user.avatar,
})
```

---

## 参考资料

- [ioredis 官方文档](https://github.com/redis/ioredis)
- [Redis 缓存最佳实践](https://redis.io/docs/manual/patterns/)
- [缓存穿透、击穿、雪崩](https://blog.csdn.net/qq_35624642/article/details/124009279)
- [布隆过滤器原理](https://zh.wikipedia.org/wiki/%E5%B8%83%E9%9A%97%E8%BF%87%E6%BB%A4%E5%99%A8)
- [熔断器模式](https://martinfowler.com/bliki/CircuitBreaker.html)

---

**最后更新**: 2026-01-29
**维护者**: lora-sys