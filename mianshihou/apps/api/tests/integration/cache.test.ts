import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { createRedisClient, type RedisClient } from '../../lib/redis';
import { createCacheClient, type CacheClient } from '../../lib/cache';
import { cacheMiddleware, invalidateCacheMiddleware } from '../../trpc/middleware/cache';

describe('Cache Integration Tests', () => {
  let redis: RedisClient;
  let cache: CacheClient;

  beforeAll(async () => {
    // 初始化 Redis
    redis = createRedisClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      lazyConnect: false,
    });

    await redis.connect();

    // 初始化缓存
    cache = createCacheClient({
      redis,
      prefix: 'test:integration',
    });
  });

  afterAll(async () => {
    await redis.disconnect();
  });

  beforeEach(async () => {
    // 每个测试前清空缓存
    await cache.clear();
  });

  describe('Cache Middleware', () => {
    it('should cache query results', async () => {
      let callCount = 0;
      const mockQuery = async () => {
        callCount++;
        return { data: `result_${callCount}` };
      };

      // 模拟 tRPC 上下文
      const ctx = {
        _def: { _path: ['test', 'query'] },
      };

      const middleware = cacheMiddleware({
        cache,
        ttl: 300,
        keyGenerator: () => 'test:key',
        cache,
      });

      // 第一次调用（未命中缓存）
      const result1 = await middleware({
        ctx,
        next: mockQuery,
        input: {},
        type: 'query',
      });
      expect(result1).toEqual({ data: 'result_1' });
      expect(callCount).toBe(1);

      // 第二次调用（命中缓存）
      const result2 = await middleware({
        ctx,
        next: mockQuery,
        input: {},
        type: 'query',
      });
      expect(result2).toEqual({ data: 'result_1' });
      expect(callCount).toBe(1); // 不应该再次调用
    });

    it('should not cache mutations', async () => {
      let callCount = 0;
      const mockMutation = async () => {
        callCount++;
        return { success: true };
      };

      const ctx = {
        _def: { _path: ['test', 'mutation'] },
      };

      const middleware = cacheMiddleware({
        cache,
        ttl: 300,
        keyGenerator: () => 'test:key',
        cache,
      });

      // 第一次调用
      await middleware({
        ctx,
        next: mockMutation,
        input: {},
        type: 'mutation',
      });
      expect(callCount).toBe(1);

      // 第二次调用（mutation 不应该缓存）
      await middleware({
        ctx,
        next: mockMutation,
        input: {},
        type: 'mutation',
      });
      expect(callCount).toBe(2); // 应该再次调用
    });

    it('should cache null values when enabled', async () => {
      let callCount = 0;
      const mockQuery = async () => {
        callCount++;
        return null;
      };

      const ctx = {
        _def: { _path: ['test', 'query'] },
      };

      const middleware = cacheMiddleware({
        cache,
        ttl: 300,
        keyGenerator: () => 'test:null:key',
        enableNullCache: true,
      });

      // 第一次调用
      const result1 = await middleware({
        ctx,
        next: mockQuery,
        input: {},
        type: 'query',
      });
      expect(result1).toBeNull();
      expect(callCount).toBe(1);

      // 第二次调用（应该从缓存获取 null）
      const result2 = await middleware({
        ctx,
        next: mockQuery,
        input: {},
        type: 'query',
      });
      expect(result2).toBeNull();
      expect(callCount).toBe(1); // 不应该再次调用
    });

    it('should not cache null values when disabled', async () => {
      let callCount = 0;
      const mockQuery = async () => {
        callCount++;
        return null;
      };

      const ctx = {
        _def: { _path: ['test', 'query'] },
      };

      const middleware = cacheMiddleware({
        cache,
        ttl: 300,
        keyGenerator: () => 'test:null:key',
        enableNullCache: false,
      });

      // 第一次调用
      const result1 = await middleware({
        ctx,
        next: mockQuery,
        input: {},
        type: 'query',
      });
      expect(result1).toBeNull();
      expect(callCount).toBe(1);

      // 第二次调用（应该再次调用，因为没有缓存 null）
      const result2 = await middleware({
        ctx,
        next: mockQuery,
        input: {},
        type: 'query',
      });
      expect(result2).toBeNull();
      expect(callCount).toBe(2); // 应该再次调用
    });

    it('should use different cache keys for different inputs', async () => {
      let callCount = 0;
      const mockQuery = async ({ input }: any) => {
        callCount++;
        return { id: input.id };
      };

      const ctx = {
        _def: { _path: ['test', 'query'] },
      };

      const middleware = cacheMiddleware({
        cache,
        ttl: 300,
        keyGenerator: (ctx, input: any) => `test:key:${input.id}`,
      });

      // 第一次调用
      const result1 = await middleware({
        ctx,
        next: () => mockQuery({ input: { id: 1 } }),
        input: { id: 1 },
        type: 'query',
      });
      expect(result1).toEqual({ id: 1 });
      expect(callCount).toBe(1);

      // 第二次调用（不同的输入）
      const result2 = await middleware({
        ctx,
        next: () => mockQuery({ input: { id: 2 } }),
        input: { id: 2 },
        type: 'query',
      });
      expect(result2).toEqual({ id: 2 });
      expect(callCount).toBe(2); // 应该再次调用

      // 第三次调用（与第一次相同的输入）
      const result3 = await middleware({
        ctx,
        next: () => mockQuery({ input: { id: 1 } }),
        input: { id: 1 },
        type: 'query',
      });
      expect(result3).toEqual({ id: 1 });
      expect(callCount).toBe(2); // 不应该再次调用
    });

    it('should handle cache errors gracefully', async () => {
      const mockQuery = async () => {
        return { data: 'result' };
      };

      const ctx = {
        _def: { _path: ['test', 'query'] },
      };

      const middleware = cacheMiddleware({ cache, ttl: 300, keyGenerator: () => 'test:key' });

      // 模拟缓存错误（通过清空缓存）
      await cache.clear();

      // 即使缓存失败，也应该返回结果
      const result = await middleware({
        ctx,
        next: mockQuery,
        input: {},
        type: 'query',
      });
      expect(result).toEqual({ data: 'result' });
    });
  });

  describe('Invalidate Cache Middleware', () => {
    it('should invalidate cache by tags', async () => {
      let callCount = 0;
      const mockQuery = async () => {
        callCount++;
        return { data: `result_${callCount}` };
      };

      const ctx = {
        _def: { _path: ['test', 'query'] },
      };

      const cacheMiddlewareInstance = cacheMiddleware({
        cache,
        ttl: 300,
        keyGenerator: () => 'test:tagged:key',
        tags: ['posts'],
      });

      // 缓存数据
      await cacheMiddlewareInstance({
        ctx,
        next: mockQuery,
        input: {},
        type: 'query',
      });

      // 失效缓存
      const invalidateMiddleware = invalidateCacheMiddleware({ cache, tags: ['posts'] });

      let mutationCallCount = 0;
      const mockMutation = async () => {
        mutationCallCount++;
        return { success: true };
      };

      await invalidateMiddleware({
        ctx,
        next: mockMutation,
      });

      // 再次查询（应该重新获取数据）
      const result = await cacheMiddlewareInstance({
        ctx,
        next: mockQuery,
        input: {},
        type: 'query',
      });

      expect(result).toEqual({ data: 'result_2' });
      expect(callCount).toBe(2); // 应该再次调用
    });

    it('should invalidate cache by pattern', async () => {
      const ctx = {
        _def: { _path: ['test', 'mutation'] },
      };

      // 创建一些缓存
      await cache.set('test:pattern:key1', 'value1', { tags: ['test'] });
      await cache.set('test:pattern:key2', 'value2', { tags: ['test'] });

      // 验证缓存存在
      const value1 = await cache.get('test:pattern:key1');
      const value2 = await cache.get('test:pattern:key2');
      expect(value1).toBe('value1');
      expect(value2).toBe('value2');

      // 失效缓存
      const invalidateMiddleware = invalidateCacheMiddleware({
        cache,
        patterns: ['test:pattern:*'],
      });

      await invalidateMiddleware({
        ctx,
        next: async () => ({ success: true }),
      });

      // 验证缓存已清除
      const value1After = await cache.get('test:pattern:key1');
      const value2After = await cache.get('test:pattern:key2');
      expect(value1After).toBeUndefined();
      expect(value2After).toBeUndefined();
    });

    it('should handle invalidation errors gracefully', async () => {
      const ctx = {
        _def: { _path: ['test', 'mutation'] },
      };

      const invalidateMiddleware = invalidateCacheMiddleware({ cache, tags: ['nonexistent'] });

      const mockMutation = async () => {
        return { success: true };
      };

      // 即使缓存失效失败，也应该返回结果
      const result = await invalidateMiddleware({
        ctx,
        next: mockMutation,
      });

      expect(result).toEqual({ success: true });
    });
  });

  describe('Concurrent Access', () => {
    it('should handle concurrent cache reads', async () => {
      let callCount = 0;
      const mockQuery = async () => {
        callCount++;
        await new Promise((resolve) => setTimeout(resolve, 10)); // 模拟延迟
        return { data: `result_${callCount}` };
      };

      const ctx = {
        _def: { _path: ['test', 'query'] },
      };

      const middleware = cacheMiddleware({
        cache,
        ttl: 300,
        keyGenerator: () => 'test:concurrent:key',
      });

      // 先缓存数据
      await middleware({
        ctx,
        next: mockQuery,
        input: {},
        type: 'query',
      });

      // 并发读取
      const promises = Array(10)
        .fill(0)
        .map(() =>
          middleware({
            ctx,
            next: mockQuery,
            input: {},
            type: 'query',
          })
        );

      const results = await Promise.all(promises);

      // 所有结果应该相同
      expect(results.every((r) => r.data === 'result_1')).toBe(true);
      expect(callCount).toBe(1); // 应该只调用一次
    });
  });

  describe('TTL and Expiration', () => {
    it('should expire cache after TTL', async () => {
      let callCount = 0;
      const mockQuery = async () => {
        callCount++;
        return { data: `result_${callCount}` };
      };

      const ctx = {
        _def: { _path: ['test', 'query'] },
      };

      const middleware = cacheMiddleware({
        cache,
        ttl: 2, // 2秒
        keyGenerator: () => 'test:ttl:key',
      });

      // 缓存数据
      const result1 = await middleware({
        ctx,
        next: mockQuery,
        input: {},
        type: 'query',
      });
      expect(result1.data).toBe('result_1');
      expect(callCount).toBe(1);

      // 等待 TTL 过期
      await new Promise((resolve) => setTimeout(resolve, 2100));

      // 再次查询（应该重新获取数据）
      const result2 = await middleware({
        ctx,
        next: mockQuery,
        input: {},
        type: 'query',
      });
      expect(result2.data).toBe('result_2');
      expect(callCount).toBe(2);
    });
  });
});
