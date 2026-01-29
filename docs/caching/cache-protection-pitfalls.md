# 缓存防护机制踩坑记录

本文档记录了在实现缓存防护机制（缓存穿透、缓存击穿、缓存雪崩）过程中遇到的问题和解决方案。

---

## 缓存穿透防护

### 问题 1: 无法区分缓存不存在和缓存值为 null

#### 问题描述
在实现空值缓存时，`cache.get()` 返回 `null`，无法区分"缓存不存在"和"缓存值为 null"。

#### 错误代码
```typescript
async get(key: string): Promise<any> {
  const value = await redis.get(key)
  return JSON.parse(value)  // 缓存不存在时 JSON.parse(null) 返回 null
}

// 使用
const result = await cache.get('user:999')
if (result === null) {
  // 无法确定是缓存不存在还是用户不存在
  return null
}
```

#### 解决方案
```typescript
// 方案 1：使用 undefined 表示缓存不存在
async get(key: string): Promise<any | undefined> {
  const value = await redis.get(key)
  if (value === null) {
    return undefined  // 缓存不存在
  }
  return JSON.parse(value)
}

// 使用
const result = await cache.get('user:999')
if (result !== undefined) {
  return result  // 缓存存在（包括 null 值）
}
// result === undefined 表示缓存不存在
```

```typescript
// 方案 2：使用特殊标记
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

#### 关键要点
- 使用 `undefined` 表示缓存不存在，`null` 表示缓存值为 null
- 使用 `__null` 标记确保反序列化时能正确识别 null 值
- 在缓存中间件中使用 `cached !== undefined` 检查缓存是否存在

---

### 问题 2: 布隆过滤器误判率问题

#### 问题描述
布隆过滤器存在误判率，导致实际存在的数据被误判为不存在。

#### 错误代码
```typescript
if (!bloomFilter.has(userId)) {
  return null  // 可能误判
}
```

#### 误判率计算
```
误判率 = (1 - e^(-kn/m))^k

其中：
- k = 哈希函数数量
- n = 已插入元素数量
- m = 位数组大小
```

#### 解决方案
```typescript
// 方案 1：布隆过滤器 + 数据库查询
if (!bloomFilter.has(userId)) {
  // 可能误判，查询数据库
  const user = await db.query(userId)
  
  // 如果用户存在，添加到布隆过滤器
  if (user) {
    bloomFilter.add(userId)
  }
  
  return user
}

// 方案 2：布隆过滤器 + 缓存
if (!bloomFilter.has(userId)) {
  // 可能误判，查询缓存
  const cached = await cache.get(`user:${userId}`)
  if (cached !== undefined) {
    return cached
  }
  
  // 查询数据库
  const user = await db.query(userId)
  if (user) {
    bloomFilter.add(userId)
    cache.set(`user:${userId}`, user, { ttl: 300 })
  }
  
  return user
}
```

#### 布隆过滤器配置建议
```typescript
// 根据数据量选择合适的参数
const bloomFilter = new BloomFilter({
  m: 1000000,  // 位数组大小（100万位 = 125KB）
  k: 7,         // 哈希函数数量
  n: 100000,    // 预期元素数量
})

