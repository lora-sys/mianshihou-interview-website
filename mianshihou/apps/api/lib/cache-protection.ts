import Redis from 'ioredis';
import { logger } from './logger';

export type CacheProtectionConfig = {
  redis: Redis;
  prefix?: string;
  circuitBreaker?: {
    failureThreshold: number;
    recoveryTimeout: number;
  };
  rateLimiter?: {
    maxRequests: number;
    windowMs: number;
  };
};

export type CacheProtectionOptions = {
  ttl?: number;
  randomTtl?: number;
  lockTimeout?: number;
};

/**
 * 熔断器状态
 */
enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * 熔断器类
 */
class CircuitBreaker {
  private state = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;
  private failureThreshold: number;
  private recoveryTimeout: number;

  constructor(failureThreshold: number, recoveryTimeout: number) {
    this.failureThreshold = failureThreshold;
    this.recoveryTimeout = recoveryTimeout;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // 检查是否需要从 OPEN 转为 HALF_OPEN
    if (
      this.state === CircuitBreakerState.OPEN &&
      Date.now() - this.lastFailureTime > this.recoveryTimeout * 1000
    ) {
      this.state = CircuitBreakerState.HALF_OPEN;
      this.successCount = 0;
      logger.info('Circuit breaker transitioned to HALF_OPEN');
    }

    // 如果熔断器打开，拒绝请求
    if (this.state === CircuitBreakerState.OPEN) {
      throw new Error('Circuit breaker is open');
    }

    try {
      const result = await fn();

      // 成功，记录状态
      if (this.state === CircuitBreakerState.HALF_OPEN) {
        this.successCount++;
        if (this.successCount >= 3) {
          // 半开状态下连续成功 3 次，关闭熔断器
          this.state = CircuitBreakerState.CLOSED;
          this.failureCount = 0;
          logger.info('Circuit breaker transitioned to CLOSED');
        }
      } else {
        this.failureCount = 0;
      }

      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
      logger.warn(`Circuit breaker opened after ${this.failureCount} failures`);
    }
  }

  getState(): CircuitBreakerState {
    return this.state;
  }
}

/**
 * 限流器类
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  allow(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];

    // 清理过期的请求记录
    const validRequests = requests.filter((t) => now - t < this.windowMs);
    this.requests.set(key, validRequests);

    // 检查是否超过限制
    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    // 记录新请求
    validRequests.push(now);
    this.requests.set(key, validRequests);

    return true;
  }

  reset(key: string): void {
    this.requests.delete(key);
  }
}

/**
 * 缓存防护类
 */
class CacheProtection {
  private redis: Redis;
  private prefix: string;
  private circuitBreaker: CircuitBreaker | null = null;
  private rateLimiter: RateLimiter | null = null;

  constructor(config: CacheProtectionConfig) {
    this.redis = config.redis;
    this.prefix = config.prefix || 'cache';

    if (config.circuitBreaker) {
      this.circuitBreaker = new CircuitBreaker(
        config.circuitBreaker.failureThreshold,
        config.circuitBreaker.recoveryTimeout
      );
    }

    if (config.rateLimiter) {
      this.rateLimiter = new RateLimiter(
        config.rateLimiter.maxRequests,
        config.rateLimiter.windowMs
      );
    }
  }

  /**
   * 生成锁键
   */
  private buildLockKey(key: string): string {
    return `${this.prefix}:lock:${key}`;
  }

  /**
   * 生成限流键
   */
  private buildRateLimitKey(key: string): string {
    return `${this.prefix}:rate:${key}`;
  }

  /**
   * 缓存穿透防护：缓存空值
   */
  async getWithNullProtection<T>(
    key: string,
    fn: () => Promise<T>,
    options: CacheProtectionOptions = {}
  ): Promise<T | null> {
    const { ttl } = options;

    // 先从缓存获取
    const cached = await this.redis.get(`${this.prefix}:${key}`);
    if (cached !== null) {
      // 如果是 null 标记，返回 null
      if (cached === '__NULL__') {
        return null;
      }
      return JSON.parse(cached) as T;
    }

    // 缓存不存在，计算值
    try {
      const value = await fn();

      // 缓存结果（包括 null）
      if (value === null) {
        await this.redis.set(`${this.prefix}:${key}`, '__NULL__', 'EX', ttl || 300);
      } else {
        await this.redis.set(`${this.prefix}:${key}`, JSON.stringify(value), 'EX', ttl || 3600);
      }

      return value;
    } catch (error) {
      logger.error('Error in getWithNullProtection:', error);
      throw error;
    }
  }

