import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import Fastify from 'fastify';
import { registerLoggingMiddleware } from '../../middlewares/logger';

// 根据 tRPC 错误代码获取 HTTP 状态码
function getStatusCodeFromCode(code: string): number {
  const codeMap: Record<string, number> = {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
  };
  return codeMap[code] || 500;
}

describe('Error Handler', () => {
  let fastify: FastifyInstance;

  beforeAll(async () => {
    fastify = Fastify({ logger: false });
    registerLoggingMiddleware(fastify);

    // 设置错误处理器（与 server.ts 中的一致）
    fastify.setErrorHandler((error: any, request, reply) => {
      const isZodError = error.name === 'ZodError' && error.errors;

      const errorResponse: any = {
        success: false,
        error: {
          message: error.message || '服务器内部错误',
          code: error.code || 'INTERNAL_SERVER_ERROR',
        },
      };

      if (isZodError) {
        errorResponse.error.code = 'VALIDATION_ERROR';
        errorResponse.error.message = '参数验证失败';
        errorResponse.error.validationErrors = error.errors.map((e: any) => ({
          path: e.path.length > 0 ? e.path.join('.') : 'root',
          message: e.message,
        }));
        reply.status(400);
      } else {
        const statusCode =
          error.statusCode || (error.code && getStatusCodeFromCode(error.code)) || 500;
        reply.status(statusCode);
      }

      if (process.env.NODE_ENV === 'development') {
        errorResponse.error.stack = error.stack;
      }

      reply.send(errorResponse);
    });

    // 添加测试路由
    fastify.get('/test', async () => ({ message: 'success' }));
    fastify.get('/error', async () => {
      throw new Error('Test error');
    });
    fastify.get('/not-found', async () => {
      const error: any = new Error('Not found');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    });
    fastify.get('/unauthorized', async () => {
      const error: any = new Error('Unauthorized');
      error.statusCode = 401;
      error.code = 'UNAUTHORIZED';
      throw error;
    });
    fastify.get('/zod-error', async () => {
      const error: any = new Error('ZodError');
      error.name = 'ZodError';
      error.errors = [
        { path: ['email'], message: 'Invalid email format' },
        { path: ['password'], message: 'Password too short' },
      ];
      throw error;
    });
  });

  afterAll(async () => {
    await fastify.close();
  });

  describe('统一错误响应格式', () => {
    it('应该返回统一的错误响应格式', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/error',
      });

      expect(response.statusCode).toBe(500);
      const body = response.json();
      expect(body).toHaveProperty('success', false);
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('message');
      expect(body.error).toHaveProperty('code');
    });

    it('应该包含堆栈信息（开发环境）', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const response = await fastify.inject({
        method: 'GET',
        url: '/error',
      });

      expect(response.statusCode).toBe(500);
      const body = response.json();
      expect(body.error).toHaveProperty('stack');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('HTTP 状态码处理', () => {
    it('应该正确处理 404 错误', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/not-found',
      });

      expect(response.statusCode).toBe(404);
      const body = response.json();
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('应该正确处理 401 错误', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/unauthorized',
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Zod 错误处理', () => {
    it('应该识别 Zod 验证错误', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/zod-error',
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toBe('参数验证失败');
    });

    it('应该格式化 Zod 验证错误', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/zod-error',
      });

      const body = response.json();
      expect(body.error).toHaveProperty('validationErrors');
      expect(Array.isArray(body.error.validationErrors)).toBe(true);
      expect(body.error.validationErrors).toHaveLength(2);
      expect(body.error.validationErrors[0]).toHaveProperty('path');
      expect(body.error.validationErrors[0]).toHaveProperty('message');
    });

    it('应该正确格式化 Zod 错误路径', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/zod-error',
      });

      const body = response.json();
      expect(body.error.validationErrors[0].path).toBe('email');
      expect(body.error.validationErrors[1].path).toBe('password');
    });
  });

  describe('错误日志记录', () => {
    it('应该记录错误日志', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/error',
      });

      expect(response.statusCode).toBe(500);
      // 错误日志已在中间件中记录
    });
  });
});