// 误判率计算
// (1 - e^(-7 * 100000 / 1000000))^7 ≈ 0.008 (0.8%)
```

#### 关键要点
- 布隆过滤器不能 100% 准确，只能作为辅助手段
- 误判时应该查询数据库，而不是直接返回 null
- 根据数据量选择合适的过滤器大小和哈希函数数量
- 定期重建布隆过滤器，控制误判率

---

## 缓存击穿防护

### 问题 1: 双重检查锁中的并发问题

#### 问题描述
在实现缓存击穿防护时，多个并发请求可能同时获取锁，导致重复查询数据库。

#### 错误代码
```typescript
async getWithDoubleCheckLock(key: string, fn: () => Promise<any>) {
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
    cache.set(key, data, { ttl: 300 })
    return data
  }

  // 等待并重试
  await sleep(100)
  return getWithDoubleCheckLock(key, fn)
}
```

#### 问题场景
```
时间线：
T1: Request A 检查缓存，未命中
T2: Request B 检查缓存，未命中
T3: Request A 获取锁成功
T4: Request B 获取锁失败，等待
T5: Request A 查询数据库
T6: Request A 设置缓存
T7: Request A 释放锁
T8: Request B 获取锁成功
T9: Request B 查询数据库（重复！）
```

#### 解决方案
```typescript
async getWithDoubleCheckLock(key: string, fn: () => Promise<any>, ttl: number) {
  // 第一次检查
  const cached = await cache.get(key)
  if (cached !== undefined) {
    return cached
  }

  // 获取锁
  const lockKey = `lock:${key}`
  const lockValue = Date.now()  // 使用时间戳作为锁值
  const acquired = await cache.set(lockKey, lockValue, {
    ttl: 10,
    setNull: true,  // 明确缓存锁值
  })

  if (acquired) {
    try {
      // 第二次检查（关键！）
      const cachedAgain = await cache.get(key)
      if (cachedAgain !== undefined) {
        return cachedAgain  // 其他请求已经计算并缓存了数据
      }

      // 计算数据
      const data = await fn()
      
      // 设置缓存
      await cache.set(key, data, {
        ttl,
        setNull: true,  // 即使是 null 也缓存
      })
      
      return data
    } finally {
      // 释放锁（使用 Lua 脚本确保原子性）
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

#### 关键要点
- 双重检查锁的关键是"获取锁后再次检查缓存"
- 使用时间戳作为锁值，确保只释放自己获取的锁
- 使用 Lua 脚本确保释放锁的原子性
- 设置锁的超时时间，防止死锁
- 在 finally 块中释放锁，确保锁总是被释放

---

### 问题 2: 锁超时时间设置不当

#### 问题描述
锁的超时时间设置太短，导致正在计算数据的请求释放锁后，其他请求又重复计算。

#### 错误代码
```typescript
const acquired = await cache.set(lockKey, 'locked', { ttl: 1 })  // 太短
```

#### 解决方案
```typescript
// 根据数据计算时间设置锁超时
const lockTTL = Math.max(10, estimatedComputationTime * 1.5)
const acquired = await cache.set(lockKey, lockValue, { ttl: lockTTL })
```

#### 超时时间建议
- 快速查询（< 1s）：10 秒
- 中等查询（1-10s）：30 秒
- 慢速查询（> 10s）：60 秒

---

### 问题 3: 热点数据永不过期导致缓存雪崩

#### 问题描述
热点数据设置永不过期，导致一旦失效，大量请求同时查询数据库。

#### 错误代码
```typescript
// 热点数据永不过期
cache.set('hot:key', data)  // 没有 TTL
```

#### 解决方案
```typescript
// 方案 1：定期刷新
async refreshHotData(key: string, fn: () => Promise<any>) {
  const ttl = await cache.ttl(key)
  
  // 如果 TTL 小于 10%，异步刷新
  if (ttl < 30) {
    const newData = await fn()
    cache.set(key, newData, { ttl: 300 })
  }
}

// 方案 2：设置较长的 TTL
cache.set('hot:key', data, { ttl: 3600 })  // 1 小时
```

#### 关键要点
- 热点数据应该设置较长的 TTL
- 在 TTL 接近过期时异步刷新，防止缓存雪崩
- 避免热点数据永不过期

---

## 缓存雪崩防护

### 问题 1: 随机 TTL 范围设置不当

#### 问题描述
随机 TTL 范围设置太大或太小，导致无法有效防止缓存雪崩。

#### 错误代码
```typescript
// 随机范围太大
const randomOffset = Math.floor(Math.random() * 300) - 150
const actualTTL = ttl + randomOffset  // TTL 范围：150-450（太宽）

// 随机范围太小
const randomOffset = Math.floor(Math.random() * 10) - 5
const actualTTL = ttl + randomOffset  // TTL 范围：295-305（太窄）
```

#### 解决方案
```typescript
// 随机范围为 TTL 的 10%
const randomTtl = Math.floor(ttl * 0.1)
const randomOffset = Math.floor(Math.random() * randomTtl * 2) - randomTtl
const actualTTL = ttl + randomOffset

// 示例：
// TTL = 300, randomTtl = 30
// actualTTL 范围：270-330
```

#### TTL 范围建议
- 短 TTL（< 5 分钟）：10-20% 随机范围
- 中 TTL（5-30 分钟）：5-10% 随机范围
- 长 TTL（> 30 分钟）：1-5% 随机范围

---

### 问题 2: 熔断器状态转换逻辑错误

#### 问题描述
熔断器在错误次数达到阈值后没有正确打开，或者恢复后没有正确关闭。

#### 错误代码
```typescript
async recordFailure() {
  this.errorCount++
  if (this.errorCount >= this.errorThreshold) {
    this.state = 'OPEN'  // 缺少超时时间
  }
}
```

#### 解决方案
```typescript
async recordFailure() {
  this.errorCount++
  
  if (this.errorCount >= this.errorThreshold) {
    this.state = 'OPEN'
    this.lastErrorTime = Date.now()
    this.successCount = 0
    logger.error(`Circuit breaker opened after ${this.errorCount} failures`)
  }
}

async recordSuccess() {
  this.successCount++
  
  if (this.state === 'OPEN') {
    // 检查是否可以进入 HALF_OPEN 状态
    if (Date.now() - this.lastErrorTime >= this.timeout) {
      this.state = 'HALF_OPEN'
      this.errorCount = 0
      this.successCount = 0
      logger.info('Circuit breaker transitioned to HALF_OPEN')
    }
  } else if (this.state === 'HALF_OPEN') {
    // 如果连续成功，恢复到 CLOSED 状态
    if (this.successCount >= this.successThreshold) {
      this.state = 'CLOSED'
      this.successCount = 0
      this.errorCount = 0
      logger.info('Circuit breaker recovered')
    }
  } else {
    // CLOSED 状态，重置计数器
    this.errorCount = 0
    this.successCount = 0
  }
}
```

#### 熔断器状态机
```
状态转换：
CLOSED ─(错误次数 >= 阈值)→ OPEN
OPEN ─(超时后)→ HALF_OPEN
HALF_OPEN ─(成功次数 >= 阈值)→ CLOSED
HALF_OPEN ─(再次失败)→ OPEN
CLOSED ─(连续成功)→ CLOSED
```

#### 配置建议
```typescript
const circuitBreaker = new CircuitBreaker({
  errorThreshold: 5,       // 错误阈值
  successThreshold: 2,     // 成功阈值
  timeout: 60000,           // 超时时间（60秒）
  resetTimeout: 300000,     // 重置超时（5分钟）
})
```

---

### 问题 3: 限流器算法选择不当

#### 问题描述
限流器使用固定窗口算法，导致边界流量突增。

#### 错误代码
```typescript
// 固定窗口算法：边界问题
const key = `rate:${userId}:${Math.floor(Date.now() / 1000)}`
const count = await redis.incr(key)
if (count > 10) {
  throw new Error('Rate limit exceeded')
}
```

#### 问题场景
```
时间轴（1秒窗口）：
T=0.999: Request A，count = 9，允许
T=1.001: Request B，count = 1，允许
T=1.999: Request C，count = 9，允许
T=2.001: Request D，count = 1，允许

结果：2秒内有 20 个请求（10个/秒 * 2）
```

#### 解决方案

**方案 1：滑动窗口算法**
```typescript
const now = Date.now()
const key = `rate:${userId}`
const windowSize = 1000  // 1秒

// 移除窗口外的记录
await redis.zremrangebyscore(key, 0, now - windowSize)

// 添加当前请求
await redis.zadd(key, now, now)

// 获取窗口内的请求数
const count = await redis.zcard(key)

if (count > limit) {
  throw new Error('Rate limit exceeded')
}

// 设置过期时间
await redis.expire(key, windowSize)
```

**方案 2：令牌桶算法**
```typescript
class TokenBucket {
  constructor(capacity: number, rate: number) {
    this.capacity = capacity  // 桶容量
    this.rate = rate         // 填充速率（令牌/秒）
    this.tokens = capacity   // 当前令牌数
    this.lastRefill = Date.now()
  }

  async tryConsume(tokens: number = 1): Promise<boolean> {
    // 填充令牌
    const now = Date.now()
    const elapsed = (now - this.lastRefill) / 1000
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.rate)
    this.lastRefill = now

    // 消耗令牌
    if (this.tokens >= tokens) {
      this.tokens -= tokens
      return true
    }

    return false
  }
}
```

#### 算法选择建议
- 固定窗口：简单但精度低，适合一般场景
- 滑动窗口：精度高但消耗资源，适合严格限流
- 令牌桶：适合突发流量，平滑处理
- 漏桶：适合平滑流量，防止突发

---

## 性能优化建议

### 1. 减少锁竞争
```typescript
// 使用多个锁而不是一个全局锁
const lockKey = `lock:${key}:${Math.floor(Date.now() / 1000)}`  // 按秒分片
```

### 2. 异步刷新热点数据
```typescript
async function getWithRefresh(key: string, fn: () => Promise<any>) {
  const cached = await cache.get(key)
  if (cached !== undefined) {
    const ttl = await cache.ttl(key)
    
    // TTL 小于 10% 时异步刷新
    if (ttl < 30) {
      setImmediate(async () => {
        const newData = await fn()
        await cache.set(key, newData, { ttl: 300 })
      })
    }
    
    return cached
  }

  const data = await fn()
  await cache.set(key, data, { ttl: 300 })
  return data
}
```

### 3. 使用批量操作
```typescript
// 批量获取
const keys = ['key1', 'key2', 'key3']
const pipeline = redis.pipeline()
for (const key of keys) {
  pipeline.get(key)
}
const results = await pipeline.exec()
```

---

## 监控指标

### 1. 缓存命中率
```typescript
let cacheHits = 0
let cacheMisses = 0

async function getWithMetrics(key: string) {
  const cached = await cache.get(key)
  if (cached !== undefined) {
    cacheHits++
    return cached
  }
  
  cacheMisses++
  const data = await fetchData(key)
  cache.set(key, data, { ttl: 300 })
  return data
}

// 计算命中率
const hitRate = cacheHits / (cacheHits + cacheMisses)
```

### 2. 缓存穿透次数
```typescript
let penetrationCount = 0

async function getWithPenetrationDetection(key: string) {
  const cached = await cache.get(key)
  if (cached !== undefined) {
    return cached
  }
  
  const data = await fetchData(key)
  if (data === null) {
    penetrationCount++
    cache.set(key, null, { ttl: 300, setNull: true })
  } else {
    cache.set(key, data, { ttl: 300 })
  }
  
  return data
}
```

### 3. 缓存击穿次数
```typescript
let breakdownCount = 0

async function getWithBreakdownDetection(key: string) {
  const result = await getWithDoubleCheckLock(key, async () => {
    breakdownCount++
    return await fetchData(key)
  }, 300)
  
  return result
}
```

---

## 参考资料

- [布隆过滤器原理与实现](https://www.jianshu.com/p/210d64ae8fbd)
- [双重检查锁定模式](https://en.wikipedia.org/wiki/Double-checked_locking)
- [熔断器模式](https://martinfowler.com/bliki/CircuitBreaker.html)
- [限流算法对比](https://blog.csdn.net/xiaojinpeiya/article/details/12345678)

---

**最后更新**: 2026-01-29
**维护者**: lora-sys