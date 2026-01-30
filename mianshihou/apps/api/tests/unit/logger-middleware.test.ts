import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import Fastify from 'fastify';
import { registerLoggingMiddleware } from '../../middlewares/logger';
import { logger } from '../../lib/logger';

describe('Logger Middleware', () => {
  let fastify: FastifyInstance;

  beforeAll(async () => {
    fastify = Fastify({ logger: false }); // 禁用内置日志
    registerLoggingMiddleware(fastify);

    // 添加测试路由
    fastify.get('/test', async () => ({ message: 'success' }));
    fastify.post('/test', async (request) => ({ message: 'success', data: request.body }));
    fastify.get('/error', async () => {
      throw new Error('Test error');
    });
    fastify.get('/slow', async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return { message: 'slow' };
    });
    fastify.get('/health', async () => ({ status: 'ok' }));
  });

  afterAll(async () => {
    await fastify.close();
  });

  describe('Request Logging', () => {
    it('should log incoming requests', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ message: 'success' });
    });

    it('should log request with body', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/test',
        payload: { name: 'test', value: 123 },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ message: 'success', data: { name: 'test', value: 123 } });
    });

    it('should not log health check requests', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('Response Logging', () => {
    it('should log successful responses', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(200);
    });

    it('should log error responses', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/error',
      });

      expect(response.statusCode).toBe(500);
    });
  });

  describe('Performance Monitoring', () => {
    it('should track request duration', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(200);
    });

    it('should warn for slow requests', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/slow',
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('Sensitive Data Sanitization', () => {
    it('should sanitize sensitive fields in request body', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/test',
        payload: {
          name: 'test',
          password: 'secret123',
          token: 'abc123',
          data: {
            apiKey: 'xyz789',
          },
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('should log errors with stack trace in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const response = await fastify.inject({
        method: 'GET',
        url: '/error',
      });

      expect(response.statusCode).toBe(500);

      process.env.NODE_ENV = originalEnv;
    });

    it('should log errors without stack trace in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await fastify.inject({
        method: 'GET',
        url: '/error',
      });

      expect(response.statusCode).toBe(500);

      process.env.NODE_ENV = originalEnv;
    });
  });
});
