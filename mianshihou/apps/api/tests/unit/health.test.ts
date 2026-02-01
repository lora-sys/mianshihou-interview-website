import { describe, it, expect } from 'bun:test';
import {
  performHealthCheck,
  performLivenessCheck,
  type HealthCheckResult,
  type ComponentHealth,
} from '../../lib/health';

describe('Health Check', () => {
  describe('performHealthCheck', () => {
    it('should return health check result with all components', async () => {
      const result = await performHealthCheck();

      // 验证基本结构
      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThan(0);
      expect(result.components).toBeDefined();
      expect(result.system).toBeDefined();

      // 验证组件检查
      expect(result.components.database).toBeDefined();
      expect(result.components.redis).toBeDefined();
      expect(result.components.scheduler).toBeDefined();

      // 验证系统信息
      expect(result.system.nodeVersion).toBeDefined();
      expect(result.system.platform).toBeDefined();
      expect(result.system.arch).toBeDefined();
      expect(result.system.memory).toBeDefined();
    });

    it('should return valid component health structure', async () => {
      const result = await performHealthCheck();

      // 检查数据库组件
      const db = result.components.database as ComponentHealth;
      expect(db.name).toBe('database');
      expect(typeof db.healthy).toBe('boolean');
      expect(typeof db.responseTime).toBe('number');
      expect(db.responseTime).toBeGreaterThanOrEqual(0);

      // 检查Redis组件
      const redis = result.components.redis as ComponentHealth;
      expect(redis.name).toBe('redis');
      expect(typeof redis.healthy).toBe('boolean');
      expect(typeof redis.responseTime).toBe('number');
      expect(redis.responseTime).toBeGreaterThanOrEqual(0);

      // 检查定时任务组件
      const scheduler = result.components.scheduler as ComponentHealth;
      expect(scheduler.name).toBe('scheduler');
      expect(typeof scheduler.healthy).toBe('boolean');
      expect(typeof scheduler.responseTime).toBe('number');
      expect(scheduler.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should determine correct overall status', async () => {
      const result = await performHealthCheck();

      // 状态应该是 healthy, degraded, 或 unhealthy 之一
      expect(['healthy', 'degraded', 'unhealthy']).toContain(result.status);

      // 如果所有组件都健康，整体状态应该是healthy
      const allHealthy =
        result.components.database.healthy &&
        result.components.redis.healthy &&
        result.components.scheduler.healthy;

      if (allHealthy) {
        expect(result.status).toBe('healthy');
      }
    });

    it('should include memory usage information', async () => {
      const result = await performHealthCheck();

      expect(result.system.memory).toBeDefined();
      expect(typeof result.system.memory.rss).toBe('number');
      expect(typeof result.system.memory.heapTotal).toBe('number');
      expect(typeof result.system.memory.heapUsed).toBe('number');
      expect(typeof result.system.memory.external).toBe('number');

      // 内存值应该大于0
      expect(result.system.memory.rss).toBeGreaterThan(0);
      expect(result.system.memory.heapTotal).toBeGreaterThan(0);
      expect(result.system.memory.heapUsed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('performLivenessCheck', () => {
    it('should return simple status', async () => {
      const result = await performLivenessCheck();

      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
      expect(['ok', 'error']).toContain(result.status);
    });

    it('should return ok when Redis is healthy', async () => {
      const result = await performLivenessCheck();

      // 如果Redis正常，应该返回ok
      expect(result.status).toBe('ok');
    });
  });

  describe('Health Check Performance', () => {
    it('should complete health check within reasonable time', async () => {
      const startTime = Date.now();
      await performHealthCheck();
      const duration = Date.now() - startTime;

      // 健康检查应该在5秒内完成
      expect(duration).toBeLessThan(5000);
    });

    it('should complete liveness check within reasonable time', async () => {
      const startTime = Date.now();
      await performLivenessCheck();
      const duration = Date.now() - startTime;

      // 存活检查应该在1秒内完成
      expect(duration).toBeLessThan(1000);
    });
  });
});
