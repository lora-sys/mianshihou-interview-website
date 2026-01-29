import { createCacheClient } from './lib/cache';
import { createRedisClient } from './lib/redis';

async function test() {
  const redis = createRedisClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    db: 15,
    lazyConnect: false,
  });
  await redis.connect();

  const cache = createCacheClient({
    prefix: 'test',
    redis,
  });

  await redis.flushdb();

  console.log('Testing getOrSet...');

  const value = await cache.getOrSet('getorset:new', async () => {
    console.log('Computing value...');
    return 'computed_value';
  });

  console.log('Value:', value);
  console.log('Type:', typeof value);

  const cached = await cache.get('getorset:new');
  console.log('Cached:', cached);
  console.log('Cached Type:', typeof cached);

  await redis.disconnect();
}

test().catch(console.error);
