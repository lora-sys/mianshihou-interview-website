import { createRedisClient } from './lib/redis';
import { createCacheClient } from './lib/cache';

async function testNullCache() {
  const redis = createRedisClient({
    host: 'localhost',
    port: 6379,
    lazyConnect: false,
  });

  await redis.connect();

  const cache = createCacheClient({
    redis,
    prefix: 'test:debug',
  });

  // 清空缓存
  await cache.clear();

  // 设置 null 值
  console.log('Setting null value...');
  await cache.set('test:key', null, {
    ttl: 300,
    setNull: true,
  });

  // 获取值
  console.log('Getting value...');
  const value = await cache.get('test:key');
  console.log('Value:', value);
  console.log('Value type:', typeof value);
  console.log('Value === null:', value === null);

  // 直接从 Redis 获取
  const rawValue = await redis.get('test:debug:test:key');
  console.log('Raw value:', rawValue);

  await redis.disconnect();
}

testNullCache().catch(console.error);
