import { createRedisClient } from './lib/redis';
import { createCacheClient } from './lib/cache';

async function testSetNullVerbose() {
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

  const options = { setNull: false };
  console.log('Options:', options);
  console.log('setNull value:', options.setNull);
  console.log('Value to set:', null);
  console.log('value === null:', null === null);
  console.log('!setNull:', !options.setNull);

  console.log('\nSetting null with setNull: false...');
  await cache.set('test:key', null, options);

  console.log('Getting value...');
  const value = await cache.get('test:key');
  console.log('Value:', value);
  console.log('Value type:', typeof value);

  await redis.disconnect();
}

testSetNullVerbose().catch(console.error);
