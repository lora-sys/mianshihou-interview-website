import { withRetry, CircuitBreaker, CircuitBreakerOptions, RetryOptions } from '../../lib/retry';
import { logger } from '../../lib/logger';
import { middleware } from '../trpc';

/**
 * 为特定的 tRPC procedure 创建重试中间件
 */
export function createRetryMiddleware(options: RetryOptions = {}) {
  return middleware(async ({ next, path }) => {
    logger.info(`执行 procedure: ${path}`);

    try {
      return await withRetry(
        async () => {
          return await next();
        },
        {
          onRetry: (error, attempt) => {
            logger.warn(`Procedure ${path} 重试第 ${attempt} 次`, {
              error: error.message,
              path,
            });
          },
          ...options,
        }
      );
    } catch (error) {
      logger.error(`Procedure ${path} 执行失败`, {
        error: error instanceof Error ? error.message : error,
        path,
      });
      throw error;
    }
  });
}

/**
 * tRPC 重试中间件（默认配置）
 */
export const retryMiddleware = createRetryMiddleware({
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  factor: 2,
  jitter: true,
});

/**
 * 创建带断路器保护的中间件
 */
export function createCircuitBreakerMiddleware(
  options?: CircuitBreakerOptions,
  retryOptions?: RetryOptions
) {
  const circuitBreakers = new Map<string, CircuitBreaker>();

  return middleware(async ({ next, path }) => {
    // 为每个 path 创建独立的断路器
    let circuitBreaker = circuitBreakers.get(path);
    if (!circuitBreaker) {
      circuitBreaker = new CircuitBreaker(options);
      circuitBreakers.set(path, circuitBreaker);
    }

    try {
      return await circuitBreaker.execute(async () => {
        // 在断路器保护下，仍然可以重试
        return await withRetry(
          async () => {
            return await next();
          },
          retryOptions
        );
      });
    } catch (error) {
      if ((error as Error).message === 'Circuit breaker is OPEN') {
        logger.warn(`Procedure ${path} 断路器熔断，拒绝请求`, { path });
        throw new Error(`Service unavailable: ${path} is temporarily unavailable`);
      }
      throw error;
    }
  });
}

/**
 * tRPC 断路器中间件（默认配置）
 */
export const circuitBreakerMiddleware = createCircuitBreakerMiddleware(
  {
    failureThreshold: 5,
    successThreshold: 2,
    recoveryTimeout: 60000, // 1分钟
    halfOpenTimeout: 10000, // 10秒
  },
  {
    maxAttempts: 2,
    initialDelay: 500,
    maxDelay: 5000,
  }
);

/**
 * 针对数据库操作的重试中间件
 */
export const dbRetryMiddleware = createRetryMiddleware({
  maxAttempts: 3,
  initialDelay: 500,
  maxDelay: 5000,
  factor: 2,
  jitter: true,
  shouldRetry: (error: any) => {
    // 数据库连接错误、死锁、超时等可以重试
    const isConnectionError = error?.code === 'ECONNREFUSED' ||
                              error?.code === 'ETIMEDOUT' ||
                              error?.code === 'ENOTFOUND';
    const isDeadlock = error?.code === '40P01'; // PostgreSQL deadlock
    const isTimeout = error?.code === '57014'; // query_canceled

    return isConnectionError || isDeadlock || isTimeout;
  },
});

/**
 * 针对外部 API 调用的重试中间件
 */
export const apiRetryMiddleware = createRetryMiddleware({
  maxAttempts: 5,
  initialDelay: 1000,
  maxDelay: 30000,
  factor: 2,
  jitter: true,
  shouldRetry: (error: any) => {
    // 5xx 错误、网络错误、超时可以重试
    const isServerError = error?.statusCode >= 500 || error?.status >= 500;
    const isNetworkError = error?.code === 'ECONNREFUSED' ||
                          error?.code === 'ETIMEDOUT' ||
                          error?.code === 'ENOTFOUND' ||
                          error?.code === 'ECONNRESET';
    const isTimeout = error?.code === 'TIMEOUT' || error?.message?.includes('timeout');

    return isServerError || isNetworkError || isTimeout;
  },
});