import { createCacheClient, type CacheClient } from '../../lib/cache';
import { createRedisClient, type RedisClient } from '../../lib/redis';
import { logger } from '../../lib/logger';

export interface CacheMiddlewareOptions {
  ttl?: number; // 过期时间（秒）
  randomTtl?: number; // 随机 TTL 范围（秒）
  keyGenerator?: (ctx: any, input: any) => string; // 自定义缓存键生成函数
  tags?: string[]; // 缓存标签
  version?: string; // 缓存版本
  enableNullCache?: boolean; // 是否启用空值缓存（防穿透）
  enableDoubleCheck?: boolean; // 是否启用双重检查（防击穿）
  cache?: CacheClient; // 可选的外部缓存实例
}

export interface InvalidateCacheMiddlewareOptions {
  tags?: string[]; // 要清除的缓存标签
  patterns?: string[]; // 要清除的缓存模式
  keys?: string[]; // 要清除的缓存键
  cache?: CacheClient; // 可选的外部缓存实例
}

/**
 * 全局 Redis 客户端（单例）
 */
let globalRedis: RedisClient | null = null;
let globalCache: CacheClient | null = null;

function getRedisClient(): RedisClient {
  if (!globalRedis) {
    globalRedis = createRedisClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      lazyConnect: false,
    });
  }
  return globalRedis;
}

function getCacheClient(): CacheClient {
  if (!globalCache) {
    globalCache = createCacheClient({
      redis: getRedisClient(),
      prefix: 'trpc',
    });
  }
  return globalCache;
}

/**
 * 缓存中间件 - 自动缓存查询结果
 */
export function cacheMiddleware(options: CacheMiddlewareOptions = {}) {
  const cache = options.cache || getCacheClient();
  const defaultTTL = options.ttl || 300; // 默认 5 分钟

  return async ({ ctx, next, input, type }: any) => {
    // 只对查询操作进行缓存
    if (type !== 'query') {
      return next();
    }

    // 生成缓存键
    const cacheKey = options.keyGenerator
      ? options.keyGenerator(ctx, input)
      : generateDefaultCacheKey(ctx, input);

    try {
      // 尝试从缓存获取
      const cached = await cache.get(cacheKey);
      if (cached !== undefined) {
        logger.debug(`Cache hit: ${cacheKey}`);
        return cached;
      }

      // 缓存未命中，执行原始查询
      logger.debug(`Cache miss: ${cacheKey}`);
      const result = await next();

      // 如果启用了空值缓存，缓存 null 值
      if (options.enableNullCache && result === null) {
        await cache.set(cacheKey, result, {
          ttl: defaultTTL,
          tags: options.tags,
          version: options.version,
          randomTtl: options.randomTtl,
          setNull: true, // 明确告诉缓存系统要缓存 null 值
        });
        return result;
      }

      // 如果结果为 null 且未启用空值缓存，不缓存
      if (result === null) {
        return result;
      }

      // 缓存结果
      await cache.set(cacheKey, result, {
        ttl: defaultTTL,
        tags: options.tags,
        version: options.version,
        randomTtl: options.randomTtl,
      });

      return result;
    } catch (error) {
      // 缓存失败，降级到直接执行
      logger.error(`Cache middleware error: ${cacheKey}`, error);
      return next();
    }
  };
}

/**
 * 缓存失效中间件 - 自动清除相关缓存
 */
export function invalidateCacheMiddleware(options: InvalidateCacheMiddlewareOptions = {}) {
  const cache = options.cache || getCacheClient();

  return async ({ ctx, next }: any) => {
    // 执行原始操作
    const result = await next();

    try {
      // 清除标签相关的缓存
      if (options.tags && options.tags.length > 0) {
        for (const tag of options.tags) {
          await cache.clearByTag(tag);
          logger.debug(`Invalidated cache by tag: ${tag}`);
        }
      }

      // 清除模式相关的缓存
      if (options.patterns && options.patterns.length > 0) {
        for (const pattern of options.patterns) {
          await cache.clear(pattern);
          logger.debug(`Invalidated cache by pattern: ${pattern}`);
        }
      }

      // 清除指定的缓存键
      if (options.keys && options.keys.length > 0) {
        await cache.delete(options.keys);
        logger.debug(`Invalidated cache by keys: ${options.keys.join(', ')}`);
      }
    } catch (error) {
      // 缓存失效失败，不影响主流程
      logger.error('Cache invalidation error:', error);
    }

    return result;
  };
}

/**
 * 生成默认缓存键
 */
function generateDefaultCacheKey(ctx: any, input: any): string {
  const path = ctx._def._path.join('.');
  const inputStr = JSON.stringify(input || {});
  return `${path}:${inputStr}`;
}

/**
 * 清除所有缓存
 */
export async function clearAllCache(): Promise<void> {
  const cache = getCacheClient();
  await cache.clear();
  logger.info('Cleared all cache');
}

/**
 * 清除指定标签的缓存
 */
export async function clearCacheByTag(tag: string): Promise<void> {
  const cache = getCacheClient();
  await cache.clearByTag(tag);
  logger.info(`Cleared cache by tag: ${tag}`);
}

/**
 * 清除指定模式的缓存
 */
export async function clearCacheByPattern(pattern: string): Promise<void> {
  const cache = getCacheClient();
  await cache.clear(pattern);
  logger.info(`Cleared cache by pattern: ${pattern}`);
}

/**
 * 关闭缓存客户端
 */
export async function closeCacheClient(): Promise<void> {
  if (globalCache) {
    // CacheClient 没有关闭方法，只需关闭 Redis
  }
  if (globalRedis) {
    await globalRedis.disconnect();
    globalRedis = null;
  }
  globalCache = null;
  logger.info('Cache client closed');
}
