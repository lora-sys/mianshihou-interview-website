import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import Fastify from 'fastify';
import { auth } from '../../lib/auth';
import { db } from '../../index';
import { users, sessions } from '../../db/schema';
import { eq } from 'drizzle-orm';

describe('Authentication Integration Tests', () => {
  let server: Fastify.FastifyInstance;
  let port = 3002;

  beforeAll(async () => {
    // 创建测试服务器
    server = Fastify({
      logger: false,
    });

    // 注册认证路由
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
    console.log(`Test server listening on port ${port}`);
  });

  afterAll(async () => {
    // 清理测试数据
    await db.delete(sessions).where(eq(sessions.id, ''));
    await db.delete(users).where(eq(users.id, ''));

    // 关闭测试服务器
    await server.close();
  });

  describe('User Registration', () => {
    it('should register a new user successfully', async () => {
      const testEmail = `test-${Date.now()}@example.com`;
      const testPassword = 'test123456';

      const response = await fetch(`http://localhost:${port}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          name: 'Test User',
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(testEmail);
      expect(data.user.name).toBe('Test User');
      expect(data.token).toBeDefined();

      // 检查 cookies 是否设置
      const setCookieHeaders = response.headers.getSetCookie();
      expect(setCookieHeaders.length).toBeGreaterThan(0);
      expect(setCookieHeaders.some((cookie) => cookie.includes('session_token'))).toBe(true);
    });

    it('should fail to register with duplicate email', async () => {
      const testEmail = `duplicate-${Date.now()}@example.com`;
      const testPassword = 'test123456';

      // 第一次注册
      await fetch(`http://localhost:${port}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          name: 'Test User',
        }),
      });

      // 第二次注册（应该失败）
      const response = await fetch(`http://localhost:${port}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          name: 'Test User',
        }),
      });

      expect(response.status).toBeGreaterThanOrEqual(400);

      const data = await response.json();
      expect(data.code).toBeDefined();
    });
  });

  describe('User Login', () => {
    let testEmail: string;
    let testPassword: string;

    beforeAll(async () => {
      // 先注册一个用户
      testEmail = `login-test-${Date.now()}@example.com`;
      testPassword = 'test123456';

      await fetch(`http://localhost:${port}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          name: 'Login Test User',
        }),
      });
    });

    it('should login with valid credentials', async () => {
      const response = await fetch(`http://localhost:${port}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(testEmail);
      expect(data.token).toBeDefined();

      // 检查 cookies 是否设置
      const setCookieHeaders = response.headers.getSetCookie();
      expect(setCookieHeaders.length).toBeGreaterThan(0);
    });

    it('should fail to login with invalid credentials', async () => {
      const response = await fetch(`http://localhost:${port}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testEmail,
          password: 'wrongpassword',
        }),
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should fail to login with non-existent email', async () => {
      const response = await fetch(`http://localhost:${port}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: testPassword,
        }),
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Session Management', () => {
    let cookies: string[];
    let testEmail: string;

    beforeAll(async () => {
      // 注册并登录
      testEmail = `session-test-${Date.now()}@example.com`;

      const registerResponse = await fetch(`http://localhost:${port}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testEmail,
          password: 'test123456',
          name: 'Session Test User',
        }),
      });

      cookies = registerResponse.headers.getSetCookie();
    });

    it('should get current session with valid cookies', async () => {
      const cookieHeader = cookies.join('; ');

      const response = await fetch(`http://localhost:${port}/api/auth/get-session`, {
        headers: {
          Cookie: cookieHeader,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.session).toBeDefined();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(testEmail);
    });

    it('should not get session without cookies', async () => {
      const response = await fetch(`http://localhost:${port}/api/auth/get-session`);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toBeNull();
    });

    it('should logout successfully', async () => {
      const cookieHeader = cookies.join('; ');

      const response = await fetch(`http://localhost:${port}/api/auth/sign-out`, {
        method: 'POST',
        headers: {
          Cookie: cookieHeader,
          Origin: `http://localhost:${port}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);

      // 检查 cookies 是否被清除
      const setCookieHeaders = response.headers.getSetCookie();
      expect(setCookieHeaders.some((cookie) => cookie.includes('Max-Age=0'))).toBe(true);
    });
  });
});
