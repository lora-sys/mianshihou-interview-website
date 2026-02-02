import 'dotenv/config';
import { db } from '../index';
import { users, sessions, accounts, verifications } from '../db/schema';
import { eq } from 'drizzle-orm';

// 测试数据库配置
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

// 清理测试数据
export async function cleanupTestData() {
  try {
    // 按照外键依赖顺序删除数据
    await db.delete(verifications).where(eq(verifications.id, ''));
    await db.delete(sessions).where(eq(sessions.id, ''));
    await db.delete(accounts).where(eq(accounts.id, ''));
    await db.delete(users).where(eq(users.id, ''));
  } catch (error) {
    console.error('Error cleaning up test data:', error);
  }
}

// 创建测试用户
export async function createTestUser(overrides: Partial<typeof users.$inferInsert> = {}) {
  const testUser = {
    id: `test-user-${Date.now()}`,
    email: `test-${Date.now()}@example.com`,
    userName: `Test User ${Date.now()}`,
    userRole: 'user',
    status: 'active',
    ...overrides,
  };

  const [user] = await db.insert(users).values(testUser).returning();
  return user;
}

// 创建测试会话
export async function createTestSession(userId: string) {
  const testSession = {
    id: `test-session-${Date.now()}`,
    userId,
    token: `test-token-${Date.now()}`,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天后过期
  };

  const [session] = await db.insert(sessions).values(testSession).returning();
  return session;
}

// 模拟 Fastify 请求和响应对象
export function createMockRequest() {
  return {
    headers: {
      get: (name: string) => {
        const headers: Record<string, string> = {
          'content-type': 'application/json',
          cookie: '',
        };
        return headers[name.toLowerCase()] || null;
      },
    },
    method: 'GET',
    url: '/test',
  };
}

export function createMockResponse() {
  const cookies: Record<string, string> = {};
  const headers: Record<string, string> = {};

  return {
    status: 200,
    statusCode: 200,
    setCookie(name: string, value: string, options?: any) {
      cookies[name] = value;
    },
    getCookie(name: string) {
      return cookies[name];
    },
    header(name: string, value: string) {
      headers[name] = value;
    },
    send(data: any) {
      return data;
    },
    cookies,
    headers,
  };
}

// 测试工具类
export class TestUtils {
  static async setupTestDatabase() {
    console.log('Setting up test database...');
    // 可以在这里添加数据库初始化逻辑
  }

  static async teardownTestDatabase() {
    console.log('Tearing down test database...');
    await cleanupTestData();
  }

  static generateTestEmail() {
    return `test-${Date.now()}@example.com`;
  }

  static generateTestUserId() {
    return `test-user-${Date.now()}`;
  }
}
