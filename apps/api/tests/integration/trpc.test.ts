import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import Fastify from 'fastify';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import { appRouter } from '../../trpc/router';
import { createContextAsync } from '../../trpc/index';
import { db } from '../../index';
import { users, sessions } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '../../lib/auth';

describe('tRPC Integration Tests', () => {
  let server: Fastify.FastifyInstance;
  let port = 3003;
  let testUserId: string;
  let authCookies: string[];

  beforeAll(async () => {
    // 创建测试服务器
    server = Fastify({
      logger: false,
    });

    // 注册 tRPC 插件
    await server.register(fastifyTRPCPlugin, {
      prefix: '/trpc',
      trpcOptions: {
        router: appRouter,
        createContext: createContextAsync,
      },
    });

    // 注册认证路由（用于创建测试用户）
    server.all('/api/auth/*', async (request, reply) => {
      try {
        const url = new URL(request.url, `http://${request.headers.host}`);
        const headers = new Headers();
        Object.entries(request.headers).forEach(([key, value]) => {
          if (value) headers.append(key, value.toString());
        });

        const req = new Request(url.toString(), {
          method: request.method,
          headers,
          ...(request.body ? { body: JSON.stringify(request.body) } : {}),
        });

        const response = await auth.handler(req);

        reply.status(response.status);
        response.headers.forEach((value, key) => reply.header(key, value));
        reply.send(response.body ? await response.text() : null);
      } catch (error) {
        reply.status(500).send({
          error: 'Internal authentication error',
          code: 'AUTH_FAILURE',
        });
      }
    });

    // 启动测试服务器
    await server.listen({ port });
    console.log(`tRPC test server listening on port ${port}`);

    // 创建测试用户
    const testEmail = `trpc-test-${Date.now()}@example.com`;
    const registerResponse = await fetch(`http://localhost:${port}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testEmail,
        password: 'test123456',
        name: 'tRPC Test User',
      }),
    });

    const registerData = await registerResponse.json();
    testUserId = registerData.user.id;
    authCookies = registerResponse.headers.getSetCookie();
  });

  afterAll(async () => {
    // 清理测试数据
    await db.delete(sessions).where(eq(sessions.id, ''));
    await db.delete(users).where(eq(users.id, ''));

    // 关闭测试服务器
    await server.close();
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await fetch(`http://localhost:${port}/trpc/health`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.result.data.status).toBe('ok');
      expect(data.result.data.timestamp).toBeDefined();
    });
  });

  describe('Hello Endpoint', () => {
    it('should return greeting message', async () => {
      const response = await fetch(
        `http://localhost:${port}/trpc/hello?input=${encodeURIComponent(JSON.stringify({ name: 'World' }))}`
      );
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.result.data.message).toBe('Hello World!');
    });
  });

  describe('Auth Endpoints', () => {
    it('should get current user session', async () => {
      const cookieHeader = authCookies.join('; ');

      const response = await fetch(`http://localhost:${port}/trpc/auth.getSession`, {
        headers: {
          Cookie: cookieHeader,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.result.data.user).toBeDefined();
      expect(data.result.data.user.id).toBe(testUserId);
    });

    it('should get user profile', async () => {
      const cookieHeader = authCookies.join('; ');

      const response = await fetch(`http://localhost:${port}/trpc/auth.me`, {
        headers: {
          Cookie: cookieHeader,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.result.data.id).toBe(testUserId);
      expect(data.result.data.email).toBeDefined();
      expect(data.result.data.userName).toBeDefined();
    });

    it('should sign out successfully', async () => {
      const cookieHeader = authCookies.join('; ');

      const response = await fetch(`http://localhost:${port}/trpc/auth.signOut`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.result.data.success).toBe(true);
      expect(data.result.data.message).toBe('登出成功');
    });
  });

  describe('Protected Endpoints', () => {
    it('should return 401 for unauthenticated requests to protected endpoints', async () => {
      const response = await fetch(`http://localhost:${port}/trpc/users.list`);

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.message).toContain('未授权');
    });
  });
});
