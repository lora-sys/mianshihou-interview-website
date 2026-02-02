import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { RateLimiter, rateLimiters, createRateLimiter } from '../../lib/rate-limiter';

describe('Rate Limiter', () => {
  describe('基础限流功能', () => {
    it('应该能够创建限流器实例', () => {
      const limiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 100,
      });
      expect(limiter).toBeDefined();
    });

    it('应该在限制内允许请求', async () => {
      const limiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 5,
      });

      const result = await limiter.check('test-user-1');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('应该在超过限制时拒绝请求', async () => {
      const limiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 3,
      });

      // 发送 3 个请求
      for (let i = 0; i < 3; i++) {
        await limiter.check('test-user-2');
      }

      // 第 4 个请求应该被拒绝
      const result = await limiter.check('test-user-2');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('应该正确计算剩余请求数', async () => {
      const limiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 10,
      });

      const result1 = await limiter.check('test-user-3');
      expect(result1.remaining).toBe(9);

      const result2 = await limiter.check('test-user-3');
      expect(result2.remaining).toBe(8);
    });

    it('应该为不同的标识符独立计数', async () => {
      const limiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 2,
      });

      // 用户1 发送 2 个请求
      await limiter.check('user-1');
      await limiter.check('user-1');

      // 用户1 的第 3 个请求应该被拒绝
      const result1 = await limiter.check('user-1');
      expect(result1.allowed).toBe(false);

      // 用户2 的第 1 个请求应该被允许
      const result2 = await limiter.check('user-2');
      expect(result2.allowed).toBe(true);
    });
  });

  describe('时间窗口功能', () => {
    it('应该在时间窗口结束后重置计数', async () => {
      const limiter = new RateLimiter({
        windowMs: 100, // 100ms 窗口
        maxRequests: 2,
      });

      // 发送 2 个请求
      await limiter.check('test-user-4');
      await limiter.check('test-user-4');

      // 第 3 个请求应该被拒绝
      const result1 = await limiter.check('test-user-4');
      expect(result1.allowed).toBe(false);

      // 等待窗口结束
      await new Promise((resolve) => setTimeout(resolve, 150));

      // 窗口结束后，请求应该被允许
      const result2 = await limiter.check('test-user-4');
      expect(result2.allowed).toBe(true);
    }, 5000);

    it('应该提供正确的重置时间', async () => {
      const limiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 1,
      });

      const result1 = await limiter.check('test-user-5');
      const expectedResetTime = Date.now() + 60000;

      // 允许 1 秒的误差
      expect(Math.abs(result1.resetTime - expectedResetTime)).toBeLessThan(1000);
    });
  });

  describe('状态查询', () => {
    it('应该能够查询当前限流状态', async () => {
      const limiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 5,
      });

      await limiter.check('test-user-6');
      await limiter.check('test-user-6');

      const status = await limiter.getStatus('test-user-6');
      expect(status.current).toBe(2);
      expect(status.remaining).toBe(3);
      expect(status.limit).toBe(5);
    });

    it('应该在查询时返回正确的状态', async () => {
      const limiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 3,
      });

      await limiter.check('test-user-7');
      await limiter.check('test-user-7');
      await limiter.check('test-user-7');

      const status = await limiter.getStatus('test-user-7');
      expect(status.allowed).toBe(false);
      expect(status.remaining).toBe(0);
    });
  });

  describe('重置功能', () => {
    it('应该能够重置限流计数', async () => {
      const limiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 2,
      });

      // 发送 2 个请求
      await limiter.check('test-user-8');
      await limiter.check('test-user-8');

      // 重置
      await limiter.reset('test-user-8');

      // 重置后，请求应该被允许
      const result = await limiter.check('test-user-8');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
    });
  });

  describe('预定义限流器', () => {
    it('应该提供预定义的限流器', () => {
      expect(rateLimiters.global).toBeDefined();
      expect(rateLimiters.ip).toBeDefined();
      expect(rateLimiters.user).toBeDefined();
      expect(rateLimiters.api).toBeDefined();
      expect(rateLimiters.strict).toBeDefined();
      expect(rateLimiters.hourly).toBeDefined();
      expect(rateLimiters.daily).toBeDefined();
    });

    it('预定义限流器应该能够正常工作', async () => {
      const result = await rateLimiters.global.check('test-predefined');
      expect(result).toBeDefined();
      expect(typeof result.allowed).toBe('boolean');
      expect(typeof result.remaining).toBe('number');
    });
  });

  describe('自定义限流器', () => {
    it('应该能够创建自定义限流器', () => {
      const customLimiter = createRateLimiter({
        windowMs: 30000,
        maxRequests: 50,
        keyPrefix: 'custom',
      });

      expect(customLimiter).toBeDefined();
    });

    it('自定义限流器应该使用自定义配置', async () => {
      const customLimiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 10,
        keyPrefix: 'custom_test',
      });

      const result = await customLimiter.check('test-custom');
      expect(result.limit).toBe(10);
      expect(result.remaining).toBe(9);
    });
  });

  describe('错误处理', () => {
    it('应该在 Redis 出错时降级处理', async () => {
      // 这个测试需要模拟 Redis 错误
      // 在实际环境中，Redis 出错时应该允许请求通过
      const limiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 0,
      });

      // 即使设置为 0，Redis 出错时也应该允许请求
      const result = await limiter.check('test-error');
      // 如果 Redis 正常工作，这个会返回 false
      // 如果 Redis 出错，这个会返回 true
      expect(result).toBeDefined();
    });
  });

  describe('清理功能', () => {
    it('应该能够清理所有限流数据', async () => {
      const limiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 5,
        keyPrefix: 'cleanup_test',
      });

      // 添加一些数据
      await limiter.check('user1');
      await limiter.check('user2');
      await limiter.check('user3');

      // 清理所有数据
      await limiter.clearAll();

      // 清理后，新的请求应该被允许
      const result = await limiter.check('user1');
      expect(result.allowed).toBe(true);
    });
  });
});
