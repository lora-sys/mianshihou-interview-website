import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { withRetry, Retry, CircuitBreaker, CircuitState } from '../../lib/retry';

describe('Retry Mechanism', () => {
  describe('withRetry', () => {
    it('应该在第一次成功时直接返回结果', async () => {
      let attemptCount = 0;

      const result = await withRetry(async () => {
        attemptCount++;
        return 'success';
      });

      expect(result).toBe('success');
      expect(attemptCount).toBe(1);
    });

    it('应该在重试后成功', async () => {
      let attemptCount = 0;

      const result = await withRetry(
        async () => {
          attemptCount++;
          if (attemptCount < 3) {
            const error = new Error('Temporary error');
            (error as any).code = 'ECONNREFUSED';
            throw error;
          }
          return 'success';
        },
        { maxAttempts: 3, initialDelay: 10 }
      );

      expect(result).toBe('success');
      expect(attemptCount).toBe(3);
    });

    it('应该在达到最大重试次数后抛出错误', async () => {
      let attemptCount = 0;

      try {
        await withRetry(
          async () => {
            attemptCount++;
            const error = new Error('Network error');
            (error as any).code = 'ECONNREFUSED';
            throw error;
          },
          { maxAttempts: 2, initialDelay: 10 }
        );
        expect(true).toBe(false); // 不应该到达这里
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Network error');
        expect(attemptCount).toBe(2);
      }
    });

    it('不应该重试不可重试的错误', async () => {
      let attemptCount = 0;

      try {
        await withRetry(
          async () => {
            attemptCount++;
            throw new Error('Validation error');
          },
          { maxAttempts: 3, initialDelay: 10 }
        );
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Validation error');
        expect(attemptCount).toBe(1); // 只尝试一次
      }
    });

    it('应该支持自定义 shouldRetry 函数', async () => {
      let attemptCount = 0;

      const result = await withRetry(
        async () => {
          attemptCount++;
          if (attemptCount < 2) {
            throw new Error('Custom error');
          }
          return 'success';
        },
        {
          maxAttempts: 3,
          initialDelay: 10,
          shouldRetry: (error) => error.message === 'Custom error',
        }
      );

      expect(result).toBe('success');
      expect(attemptCount).toBe(2);
    });

    it('应该支持自定义 onRetry 回调', async () => {
      let attemptCount = 0;
      const retryAttempts: number[] = [];

      await withRetry(
        async () => {
          attemptCount++;
          if (attemptCount < 2) {
            const error = new Error('Temporary error');
            (error as any).code = 'ECONNREFUSED';
            throw error;
          }
          return 'success';
        },
        {
          maxAttempts: 3,
          initialDelay: 10,
          onRetry: (error, attempt) => {
            retryAttempts.push(attempt);
          },
        }
      );

      expect(retryAttempts).toEqual([1]);
    });

    it('应该使用指数退避计算延迟', async () => {
      const timestamps: number[] = [];

      await withRetry(
        async () => {
          timestamps.push(Date.now());
          if (timestamps.length < 3) {
            const error = new Error('Temporary error');
            (error as any).code = 'ECONNREFUSED';
            throw error;
          }
          return 'success';
        },
        { maxAttempts: 3, initialDelay: 100, jitter: false }
      );

      // 验证延迟大致符合指数退避
      const delay1 = timestamps[1] - timestamps[0];
      const delay2 = timestamps[2] - timestamps[1];

      expect(delay1).toBeGreaterThan(90); // ~100ms
      expect(delay2).toBeGreaterThan(180); // ~200ms
    });

    it('应该重试超时错误', async () => {
      let attemptCount = 0;

      const result = await withRetry(
        async () => {
          attemptCount++;
          if (attemptCount < 2) {
            const error = new Error('Request timeout');
            (error as any).code = 'TIMEOUT';
            throw error;
          }
          return 'success';
        },
        { maxAttempts: 3, initialDelay: 10 }
      );

      expect(result).toBe('success');
      expect(attemptCount).toBe(2);
    });

    it('应该重试 5xx 服务器错误', async () => {
      let attemptCount = 0;

      const result = await withRetry(
        async () => {
          attemptCount++;
          if (attemptCount < 2) {
            const error = new Error('Internal Server Error');
            (error as any).statusCode = 500;
            throw error;
          }
          return 'success';
        },
        { maxAttempts: 3, initialDelay: 10 }
      );

      expect(result).toBe('success');
      expect(attemptCount).toBe(2);
    });

    it('应该重试 Redis 错误', async () => {
      let attemptCount = 0;

      const result = await withRetry(
        async () => {
          attemptCount++;
          if (attemptCount < 2) {
            throw new Error('Redis READONLY error');
          }
          return 'success';
        },
        { maxAttempts: 3, initialDelay: 10 }
      );

      expect(result).toBe('success');
      expect(attemptCount).toBe(2);
    });
  });

  describe('Retry Decorator', () => {
    it('应该装饰类方法并启用重试', async () => {
      class TestService {
        private attemptCount = 0;

        @Retry({ maxAttempts: 3, initialDelay: 10 })
        async fetchData(): Promise<string> {
          this.attemptCount++;
          if (this.attemptCount < 2) {
            const error = new Error('Network error');
            (error as any).code = 'ECONNREFUSED';
            throw error;
          }
          return 'data';
        }

        getAttempts(): number {
          return this.attemptCount;
        }
      }

      const service = new TestService();
      const result = await service.fetchData();

      expect(result).toBe('data');
      expect(service.getAttempts()).toBe(2);
    });
  });

  describe('Circuit Breaker', () => {
    let circuitBreaker: CircuitBreaker;

    beforeEach(() => {
      circuitBreaker = new CircuitBreaker({
        failureThreshold: 3,
        successThreshold: 2,
        recoveryTimeout: 1000,
      });
    });

    afterEach(() => {
      circuitBreaker.reset();
    });

    it('初始状态应该是 CLOSED', () => {
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('应该在连续失败达到阈值后熔断', async () => {
      const errorFn = async () => {
        throw new Error('Service unavailable');
      };

      // 触发3次失败
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(errorFn);
        } catch (error) {
          // 忽略错误
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    });

    it('应该在熔断状态下拒绝请求', async () => {
      const errorFn = async () => {
        throw new Error('Service unavailable');
      };

      // 触发熔断
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(errorFn);
        } catch (error) {
          // 忽略错误
        }
      }

      // 第4次请求应该被拒绝
      try {
        await circuitBreaker.execute(errorFn);
        expect(true).toBe(false);
      } catch (error) {
        expect((error as Error).message).toBe('Circuit breaker is OPEN');
      }
    });

    it('应该在恢复超时后进入半开状态', async () => {
      const errorFn = async () => {
        throw new Error('Service unavailable');
      };

      const successFn = async () => {
        return 'success';
      };

      // 触发熔断
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(errorFn);
        } catch (error) {
          // 忽略错误
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

      // 等待恢复超时
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // 下一次请求应该触发半开状态并成功
      const result = await circuitBreaker.execute(successFn);
      expect(result).toBe('success');
      expect(circuitBreaker.getState()).toBe(CircuitState.HALF_OPEN);
    });

    it('应该在半开状态下连续成功后恢复', async () => {
      const errorFn = async () => {
        throw new Error('Service unavailable');
      };

      const successFn = async () => {
        return 'success';
      };

      // 触发熔断
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(errorFn);
        } catch (error) {
          // 忽略错误
        }
      }

      // 等待恢复超时
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // 在半开状态下连续成功2次（第一次成功会进入HALF_OPEN）
      await circuitBreaker.execute(successFn);
      await circuitBreaker.execute(successFn);

      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('应该允许重置断路器', async () => {
      const errorFn = async () => {
        throw new Error('Service unavailable');
      };

      const successFn = async () => {
        return 'success';
      };

      // 触发熔断
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(errorFn);
        } catch (error) {
          // 忽略错误
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

      // 重置
      circuitBreaker.reset();

      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);

      // 重置后应该能正常执行
      const result = await circuitBreaker.execute(successFn);
      expect(result).toBe('success');
    });

    it('单个成功不应该影响失败计数', async () => {
      const errorFn = async () => {
        throw new Error('Service unavailable');
      };

      const successFn = async () => {
        return 'success';
      };

      // 失败2次
      for (let i = 0; i < 2; i++) {
        try {
          await circuitBreaker.execute(errorFn);
        } catch (error) {
          // 忽略错误
        }
      }

      // 成功1次
      await circuitBreaker.execute(successFn);

      // 状态应该是 CLOSED
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);

      // 再失败1次，不应该熔断
      try {
        await circuitBreaker.execute(errorFn);
      } catch (error) {
        // 忽略错误
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('Integration Tests', () => {
    it('应该结合重试和断路器处理网络故障', async () => {
      let attemptCount = 0;
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 3,
        recoveryTimeout: 500,
      });

      // 使用重试包装断路器执行
      const result = await withRetry(
        async () => {
          return await circuitBreaker.execute(async () => {
            attemptCount++;
            if (attemptCount < 2) {
              const error = new Error('Network error');
              (error as any).code = 'ECONNREFUSED';
              throw error;
            }
            return 'success';
          });
        },
        { maxAttempts: 3, initialDelay: 10 }
      );

      expect(result).toBe('success');
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('应该在断路器熔断时阻止重试', async () => {
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 2,
        recoveryTimeout: 1000,
      });

      const errorFn = async () => {
        const error = new Error('Service unavailable');
        (error as any).code = 'ECONNREFUSED';
        throw error;
      };

      // 触发熔断
      for (let i = 0; i < 2; i++) {
        try {
          await circuitBreaker.execute(errorFn);
        } catch (error) {
          // 忽略错误
        }
      }

      // 尝试使用重试
      try {
        await withRetry(() => circuitBreaker.execute(errorFn), {
          maxAttempts: 5,
          initialDelay: 10,
        });
        expect(true).toBe(false);
      } catch (error) {
        expect((error as Error).message).toBe('Circuit breaker is OPEN');
      }
    });
  });
});
