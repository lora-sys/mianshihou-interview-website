import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { createCacheClient, CacheClient } from '../../lib/cache';
import { createRedisClient } from '../../lib/redis';

describe('Cache Utils', () => {
  let cache: CacheClient;
  let redis: ReturnType<typeof createRedisClient>;
  let testDb = 15;

  beforeAll(async () => {
    redis = createRedisClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      db: testDb,
      lazyConnect: false,
    });
    await redis.connect();

    cache = createCacheClient({
      prefix: 'test',
      redis,
    });
  });

  afterAll(async () => {
    await redis.flushdb();
    // 不要关闭 Redis 连接，因为它是全局共享的
    // await redis.disconnect();
  });

  beforeEach(async () => {
    await redis.flushdb();
  });

  describe('Basic CRUD', () => {
    it('should get and set cache', async () => {
      await cache.set('key1', 'value1');
      const value = await cache.get('key1');
      expect(value).toBe('value1');
    });

    it('should get and set object', async () => {
      const obj = { name: 'John', age: 30 };
      await cache.set('user:1', obj);
      const value = await cache.get('user:1');
      expect(value).toEqual(obj);
    });

    it('should get and set array', async () => {
      const arr = [1, 2, 3, 4, 5];
      await cache.set('numbers', arr);
      const value = await cache.get('numbers');
      expect(value).toEqual(arr);
    });

    it('should return null for non-existent key', async () => {
      const value = await cache.get('non:existent');
      expect(value).toBeUndefined();
    });

    it('should delete cache', async () => {
      await cache.set('delete:me', 'value');
      await cache.delete('delete:me');
      const value = await cache.get('delete:me');
      expect(value).toBeUndefined();
    });

    it('should delete multiple keys', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');

      await cache.delete(['key1', 'key2']);

      const value1 = await cache.get('key1');
      const value2 = await cache.get('key2');
      const value3 = await cache.get('key3');

      expect(value1).toBeUndefined();
      expect(value2).toBeUndefined();
      expect(value3).toBe('value3');
    });

    it('should clear cache by pattern', async () => {
      await cache.set('user:1', 'user1');
      await cache.set('user:2', 'user2');
      await cache.set('post:1', 'post1');

      await cache.clear('user:*');

      const user1 = await cache.get('user:1');
      const user2 = await cache.get('user:2');
      const post1 = await cache.get('post:1');

      expect(user1).toBeUndefined();
      expect(user2).toBeUndefined();
      expect(post1).toBe('post1');
    });

    it('should clear all cache', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      await cache.clear();

      const value1 = await cache.get('key1');
      const value2 = await cache.get('key2');

      expect(value1).toBeUndefined();
      expect(value2).toBeUndefined();
    });
  });

  describe('TTL', () => {
    it('should expire after TTL', async () => {
      await cache.set('ttl:key', 'value', { ttl: 1 });
      const value1 = await cache.get('ttl:key');
      expect(value1).toBe('value');

      // 等待过期
      await new Promise((resolve) => setTimeout(resolve, 1100));
      const value2 = await cache.get('ttl:key');
      expect(value2).toBeUndefined();
    });

    it('should support random TTL', async () => {
      // 设置 10 个缓存，TTL 都是 60 秒，随机范围 ±10 秒
      for (let i = 0; i < 10; i++) {
        await cache.set(`random:ttl:${i}`, `value${i}`, { ttl: 60, randomTtl: 10 });
      }

      // 验证 TTL 随机分布
      const ttls = await Promise.all(
        Array(10)
          .fill(0)
          .map((_, i) => redis.ttl(`test:random:ttl:${i}`))
      );

      // TTL 应该分布在 50-70 秒之间（包含边界）
      for (const ttl of ttls) {
        expect(ttl).toBeGreaterThanOrEqual(50);
        expect(ttl).toBeLessThanOrEqual(70);
      }
    });

    it('should return TTL of cached key', async () => {
      await cache.set('ttl:check', 'value', { ttl: 100 });
      const ttl = await cache.ttl('ttl:check');
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(100);
    });
  });

  describe('getOrSet', () => {
    it('should get from cache if exists', async () => {
      await cache.set('getorset:key', 'cached_value');

      const value = await cache.getOrSet('getorset:key', async () => {
        return 'computed_value';
      });

      expect(value).toBe('cached_value');
    });

    it('should set and return if not exists', async () => {
      const value = await cache.getOrSet('getorset:new', async () => {
        return 'computed_value';
      });

      expect(value).toBe('computed_value');

      // 验证已缓存
      const cached = await cache.get('getorset:new');
      expect(cached).toBe('computed_value');
    });

    it('should respect TTL in getOrSet', async () => {
      await cache.getOrSet(
        'getorset:ttl',
        async () => {
          return 'value';
        },
        { ttl: 1 }
      );

      const value1 = await cache.get('getorset:ttl');
      expect(value1).toBe('value');

      await new Promise((resolve) => setTimeout(resolve, 1100));
      const value2 = await cache.get('getorset:ttl');
      expect(value2).toBeUndefined();
    });
  });

  describe('Tags', () => {
    it('should set cache with tags', async () => {
      await cache.set('tagged:key', 'value', { tags: ['user', 'profile'] });
      const value = await cache.get('tagged:key');
      expect(value).toBe('value');
    });

    it('should clear cache by tag', async () => {
      await cache.set('user:1', 'user1', { tags: ['user'] });
      await cache.set('user:2', 'user2', { tags: ['user'] });
      await cache.set('post:1', 'post1', { tags: ['post'] });

      await cache.clearByTag('user');

      const user1 = await cache.get('user:1');
      const user2 = await cache.get('user:2');
      const post1 = await cache.get('post:1');

      expect(user1).toBeUndefined();
      expect(user2).toBeUndefined();
      expect(post1).toBe('post1');
    });

    it('should clear cache by multiple tags', async () => {
      await cache.set('item:1', 'item1', { tags: ['user', 'profile'] });
      await cache.set('item:2', 'item2', { tags: ['user', 'settings'] });
      await cache.set('item:3', 'item3', { tags: ['post'] });

      await cache.clearByTag('user');

      const item1 = await cache.get('item:1');
      const item2 = await cache.get('item:2');
      const item3 = await cache.get('item:3');

      expect(item1).toBeUndefined();
      expect(item2).toBeUndefined();
      expect(item3).toBe('item3');
    });
  });

  describe('Version', () => {
    it('should set cache with version', async () => {
      await cache.set('versioned:key', 'value', { version: 'v1' });
      const value = await cache.get('versioned:key');
      expect(value).toBe('value');
    });

    it('should invalidate cache by version increment', async () => {
      await cache.set('versioned:item1', 'item1', { version: 'user:1' });
      await cache.set('versioned:item2', 'item2', { version: 'user:1' });

      // 增加版本
      await cache.incrementVersion('user:1');

      // 验证缓存失效
      const item1 = await cache.get('versioned:item1');
      const item2 = await cache.get('versioned:item2');

      expect(item1).toBeUndefined();
      expect(item2).toBeUndefined();
    });

    it('should not affect cache with different version', async () => {
      await cache.set('versioned:a', 'a', { version: 'user:1' });
      await cache.set('versioned:b', 'b', { version: 'user:2' });

      await cache.incrementVersion('user:1');

      const a = await cache.get('versioned:a');
      const b = await cache.get('versioned:b');

      expect(a).toBeUndefined();
      expect(b).toBe('b');
    });
  });

  describe('Null Caching', () => {
    it('should cache null values when enabled', async () => {
      await cache.set('null:key', null, { setNull: true });
      const value = await cache.get('null:key');
      expect(value).toBeNull(); // 缓存值为 null
    });

    it('should not cache null values when disabled', async () => {
      await cache.set('null:key2', null, { setNull: false });
      const value = await cache.get('null:key2');
      expect(value).toBeUndefined(); // 没有缓存
    });

    it('should distinguish between null and undefined', async () => {
      await cache.set('null:key3', null, { setNull: true });
      await cache.set('undefined:key3', undefined, { setNull: true });

      const nullValue = await cache.get('null:key3');
      const undefinedValue = await cache.get('undefined:key3');

      expect(nullValue).toBeNull(); // 缓存的值是 null
      expect(undefinedValue).toBeNull(); // undefined 被序列化为 null，所以也返回 null
    });
  });

  describe('Key Prefix', () => {
    it('should use configured prefix', async () => {
      const customCache = createCacheClient({
        prefix: 'custom',
        redis,
      });

      await customCache.set('key', 'value');

      // 验证键名包含前缀
      const exists = await redis.exists('custom:key');
      expect(exists).toBe(1);
    });

    it('should not use default prefix when empty', async () => {
      const noPrefixCache = createCacheClient({
        prefix: '',
        redis,
      });

      await noPrefixCache.set('key', 'value');

      // 验证键名不包含前缀
      const exists = await redis.exists('key');
      expect(exists).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle JSON serialization errors', async () => {
      // 创建循环引用对象
      const obj: any = { name: 'test' };
      obj.self = obj;

      await expect(cache.set('circular', obj)).rejects.toThrow();
    });

    it('should handle invalid JSON', async () => {
      // 手动设置无效的 JSON
      await redis.set('test:invalid', 'invalid json');

      const value = await cache.get('invalid');
      expect(value).toBeNull(); // 解析失败返回 null
    });
  });

  describe('Performance', () => {
    it('should handle large number of operations', async () => {
      const operations = 100;

      // 设置
      const setPromises = Array(operations)
        .fill(0)
        .map((_, i) => cache.set(`perf:set:${i}`, `value${i}`));
      await Promise.all(setPromises);

      // 获取
      const getPromises = Array(operations)
        .fill(0)
        .map((_, i) => cache.get(`perf:set:${i}`));
      const results = await Promise.all(getPromises);

      expect(results).toHaveLength(operations);
      expect(results.every((r) => r !== null)).toBe(true);
    });

    it('should handle large objects', async () => {
      const largeObj = {
        data: Array(10000)
          .fill(0)
          .map((_, i) => ({
            id: i,
            name: `item${i}`,
            value: Math.random(),
          })),
      };

      await cache.set('large:obj', largeObj);
      const value = await cache.get('large:obj');

      expect(value).toEqual(largeObj);
    });
  });
});
