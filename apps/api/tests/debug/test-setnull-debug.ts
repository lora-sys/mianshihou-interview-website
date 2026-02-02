import { createRedisClient } from './lib/redis';
import { createCacheClient } from './lib/cache';

async function testSetNull() {
  const redis = createRedisClient({
    host: 'localhost',
    port: 6379,
    lazyConnect: false,
  });

  await redis.connect();

  const cache = createCacheClient({
    redis,
    prefix: 'test:setnull',
  });

  await cache.clear();

  console.log('Setting null with setNull: false...');
  await cache.set('test:key', null, { setNull: false });

  console.log('Getting value...');
  const value = await cache.get('test:key');
  console.log('Value:', value);
  console.log('Value type:', typeof value);
  console.log('Value === undefined:', value === undefined);
  console.log('Value === null:', value === null);

  // 检查 Redis 中是否有这个键
  const exists = await redis.exists('test:setnull:test:key');
  console.log('Key exists in Redis:', exists);

  await redis.disconnect();
}

testSetNull().catch(console.error);