  /**
   * 缓存击穿防护：双重检查锁
   */
  async getWithDoubleCheckLock<T>(
    key: string,
    fn: () => Promise<T>,
    ttl: number = 3600,
    options: CacheProtectionOptions = {}
  ): Promise<T> {
    const { lockTimeout = 10 } = options;
    const cacheKey = `${this.prefix}:${key}`;
    const lockKey = this.buildLockKey(key);
    const lockValue = Date.now().toString();

    // 第一次检查：从缓存获取
    const cached = await this.redis.get(cacheKey);
    if (cached !== null) {
      return JSON.parse(cached) as T;
    }

    // 获取分布式锁
    const acquired = await this.redis.set(lockKey, lockValue, 'NX', 'EX', lockTimeout);

    if (acquired === 'OK') {
      try {
        // 第二次检查：加锁后再次检查缓存（防止并发重复计算）
        const cachedAgain = await this.redis.get(cacheKey);
        if (cachedAgain !== null) {
          return JSON.parse(cachedAgain) as T;
        }

        // 计算数据
        const value = await fn();

        // 设置缓存
        await this.redis.set(cacheKey, JSON.stringify(value), 'EX', ttl);

        return value;
      } catch (error) {
        logger.error('Error in getWithDoubleCheckLock:', error);
        throw error;
      } finally {
        // 释放锁（Lua 脚本确保原子性）
        const script = `
          if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
          else
            return 0
          end
        `;
        await this.redis.eval(script, 1, lockKey, lockValue);
      }
    } else {
      // 获取锁失败，等待后重试
      await new Promise((resolve) => setTimeout(resolve, 100));
      return this.getWithDoubleCheckLock(key, fn, ttl, options);
    }
  }

  /**
   * 缓存雪崩防护：随机 TTL
   */
  async getWithRandomTTL<T>(
    key: string,
    fn: () => Promise<T>,
    baseTTL: number,
    randomTTL: number
  ): Promise<T> {
    const randomOffset = Math.floor(Math.random() * randomTTL * 2) - randomTTL;
    const actualTTL = Math.max(1, baseTTL + randomOffset);

    // 使用双重检查锁
    return this.getWithDoubleCheckLock(key, fn, actualTTL);
  }

  /**
   * 缓存雪崩防护：熔断器
   */
  async getWithCircuitBreaker<T>(
    key: string,
    fn: () => Promise<T>,
    ttl: number = 3600
  ): Promise<T> {
    if (!this.circuitBreaker) {
      // 没有配置熔断器，直接执行
      return this.getWithDoubleCheckLock(key, fn, ttl);
    }

    return this.circuitBreaker.execute(async () => {
      return this.getWithDoubleCheckLock(key, fn, ttl);
    });
  }

  /**
   * 缓存雪崩防护：限流
   */
  async getWithRateLimit<T>(key: string, fn: () => Promise<T>, ttl: number = 3600): Promise<T> {
    if (!this.rateLimiter) {
      // 没有配置限流器，直接执行
      return this.getWithDoubleCheckLock(key, fn, ttl);
    }

    const rateLimitKey = this.buildRateLimitKey(key);

    // 检查是否超过限流
    const allowed = this.rateLimiter.allow(rateLimitKey);
    if (!allowed) {
      throw new Error('Rate limit exceeded');
    }

    return this.getWithDoubleCheckLock(key, fn, ttl);
  }

  /**
   * 获取熔断器状态
   */
  getCircuitBreakerState(): CircuitBreakerState | null {
    return this.circuitBreaker?.getState() || null;
  }

  /**
   * 重置限流器
   */
  resetRateLimiter(key: string): void {
    if (this.rateLimiter) {
      this.rateLimiter.reset(this.buildRateLimitKey(key));
    }
  }
}

/**
 * 创建缓存防护实例
 */
export function createCacheProtection(config: CacheProtectionConfig): CacheProtection {
  return new CacheProtection(config);
}

export type { CacheProtection };
export { CircuitBreakerState };
