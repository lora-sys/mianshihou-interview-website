import { FastifyRequest, FastifyReply } from 'fastify';
import { RateLimiter, RateLimitConfig, RateLimitResult } from '../lib/rate-limiter';
import { createLogger } from '../lib/logger';

const logger = createLogger('RateLimitMiddleware');

/**
 * 创建限流中间件
 */
export function createRateLimitMiddleware(config: Partial<RateLimitConfig> = {}) {
  const rateLimiter = new RateLimiter(config);

  return async function (request: FastifyRequest, reply: FastifyReply) {
    // 获取标识符（IP 或用户ID）
    const identifier = getIdentifier(request);

    // 检查限流
    const result = await rateLimiter.check(identifier);

    // 添加响应头
    reply.header('X-RateLimit-Limit', result.limit);
    reply.header('X-RateLimit-Remaining', result.remaining);
    reply.header('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

    // 如果超过限制，返回 429 错误
    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);

      logger.warn('Rate limit exceeded', {
        identifier,
        current: result.current,
        limit: result.limit,
        resetTime: new Date(result.resetTime).toISOString(),
        path: request.url,
        method: request.method,
      });

      reply.status(429).header('Retry-After', retryAfter).send({
        success: false,
        message: config.message || '请求过于频繁，请稍后再试',
        retryAfter,
      });

      return reply;
    }

    // 记录请求
    logger.debug('Request allowed', {
      identifier,
      remaining: result.remaining,
      path: request.url,
      method: request.method,
    });
  };
}

/**
 * 基于 IP 的限流中间件
 */
export function ipRateLimitMiddleware(
  windowMs: number = 60000,
  maxRequests: number = 60
) {
  return createRateLimitMiddleware({
    windowMs,
    maxRequests,
    keyPrefix: 'rate_limit:ip',
    keyGenerator: (request: FastifyRequest) => request.ip || 'unknown',
  });
}

/**
 * 基于用户的限流中间件
 */
export function userRateLimitMiddleware(
  windowMs: number = 60000,
  maxRequests: number = 30
) {
  return createRateLimitMiddleware({
    windowMs,
    maxRequests,
    keyPrefix: 'rate_limit:user',
    keyGenerator: (request: FastifyRequest) => {
      const userId = (request as any).user?.id;
      return userId || request.ip || 'unknown';
    },
  });
}

/**
 * 基于 API 路径的限流中间件
 */
export function apiRateLimitMiddleware(
  windowMs: number = 60000,
  maxRequests: number = 120
) {
  return createRateLimitMiddleware({
    windowMs,
    maxRequests,
    keyPrefix: 'rate_limit:api',
    keyGenerator: (request: FastifyRequest) => {
      return `${request.ip}:${request.method}:${request.url}`;
    },
  });
}

/**
 * 获取请求标识符
 */
function getIdentifier(request: FastifyRequest): string {
  // 优先使用用户ID
  const userId = (request as any).user?.id;
  if (userId) {
    return `user:${userId}`;
  }

  // 其次使用 IP
  const ip = request.ip;
  if (ip) {
    return `ip:${ip}`;
  }

  // 最后使用会话ID
  const sessionId = request.session?.id;
  if (sessionId) {
    return `session:${sessionId}`;
  }

  return 'unknown';
}

/**
 * 预定义的限流中间件
 */
export const rateLimitMiddlewares = {
  // 全局限流 - 每分钟 100 次
  global: createRateLimitMiddleware({
    windowMs: 60000,
    maxRequests: 100,
    keyPrefix: 'rate_limit:global',
  }),

  // 严格限流 - 每分钟 10 次（用于敏感操作）
  strict: createRateLimitMiddleware({
    windowMs: 60000,
    maxRequests: 10,
    message: '敏感操作过于频繁，请稍后再试',
    keyPrefix: 'rate_limit:strict',
  }),

  // 每小时限流 - 每小时 1000 次
  hourly: createRateLimitMiddleware({
    windowMs: 3600000,
    maxRequests: 1000,
    keyPrefix: 'rate_limit:hourly',
  }),

  // 每天限流 - 每天 10000 次
  daily: createRateLimitMiddleware({
    windowMs: 86400000,
    maxRequests: 10000,
    keyPrefix: 'rate_limit:daily',
  }),
};