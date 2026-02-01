import { logger } from './logger';

/**
 * 重试配置选项
 */
export interface RetryOptions {
  /** 最大重试次数 */
  maxAttempts?: number;
  /** 初始延迟（毫秒） */
  initialDelay?: number;
  /** 最大延迟（毫秒） */
  maxDelay?: number;
  /** 延迟倍增因子 */
  factor?: number;
  /** 是否启用随机抖动 */
  jitter?: boolean;
  /** 可重试的错误判断函数 */
  shouldRetry?: (error: any, attempt: number) => boolean;
  /** 重试前的回调 */
  onRetry?: (error: any, attempt: number) => void;
}

/**
 * 默认重试配置
 */
const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  factor: 2,
  jitter: true,
  shouldRetry: (error: any, attempt: number) => {
    // 默认只重试网络错误、超时和 5xx 错误
    const isNetworkError = error?.code === 'ECONNREFUSED' ||
                         error?.code === 'ETIMEDOUT' ||
                         error?.code === 'ENOTFOUND' ||
                         error?.code === 'ECONNRESET';
    const isTimeout = error?.code === 'TIMEOUT' || error?.message?.includes('timeout');
    const isServerError = error?.statusCode >= 500 || error?.status >= 500;
    const isRedisError = error?.message?.includes('READONLY') ||
                        error?.message?.includes('NOREPLICAS') ||
                        error?.message?.includes('LOADING');

    return isNetworkError || isTimeout || isServerError || isRedisError;
  },
  onRetry: (error: any, attempt: number) => {
    logger.warn(`重试第 ${attempt} 次`, { error: error.message });
  },
};

/**
 * 计算延迟时间（指数退避 + 随机抖动）
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  let delay = options.initialDelay * Math.pow(options.factor, attempt - 1);
  delay = Math.min(delay, options.maxDelay);

  if (options.jitter) {
    // 添加 ±25% 的随机抖动
    delay = delay * (0.75 + Math.random() * 0.5);
  }

  return Math.floor(delay);
}

/**
 * 异步函数重试装饰器
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };

  let lastError: any;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // 检查是否应该重试
      if (attempt < config.maxAttempts && config.shouldRetry(error, attempt)) {
        const delay = calculateDelay(attempt, config);
        config.onRetry(error, attempt);
        await sleep(delay);
        continue;
      }

      // 不重试或已达到最大重试次数
      throw error;
    }
  }

  // 理论上不会到这里，但为了类型安全
  throw lastError;
}

/**
 * 延迟函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 类方法重试装饰器
 */
export function Retry(options: RetryOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return withRetry(() => originalMethod.apply(this, args), options);
    };

    return descriptor;
  };
}

/**
 * 断路器状态
 */
enum CircuitState {
  CLOSED = 'CLOSED',     // 正常状态
  OPEN = 'OPEN',         // 熔断状态
  HALF_OPEN = 'HALF_OPEN' // 半开状态（尝试恢复）
}

/**
 * 断路器配置
 */
export interface CircuitBreakerOptions {
  /** 熔断阈值（连续失败次数） */
  failureThreshold?: number;
  /** 成功阈值（半开状态下需要连续成功多少次才能恢复） */
  successThreshold?: number;
  /** 熔断后的恢复等待时间（毫秒） */
  recoveryTimeout?: number;
  /** 半开状态的超时时间（毫秒） */
  halfOpenTimeout?: number;
}

/**
 * 断路器类
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private readonly options: Required<CircuitBreakerOptions>;

  constructor(options: CircuitBreakerOptions = {}) {
    this.options = {
      failureThreshold: options.failureThreshold || 5,
      successThreshold: options.successThreshold || 2,
      recoveryTimeout: options.recoveryTimeout || 60000,
      halfOpenTimeout: options.halfOpenTimeout || 10000,
    };
  }

  /**
   * 执行函数，带断路器保护
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      // 检查是否可以进入半开状态
      if (Date.now() - this.lastFailureTime >= this.options.recoveryTimeout) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
        logger.info('断路器进入半开状态');
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * 成功回调
   */
  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.options.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        logger.info('断路器恢复到正常状态');
      }
    } else {
      this.failureCount = 0;
    }
  }

  /**
   * 失败回调
   */
  private onFailure(error: any): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = CircuitState.OPEN;
      logger.error('断路器熔断', {
        failureCount: this.failureCount,
        error: error.message,
      });
    }
  }

  /**
   * 获取当前状态
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * 重置断路器
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    logger.info('断路器已重置');
  }
}

/**
 * 带断路器保护的函数执行
 */
export function withCircuitBreaker<T>(
  circuitBreaker: CircuitBreaker,
  fn: () => Promise<T>
): Promise<T> {
  return circuitBreaker.execute(fn);
}