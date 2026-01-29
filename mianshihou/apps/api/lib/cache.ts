import Redis from 'ioredis';
import { logger } from './logger';

// 用于标记缓存不存在的特殊值
const CACHE_NULL_MARKER = '__CACHE_NULL__';

export type CacheOptions = {
  ttl?: number;
  tags?: string[];
  version?: string;
  randomTtl?: number;
  setNull?: boolean;
};

export type CacheConfig = {
  prefix?: string;
  redis: Redis;
  defaultTtl?: number;
  enableNullCache?: boolean;
};

/**
 * 缓存键前缀
 */
const CACHE_KEY_PREFIX = 'cache';
const TAG_KEY_PREFIX = 'tags';
const VERSION_KEY_PREFIX = 'version';

/**
 * 缓存客户端类
 */
class CacheClient {
  private redis: Redis;
  private prefix: string;
  private defaultTtl: number;
  private enableNullCache: boolean;

  constructor(config: CacheConfig) {
    this.redis = config.redis;
    this.prefix = config.prefix !== undefined ? config.prefix : CACHE_KEY_PREFIX;
    this.defaultTtl = config.defaultTtl || 3600; // 默认 1 小时
    this.enableNullCache = config.enableNullCache ?? true;
  }

  /**
   * 生成完整的缓存键
   */
  private buildKey(key: string): string {
    return this.prefix ? `${this.prefix}:${key}` : key;
  }

  /**
   * 序列化值
   */
  private serialize(value: any): string {
    // 如果值为 null，使用特殊标记
    if (value === null) {
      return JSON.stringify({ __null: true });
    }
    return JSON.stringify(value);
  }

  /**
   * 反序列化值
   */
  private deserialize(value: string | null): any {
    if (value === null) {
      return null; // 缓存不存在
    }
    try {
      const parsed = JSON.parse(value);
      // 检查是否是 null 标记
      if (parsed && typeof parsed === 'object' && parsed.__null === true) {
        return null; // 缓存值为 null
      }
      return parsed;
    } catch (error) {
      logger.error('Failed to deserialize cache value:', error);
      return null;
    }
  }

  /**
   * 计算随机 TTL
   */
  private calculateTTL(ttl?: number, randomTtl?: number): number {
    if (!ttl) {
      ttl = this.defaultTtl;
    }
    if (!randomTtl) {
      return ttl;
    }
    const randomOffset = Math.floor(Math.random() * randomTtl * 2) - randomTtl;
    return Math.max(1, ttl + randomOffset);
  }

  /**
   * 添加标签关联
   */
  private async addTags(key: string, tags: string[]): Promise<void> {
    if (tags.length === 0) return;

    const pipeline = this.redis.pipeline();
    for (const tag of tags) {
      const tagKey = `${TAG_KEY_PREFIX}:${tag}`;
      pipeline.sadd(tagKey, key);
      pipeline.expire(tagKey, this.defaultTtl * 2); // 标签的 TTL 是默认 TTL 的 2 倍
    }
    await pipeline.exec();
  }

  /**
   * 删除标签关联
   */
  private async removeTags(key: string, tags: string[]): Promise<void> {
    if (tags.length === 0) return;

    const pipeline = this.redis.pipeline();
    for (const tag of tags) {
      const tagKey = `${TAG_KEY_PREFIX}:${tag}`;
      pipeline.srem(tagKey, key);
    }
    await pipeline.exec();
  }

  /**
   * 添加版本关联
   */
  private async addVersion(key: string, version: string): Promise<void> {
    if (!version) return;

    const versionKey = `${VERSION_KEY_PREFIX}:${version}`;
    await this.redis.sadd(versionKey, key);
    await this.redis.expire(versionKey, this.defaultTtl * 2);
  }

  /**
   * 获取缓存的值
   * @returns 返回缓存的值，如果缓存不存在返回 undefined
   */
  async get<T>(key: string): Promise<T | undefined> {
    const fullKey = this.buildKey(key);
    const value = await this.redis.get(fullKey);
    if (value === null) {
      return undefined; // 缓存不存在
    }
    return this.deserialize(value) as T;
  }

  /**
   * 设置缓存
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const { ttl, tags, version, randomTtl, setNull } = options;

    // 检查是否缓存 null 值
    // 如果明确指定了 setNull，则使用该值；否则使用全局配置
    const shouldCacheNull = setNull !== undefined ? setNull : this.enableNullCache;
    if (value === null && !shouldCacheNull) {
      return;
    }

    const fullKey = this.buildKey(key);
    const serialized = this.serialize(value);
    const actualTTL = this.calculateTTL(ttl, randomTtl);

    const pipeline = this.redis.pipeline();
    pipeline.set(fullKey, serialized);

    if (actualTTL > 0) {
      pipeline.expire(fullKey, actualTTL);
    }

    await pipeline.exec();

    // 添加标签关联
    if (tags && tags.length > 0) {
      await this.addTags(fullKey, tags);
    }

    // 添加版本关联
    if (version) {
      await this.addVersion(fullKey, version);
    }
  }

  /**
   * 删除缓存
   */
  async delete(key: string | string[]): Promise<void> {
    const keys = Array.isArray(key) ? key : [key];
    const fullKeys = keys.map((k) => this.buildKey(k));

    if (fullKeys.length === 0) return;

    // 删除主键
    await this.redis.del(...fullKeys);
  }

  /**
   * 清空缓存
   */
  async clear(pattern?: string): Promise<void> {
    if (!pattern) {
      // 清空所有带前缀的键
      pattern = this.prefix ? `${this.prefix}:*` : '*';
    } else {
      pattern = this.buildKey(pattern);
    }

    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  /**
   * 获取或设置缓存（原子操作）
   */
  async getOrSet<T>(key: string, fn: () => Promise<T>, options: CacheOptions = {}): Promise<T> {
    // 先检查键是否存在
    const fullKey = this.buildKey(key);
    const exists = await this.redis.exists(fullKey);

    if (exists === 1) {
      // 缓存存在，直接获取
      const value = await this.get<T>(key);
      return value as T;
    }

    // 缓存不存在，计算并设置
    const computedValue = await fn();
    await this.set(key, computedValue, options);
    return computedValue;
  }

  /**
   * 按标签清除缓存
   */
  async clearByTag(tag: string): Promise<void> {
    const tagKey = `${TAG_KEY_PREFIX}:${tag}`;
    const keys = await this.redis.smembers(tagKey);

    if (keys.length > 0) {
      await this.redis.del(...keys);
      await this.redis.del(tagKey);
    }
  }

  /**
   * 增加版本号，使所有相关缓存失效
   */
  async incrementVersion(version: string): Promise<void> {
    const versionKey = `${VERSION_KEY_PREFIX}:${version}`;
    const keys = await this.redis.smembers(versionKey);

    if (keys.length > 0) {
      await this.redis.del(...keys);
      await this.redis.del(versionKey);
    }
  }

  /**
   * 获取缓存的 TTL
   */
  async ttl(key: string): Promise<number> {
    const fullKey = this.buildKey(key);
    return await this.redis.ttl(fullKey);
  }

  /**
   * 检查键是否存在
   */
  async exists(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key);
    const result = await this.redis.exists(fullKey);
    return result === 1;
  }
}

/**
 * 创建缓存客户端
 */
export function createCacheClient(config: CacheConfig): CacheClient {
  return new CacheClient(config);
}

export type { CacheClient };
