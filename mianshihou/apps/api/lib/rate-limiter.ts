import { redis } from './redis';

// 限流配置接口
export interface RateLimitConfig {
  // 时间窗口（毫秒）
  windowMs: number;
  // 最大请求数
  maxRequests: number;
  // 键前缀
  keyPrefix?: string;
  // 跳过限流的函数
  skip?: (request: any) => boolean | Promise<boolean>;
  // 限流时的消息
  message?: string;
  // 自定义键生成函数
  keyGenerator?: (request: any) => string;
}

// 限流结果接口
export interface RateLimitResult {
  // 是否允许请求
  allowed: boolean;
  // 剩余请求数
  remaining: number;
  // 重置时间戳
  resetTime: number;
  // 当前请求数
  current: number;
  // 限制数量
  limit: number;
}

// 默认配置
const DEFAULT_CONFIG: Required<RateLimitConfig> = {
  windowMs: 60000, // 1分钟
  maxRequests: 100,
  keyPrefix: 'rate_limit',
  skip: () => false,
  message: '请求过于频繁，请稍后再试',
  keyGenerator: (request: any) => request.ip || 'unknown',
};

/**
 * 基于 Redis 的滑动窗口限流器
 */
export class RateLimiter {
  private config: Required<RateLimitConfig>;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 生成限流键
   */
  private generateKey(identifier: string): string {
    return `${this.config.keyPrefix}:${identifier}`;
  }

  /**
   * 检查限流
   */
  async check(identifier: string): Promise<RateLimitResult> {
    const key = this.generateKey(identifier);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    try {
      // 获取当前窗口内的所有请求时间戳
      const requests = await redis.zrangebyscore(key, windowStart, now, 'WITHSCORES');
      const currentCount = requests.length / 2; // Redis 返回 [value, score, value, score...]

      // 检查是否超过限制
      if (currentCount >= this.config.maxRequests) {
        // 获取最旧的请求时间
        const oldestRequest = requests[1];
        const resetTime = oldestRequest + this.config.windowMs;

        return {
          allowed: false,
          remaining: 0,
          resetTime,
          current: currentCount,
          limit: this.config.maxRequests,
        };
      }

      // 添加新的请求时间戳
      await redis.zadd(key, now, `${now}:${Math.random()}`);

      // 设置过期时间（窗口时间 + 1秒）
      await redis.expire(key, Math.ceil(this.config.windowMs / 1000) + 1);

      // 清理过期的时间戳
      await redis.zremrangebyscore(key, 0, windowStart);

      return {
        allowed: true,
        remaining: this.config.maxRequests - currentCount - 1,
        resetTime: now + this.config.windowMs,
        current: currentCount + 1,
        limit: this.config.maxRequests,
      };
    } catch (error) {
      // Redis 出错时，允许请求通过（降级处理）
      console.error('Rate limiter error:', error);
      return {
        allowed: true,
        remaining: this.config.maxRequests,
        resetTime: now + this.config.windowMs,
        current: 0,
        limit: this.config.maxRequests,
      };
    }
  }

  /**
   * 重置限流
   */
  async reset(identifier: string): Promise<void> {
    const key = this.generateKey(identifier);
    await redis.del(key);
  }

  /**
   * 获取当前状态
   */
  async getStatus(identifier: string): Promise<RateLimitResult> {
    const key = this.generateKey(identifier);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    try {
      const requests = await redis.zrangebyscore(key, windowStart, now, 'WITHSCORES');
      const currentCount = requests.length / 2;

      return {
        allowed: currentCount < this.config.maxRequests,
        remaining: Math.max(0, this.config.maxRequests - currentCount),
        resetTime: now + this.config.windowMs,
        current: currentCount,
        limit: this.config.maxRequests,
      };
    } catch (error) {
      console.error('Get rate limit status error:', error);
      return {
        allowed: true,
        remaining: this.config.maxRequests,
        resetTime: now + this.config.windowMs,
        current: 0,
        limit: this.config.maxRequests,
      };
    }
  }

  /**
   * 清理所有限流数据
   */
  async clearAll(): Promise<void> {
    const pattern = `${this.config.keyPrefix}:*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

// 预定义的限流器
export const rateLimiters = {
  // 全局限流器 - 每分钟 100 次请求
  global: new RateLimiter({
    windowMs: 60000,
    maxRequests: 100,
    keyPrefix: 'rate_limit:global',
  }),

  // IP 限流器 - 每分钟 60 次请求
  ip: new RateLimiter({
    windowMs: 60000,
    maxRequests: 60,
    keyPrefix: 'rate_limit:ip',
  }),

  // 用户限流器 - 每分钟 30 次请求
  user: new RateLimiter({
    windowMs: 60000,
    maxRequests: 30,
    keyPrefix: 'rate_limit:user',
  }),

  // API 限流器 - 每分钟 120 次请求
  api: new RateLimiter({
    windowMs: 60000,
    maxRequests: 120,
    keyPrefix: 'rate_limit:api',
  }),

  // 严格限流器 - 每分钟 10 次请求（用于敏感操作）
  strict: new RateLimiter({
    windowMs: 60000,
    maxRequests: 10,
    keyPrefix: 'rate_limit:strict',
  }),

  // 每小时限流器 - 每小时 1000 次请求
  hourly: new RateLimiter({
    windowMs: 3600000,
    maxRequests: 1000,
    keyPrefix: 'rate_limit:hourly',
  }),

  // 每天限流器 - 每天 10000 次请求
  daily: new RateLimiter({
    windowMs: 86400000,
    maxRequests: 10000,
    keyPrefix: 'rate_limit:daily',
  }),
};

/**
 * 创建自定义限流器
 */
export function createRateLimiter(config: Partial<RateLimitConfig>): RateLimiter {
  return new RateLimiter(config);
}