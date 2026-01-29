import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { createRedisClient, RedisClient } from '../../lib/redis';

describe('Redis Client', () => {
  let redis: RedisClient;
  let testDb = 15; // 使用第15个数据库进行测试

  beforeAll(async () => {
    redis = createRedisClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      db: testDb,
      lazyConnect: false,
    });

    // 等待连接
    await redis.connect();
  });

  afterAll(async () => {
    await redis.disconnect();
  });

  beforeEach(async () => {
    // 每个测试前清空测试数据库
    await redis.flushdb();
  });

  describe('Connection', () => {
    it('should connect successfully', async () => {
      const result = await redis.ping();
      expect(result).toBe('PONG');
    });

    it('should handle ping command', async () => {
      const result = await redis.ping();
      expect(result).toBe('PONG');
    });

    it('should get and set values', async () => {
      await redis.set('test:key', 'test_value');
      const value = await redis.get('test:key');
      expect(value).toBe('test_value');
    });

    it('should get database info', async () => {
      const info = await redis.info('server');
      expect(info).toContain('redis_version');
    });
  });

  describe('Basic Operations', () => {
    it('should set and get string value', async () => {
      await redis.set('string:key', 'hello');
      const value = await redis.get('string:key');
      expect(value).toBe('hello');
    });

    it('should set with TTL', async () => {
      await redis.set('ttl:key', 'value', 'EX', 1);
      const value1 = await redis.get('ttl:key');
      expect(value1).toBe('value');

      // 等待过期
      await new Promise((resolve) => setTimeout(resolve, 1100));
      const value2 = await redis.get('ttl:key');
      expect(value2).toBeNull();
    });

    it('should delete key', async () => {
      await redis.set('delete:key', 'value');
      await redis.del('delete:key');
      const value = await redis.get('delete:key');
      expect(value).toBeNull();
    });

    it('should check if key exists', async () => {
      await redis.set('exists:key', 'value');
      const exists1 = await redis.exists('exists:key');
      expect(exists1).toBe(1);

      const exists2 = await redis.exists('not:exists:key');
      expect(exists2).toBe(0);
    });

    it('should get TTL', async () => {
      await redis.set('ttl:check', 'value', 'EX', 10);
      const ttl = await redis.ttl('ttl:check');
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(10);
    });

    it('should return -1 for key without TTL', async () => {
      await redis.set('no:ttl', 'value');
      const ttl = await redis.ttl('no:ttl');
      expect(ttl).toBe(-1);
    });

    it('should return -2 for non-existent key', async () => {
      const ttl = await redis.ttl('not:exists');
      expect(ttl).toBe(-2);
    });
  });

  describe('Pipeline', () => {
    it('should execute pipeline commands', async () => {
      const pipeline = redis.pipeline();
      pipeline.set('pipe:key1', 'value1');
      pipeline.set('pipe:key2', 'value2');
      pipeline.set('pipe:key3', 'value3');
      const results = await pipeline.exec();

      expect(results).toHaveLength(3);
      expect(results[0][1]).toBe('OK');
      expect(results[1][1]).toBe('OK');
      expect(results[2][1]).toBe('OK');

      // 验证值
      const value1 = await redis.get('pipe:key1');
      const value2 = await redis.get('pipe:key2');
      const value3 = await redis.get('pipe:key3');

      expect(value1).toBe('value1');
      expect(value2).toBe('value2');
      expect(value3).toBe('value3');
    });

    it('should handle pipeline with get commands', async () => {
      await redis.set('pipe:get1', 'val1');
      await redis.set('pipe:get2', 'val2');

      const pipeline = redis.pipeline();
      pipeline.get('pipe:get1');
      pipeline.get('pipe:get2');
      pipeline.get('pipe:get3'); // 不存在的 key
      const results = await pipeline.exec();

      expect(results).toHaveLength(3);
      expect(results[0][1]).toBe('val1');
      expect(results[1][1]).toBe('val2');
      expect(results[2][1]).toBeNull();
    });
  });

  describe('Lua Script', () => {
    it('should execute simple Lua script', async () => {
      const script = 'return ARGV[1]';
      const result = await redis.eval(script, 0, 'hello');
      expect(result).toBe('hello');
    });

    it('should execute Lua script with keys', async () => {
      await redis.set('lua:key', 'world');

      const script = 'return redis.call("GET", KEYS[1])';
      const result = await redis.eval(script, 1, 'lua:key');
      expect(result).toBe('world');
    });

    it('should execute complex Lua script', async () => {
      // 模拟分布式锁释放
      await redis.set('lock:test', 'lock_value');

      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      const result = await redis.eval(script, 1, 'lock:test', 'lock_value');
      expect(result).toBe(1);

      const exists = await redis.exists('lock:test');
      expect(exists).toBe(0);
    });
  });

  describe('Hash Operations', () => {
    it('should set and get hash fields', async () => {
      await redis.hset('user:123', 'name', 'John');
      await redis.hset('user:123', 'age', '30');

      const name = await redis.hget('user:123', 'name');
      const age = await redis.hget('user:123', 'age');

      expect(name).toBe('John');
      expect(age).toBe('30');
    });

    it('should get all hash fields', async () => {
      await redis.hset('user:456', 'name', 'Jane');
      await redis.hset('user:456', 'email', 'jane@example.com');

      const all = await redis.hgetall('user:456');
      expect(all).toEqual({
        name: 'Jane',
        email: 'jane@example.com',
      });
    });

    it('should delete hash field', async () => {
      await redis.hset('user:789', 'name', 'Bob');
      await redis.hdel('user:789', 'name');

      const name = await redis.hget('user:789', 'name');
      expect(name).toBeNull();
    });
  });

  describe('Set Operations', () => {
    it('should add members to set', async () => {
      await redis.sadd('tags:post:1', 'javascript', 'redis', 'cache');

      const members = await redis.smembers('tags:post:1');
      expect(members).toHaveLength(3);
      expect(members).toContain('javascript');
      expect(members).toContain('redis');
      expect(members).toContain('cache');
    });

    it('should check if member exists in set', async () => {
      await redis.sadd('tags:post:2', 'typescript');

      const exists1 = await redis.sismember('tags:post:2', 'typescript');
      const exists2 = await redis.sismember('tags:post:2', 'javascript');

      expect(exists1).toBe(1);
      expect(exists2).toBe(0);
    });

    it('should remove member from set', async () => {
      await redis.sadd('tags:post:3', 'tag1', 'tag2');
      await redis.srem('tags:post:3', 'tag1');

      const members = await redis.smembers('tags:post:3');
      expect(members).toHaveLength(1);
      expect(members[0]).toBe('tag2');
    });
  });

  describe('List Operations', () => {
    it('should push and pop from list', async () => {
      await redis.rpush('queue:tasks', 'task1');
      await redis.rpush('queue:tasks', 'task2');
      await redis.rpush('queue:tasks', 'task3');

      const task1 = await redis.lpop('queue:tasks');
      const task2 = await redis.lpop('queue:tasks');
      const task3 = await redis.lpop('queue:tasks');

      expect(task1).toBe('task1');
      expect(task2).toBe('task2');
      expect(task3).toBe('task3');
    });

    it('should get list length', async () => {
      await redis.rpush('list:test', 'item1', 'item2', 'item3');

      const length = await redis.llen('list:test');
      expect(length).toBe(3);
    });

    it('should get list range', async () => {
      await redis.rpush('list:range', 'a', 'b', 'c', 'd', 'e');

      const range = await redis.lrange('list:range', 1, 3);
      expect(range).toEqual(['b', 'c', 'd']);
    });
  });

  describe('Pattern Operations', () => {
    it('should find keys by pattern', async () => {
      await redis.set('test:pattern:1', 'value1');
      await redis.set('test:pattern:2', 'value2');
      await redis.set('other:key', 'value3');

      const keys = await redis.keys('test:pattern:*');
      expect(keys).toHaveLength(2);
      expect(keys).toContain('test:pattern:1');
      expect(keys).toContain('test:pattern:2');
    });

    it('should delete keys by pattern', async () => {
      await redis.set('pattern:delete:1', 'value1');
      await redis.set('pattern:delete:2', 'value2');
      await redis.set('pattern:delete:3', 'value3');

      const keys = await redis.keys('pattern:delete:*');
      for (const key of keys) {
        await redis.del(key);
      }

      const remaining = await redis.keys('pattern:delete:*');
      expect(remaining).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent key get', async () => {
      const value = await redis.get('non:existent:key');
      expect(value).toBeNull();
    });

    it('should handle operations on wrong type', async () => {
      await redis.set('string:type', 'value');

      // 尝试在字符串上执行 hash 操作，Redis 会返回错误
      try {
        await redis.hget('string:type', 'field');
        // 如果没有抛出错误，说明行为不符合预期
        expect(true).toBe(false);
      } catch (error) {
        // 预期会抛出错误
        expect(error).toBeDefined();
      }
    });
  });
});
