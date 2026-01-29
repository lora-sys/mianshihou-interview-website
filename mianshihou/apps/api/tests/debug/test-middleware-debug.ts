import { createRedisClient } from './lib/redis';
import { createCacheClient } from './lib/cache';
import { cacheMiddleware } from './trpc/middleware/cache';

async function testMiddlewareNullCache() {
  const redis = createRedisClient({
    host: 'localhost',
    port: 6379,
    lazyConnect: false,
  });

  await redis.connect();

  const cache = createCacheClient({
    redis,
    prefix: 'test:middleware',
  });

  // 清空缓存
  await cache.clear();

  let callCount = 0;
  const mockQuery = async () => {
    callCount++;
    console.log(`Query called (count: ${callCount})`);
    return null;
  };

  const ctx = {
    _def: { _path: ['test', 'query'] },
  };

  const middleware = cacheMiddleware({
    ttl: 300,
    keyGenerator: () => 'test:key',
    cache,
    enableNullCache: true,
  });

  console.log('\n=== First call ===');
  const result1 = await middleware({
    ctx,
    next: mockQuery,
    input: {},
    type: 'query',
  });
  console.log('Result 1:', result1);
  console.log('Call count after first call:', callCount);

  console.log('\n=== Second call ===');
  const result2 = await middleware({
    ctx,
    next: mockQuery,
    input: {},
    type: 'query',
  });
  console.log('Result 2:', result2);
  console.log('Call count after second call:', callCount);

  console.log('\n=== Check cache directly ===');
  const cached = await cache.get('test:key');
  console.log('Cached value:', cached);
  console.log('Cached type:', typeof cached);

  await redis.disconnect();
}

testMiddlewareNullCache().catch(console.error);
