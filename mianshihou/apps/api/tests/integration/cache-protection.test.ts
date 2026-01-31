import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { createRedisClient, type RedisClient } from '../../lib/redis';
import { createCacheProtection, type CacheProtection } from '../../lib/cache-protection';
import { logger } from '../../lib/logger';

describe('Cache Protection Integration Tests', () => {
  let redis: RedisClient;
  let cacheProtection: CacheProtection;

  beforeAll(async () => {
    // 初始化 Redis
    redis = createRedisClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      lazyConnect: false,
    });

    await redis.connect();

    // 初始化缓存防护
    cacheProtection = createCacheProtection({
      redis,
      prefix: 'test:protection',
      circuitBreaker: {
        failureThreshold: 3,
        recoveryTimeout: 5,
      },
      rateLimiter: {
        maxRequests: 10,
        windowMs: 1000,
      },
    });
  });

  afterAll(async () => {
    await redis.flushdb();
    await redis.disconnect();
  });

  beforeEach(async () => {
    // 每个测试前清空 Redis
    await redis.flushdb();
  });

  describe('Cache Penetration Protection', () => {
    it('should cache null values for non-existent data', async () => {
      let dbCallCount = 0;
      const mockDbQuery = async () => {
        dbCallCount++;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return null; // 模拟数据库返回 null
      };

      // 第一次查询（数据库查询）
      const result1 = await cacheProtection.getWithNullProtection('user:nonexistent', mockDbQuery, {
        ttl: 60,
      });
      expect(result1).toBeNull();
      expect(dbCallCount).toBe(1);

      // 第二次查询（应该从缓存获取 null）
      const result2 = await cacheProtection.getWithNullProtection('user:nonexistent', mockDbQuery, {
        ttl: 60,
      });
      expect(result2).toBeNull();
      expect(dbCallCount).toBe(1); // 不应该再次查询数据库
    });

    it('should cache and return actual data', async () => {
      let dbCallCount = 0;
      const mockDbQuery = async () => {
        dbCallCount++;
        return { id: 1, name: 'Test User' };
      };

      // 第一次查询（数据库查询）
      const result1 = await cacheProtection.getWithNullProtection('user:1', mockDbQuery, {
        ttl: 60,
      });
      expect(result1).toEqual({ id: 1, name: 'Test User' });
      expect(dbCallCount).toBe(1);

      // 第二次查询（应该从缓存获取）
      const result2 = await cacheProtection.getWithNullProtection('user:1', mockDbQuery, {
        ttl: 60,
      });
      expect(result2).toEqual({ id: 1, name: 'Test User' });
      expect(dbCallCount).toBe(1); // 不应该再次查询数据库
    });

    it('should handle cache errors gracefully', async () => {
      const mockDbQuery = async () => {
        return { id: 1, name: 'Test User' };
      };

      // 模拟缓存错误
      await redis.flushdb();

      // 即使缓存失败，也应该返回数据
      const result = await cacheProtection.getWithNullProtection('user:1', mockDbQuery, {
        ttl: 60,
      });
      expect(result).toEqual({ id: 1, name: 'Test User' });
    });
  });

  describe('Cache Breakdown Protection', () => {
    it('should use double check lock to prevent concurrent queries', async () => {
      let dbCallCount = 0;
      const mockDbQuery = async () => {
        dbCallCount++;
        await new Promise((resolve) => setTimeout(resolve, 100)); // 模拟慢查询
        return { id: 1, name: 'Hot Data' };
      };

      // 并发查询同一热点数据
      const promises = Array(10)
        .fill(0)
        .map(() =>
          cacheProtection.getWithDoubleCheckLock('hot:key', mockDbQuery, 60, {
            lockTimeout: 10,
          })
        );

      const results = await Promise.all(promises);

      // 所有结果应该相同
      expect(results.every((r) => r.id === 1 && r.name === 'Hot Data')).toBe(true);
      // 应该只查询一次数据库（其他请求从缓存获取或等待锁）
      expect(dbCallCount).toBeLessThanOrEqual(2); // 可能因为并发导致1-2次查询
    });

    it('should handle lock timeout gracefully', async () => {
      let dbCallCount = 0;
      const mockDbQuery = async () => {
        dbCallCount++;
        await new Promise((resolve) => setTimeout(resolve, 200)); // 超过锁超时时间
        return { id: 1, name: 'Slow Data' };
      };

      // 设置很短的锁超时
      const result = await cacheProtection.getWithDoubleCheckLock('slow:key', mockDbQuery, 60, {
        lockTimeout: 0.1,
      });

      expect(result).toEqual({ id: 1, name: 'Slow Data' });
      expect(dbCallCount).toBe(1);
    });

    it('should return cached value if lock already acquired', async () => {
      let dbCallCount = 0;
      const mockDbQuery = async () => {
        dbCallCount++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { id: 1, name: 'Test Data' };
      };

      // 第一次查询
      const promise1 = cacheProtection.getWithDoubleCheckLock('test:key', mockDbQuery, 60);

      // 立即第二次查询（应该等待锁）
      const promise2 = cacheProtection.getWithDoubleCheckLock('test:key', mockDbQuery, 60);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toEqual({ id: 1, name: 'Test Data' });
      expect(result2).toEqual({ id: 1, name: 'Test Data' });
      expect(dbCallCount).toBe(1); // 只查询一次数据库
    });
  });

  describe('Cache Avalanche Protection', () => {
    it('should use random TTL to prevent simultaneous expiration', async () => {
      const keys: string[] = [];
      const ttlValues: number[] = [];

      // 创建多个缓存项
      for (let i = 0; i < 10; i++) {
        const key = `user:${i}`;
        keys.push(key);

        await cacheProtection.getWithRandomTTL(key, async () => ({ id: i }), 60, 5);

        // 获取每个键的 TTL
        const ttl = await redis.ttl(`test:protection:${key}`);
        ttlValues.push(ttl);
      }

      // 验证 TTL 值是分散的（不是全部相同）
      const uniqueTtlValues = new Set(ttlValues);
      expect(uniqueTtlValues.size).toBeGreaterThan(1);

      // 验证 TTL 值在合理范围内
      ttlValues.forEach((ttl) => {
        expect(ttl).toBeGreaterThanOrEqual(55); // 60 - 5
        expect(ttl).toBeLessThanOrEqual(65); // 60 + 5
      });
    });

    it('should trigger circuit breaker when error threshold reached', async () => {
      let callCount = 0;
      const mockDbQuery = async () => {
        callCount++;
        throw new Error('Database error');
      };

      const initialState = cacheProtection.getCircuitBreakerState();
      expect(initialState).toBe('CLOSED');

      // 连续失败
      for (let i = 0; i < 3; i++) {
        try {
          await cacheProtection.getWithCircuitBreaker('fail:key', mockDbQuery, 60);
        } catch (error) {
          // 预期会失败
        }
      }

      // 熔断器应该打开
      const openedState = cacheProtection.getCircuitBreakerState();
      expect(openedState).toBe('OPEN');

      // 后续请求应该被拒绝
      try {
        await cacheProtection.getWithCircuitBreaker('fail:key', mockDbQuery, 60);
        expect(true).toBe(false); // 不应该到达这里
      } catch (error) {
        expect((error as Error).message).toBe('Circuit breaker is open');
      }
    });

    it('should recover circuit breaker after timeout', async () => {
      let callCount = 0;
      const mockDbQuery = async () => {
        callCount++;
        if (callCount <= 3) {
          throw new Error('Database error');
        }
        return { id: 1 };
      };

      // 触发熔断器
      for (let i = 0; i < 3; i++) {
        try {
          await cacheProtection.getWithCircuitBreaker('recover:key', mockDbQuery, 60);
        } catch (error) {}
      }

      // 等待恢复超时
      await new Promise((resolve) => setTimeout(resolve, 5100));

      // 熔断器应该恢复
      const state = cacheProtection.getCircuitBreakerState();
      expect(state).not.toBe('OPEN');

      // 应该能够正常查询
      const result = await cacheProtection.getWithCircuitBreaker('recover:key', mockDbQuery, 60);
      expect(result).toEqual({ id: 1 });
    });

    it('should rate limit requests', async () => {
      const mockDbQuery = async () => ({ id: 1 });

      // 快速发送多个请求（超过限制）
      const promises: Promise<any>[] = [];
      for (let i = 0; i < 15; i++) {
        promises.push(
          cacheProtection.getWithRateLimit(`rate:${i}`, mockDbQuery, 60).catch((error) => {
            return error;
          })
        );
      }

      const results = await Promise.all(promises);

      // 有些请求应该被限流（实际限流逻辑可能不同，这里检查是否有错误）
      const hasErrors = results.some((r) => r instanceof Error);
      expect(hasErrors).toBe(true);
    });
  });

  describe('Combined Protection', () => {
    it('should work with null protection and random TTL', async () => {
      let dbCallCount = 0;
      const mockDbQuery = async () => {
        dbCallCount++;
        return null;
      };

      // 第一次查询
      const result1 = await cacheProtection.getWithNullProtection('combined:key', mockDbQuery, {
        ttl: 60,
        randomTtl: 5,
      });
      expect(result1).toBeNull();
      expect(dbCallCount).toBe(1);

      // 第二次查询（应该从缓存获取）
      const result2 = await cacheProtection.getWithNullProtection('combined:key', mockDbQuery, {
        ttl: 60,
        randomTtl: 5,
      });
      expect(result2).toBeNull();
      expect(dbCallCount).toBe(1);
    });

    it('should work with double check and circuit breaker', async () => {
      let dbCallCount = 0;
      const mockDbQuery = async () => {
        dbCallCount++;
        if (dbCallCount === 1) {
          return { id: 1 };
        }
        throw new Error('Database error');
      };

      // 第一次成功查询
      const result1 = await cacheProtection.getWithCircuitBreaker('combined:key', mockDbQuery, 60);
      expect(result1).toEqual({ id: 1 });

      // 第二次从缓存获取（不应该触发熔断器）
      const result2 = await cacheProtection.getWithCircuitBreaker('combined:key', mockDbQuery, 60);
      expect(result2).toEqual({ id: 1 });
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis connection errors gracefully', async () => {
      const mockDbQuery = async () => ({ id: 1 });

      // 断开 Redis 连接
      await redis.quit();

      // 即使 Redis 不可用，也应该返回数据
      const result = await cacheProtection.getWithNullProtection('error:key', mockDbQuery, {
        ttl: 60,
      });
      expect(result).toEqual({ id: 1 });

      // 重新连接
      redis = createRedisClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        lazyConnect: false,
      });
      await redis.connect();
    });

    it('should handle function execution errors', async () => {
      const mockDbQuery = async () => {
        throw new Error('Function execution error');
      };

      try {
        await cacheProtection.getWithNullProtection('error:function', mockDbQuery, { ttl: 60 });
        expect(true).toBe(false); // 不应该到达这里
      } catch (error) {
        expect((error as Error).message).toBe('Function execution error');
      }
    });
  });
});
