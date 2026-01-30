/**
 * 认证接口集成测试 - 测试统一响应格式
 * 直接测试 tRPC router 的 procedure
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { authRouter } from '../../trpc/router/auth';
import { success } from '../../lib/response-wrapper';
import { sanitizeUser, transformUser } from '../../lib/data-sanitizer';
import { transformUser as transformUserField } from '../../lib/field-transformer';
import { db } from '../../index';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';

describe('Auth Formatted Responses', () => {
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'password123',
    name: 'Test User',
  };

  let createdUserId: string | null = null;

  // 清理测试数据
  afterAll(async () => {
    if (createdUserId) {
      try {
        await db.delete(users).where(eq(users.id, createdUserId));
      } catch (error) {
        console.error('清理测试数据失败:', error);
      }
    }
  });

  describe('signUp - 用户注册', () => {
    it('应该返回统一响应格式的注册成功响应', async () => {
      // 模拟上下文
      const ctx = {
        req: {} as any,
        res: {} as any,
        user: null,
        session: null,
        logger: { info: () => {}, error: () => {}, warn: () => {} },
        requestId: 'test-request-id',
        opts: {} as any,
      };

      const result = await authRouter.signUp({
        input: testUser,
        ctx,
      });

      // 保存用户ID用于清理
      if (result && typeof result === 'object' && 'id' in result) {
        createdUserId = result.id;
      }

      // 验证统一响应格式
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('message', '注册成功');

      // 验证用户数据结构
      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('account', testUser.email);
      expect(result.data).toHaveProperty('name', testUser.name);

      // 验证敏感字段已过滤
      expect(result.data).not.toHaveProperty('userPassword');
      expect(result.data).not.toHaveProperty('unionId');
      expect(result.data).not.toHaveProperty('mpOpenId');
      expect(result.data).not.toHaveProperty('lastLoginIp');

      // 验证旧字段名已转换
      expect(result.data).not.toHaveProperty('userAccount');
      expect(result.data).not.toHaveProperty('userName');
      expect(result.data).not.toHaveProperty('userAvatar');
      expect(result.data).not.toHaveProperty('userProfile');
      expect(result.data).not.toHaveProperty('userRole');
      expect(result.data).not.toHaveProperty('createTime');
      expect(result.data).not.toHaveProperty('updateTime');
    });

    it('应该拒绝重复注册', async () => {
      const ctx = {
        req: {} as any,
        res: {} as any,
        user: null,
        session: null,
        logger: { info: () => {}, error: () => {}, warn: () => {} },
        requestId: 'test-request-id',
        opts: {} as any,
      };

      try {
        await authRouter.signUp({
          input: testUser,
          ctx,
        });
        expect(true).toBe(false); // 不应该到达这里
      } catch (error: any) {
        expect(error.code).toBe('BAD_REQUEST');
        expect(error.message).toBe('该邮箱已被注册');
      }
    });

    it('应该验证邮箱格式', async () => {
      const ctx = {
        req: {} as any,
        res: {} as any,
        user: null,
        session: null,
        logger: { info: () => {}, error: () => {}, warn: () => {} },
        requestId: 'test-request-id',
        opts: {} as any,
      };

      try {
        await authRouter.signUp({
          input: {
            email: 'invalid-email',
            password: 'password123',
            name: 'Test User',
          },
          ctx,
        });
        expect(true).toBe(false); // 不应该到达这里
      } catch (error: any) {
        expect(error.code).toBe('BAD_REQUEST');
      }
    });

    it('应该验证密码长度', async () => {
      const ctx = {
        req: {} as any,
        res: {} as any,
        user: null,
        session: null,
        logger: { info: () => {}, error: () => {}, warn: () => {} },
        requestId: 'test-request-id',
        opts: {} as any,
      };

      try {
        await authRouter.signUp({
          input: {
            email: 'test@example.com',
            password: '123',
            name: 'Test User',
          },
          ctx,
        });
        expect(true).toBe(false); // 不应该到达这里
      } catch (error: any) {
        expect(error.code).toBe('BAD_REQUEST');
      }
    });
  });

  describe('signIn - 用户登录', () => {
    it('应该返回统一响应格式的登录成功响应', async () => {
      const ctx = {
        req: {} as any,
        res: {} as any,
        user: null,
        session: null,
        logger: { info: () => {}, error: () => {}, warn: () => {} },
        requestId: 'test-request-id',
        opts: {} as any,
      };

      const result = await authRouter.signIn({
        input: {
          email: testUser.email,
          password: testUser.password,
        },
        ctx,
      });

      // 验证统一响应格式
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('message', '登录成功');

      // 验证用户数据结构
      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('account', testUser.email);

      // 验证敏感字段已过滤
      expect(result.data).not.toHaveProperty('userPassword');

      // 验证字段转换
      expect(result.data).toHaveProperty('account');
      expect(result.data).not.toHaveProperty('userAccount');
    });

    it('应该拒绝错误的密码', async () => {
      const ctx = {
        req: {} as any,
        res: {} as any,
        user: null,
        session: null,
        logger: { info: () => {}, error: () => {}, warn: () => {} },
        requestId: 'test-request-id',
        opts: {} as any,
      };

      try {
        await authRouter.signIn({
          input: {
            email: testUser.email,
            password: 'wrong-password',
          },
          ctx,
        });
        expect(true).toBe(false); // 不应该到达这里
      } catch (error: any) {
        expect(error.code).toBe('UNAUTHORIZED');
        expect(error.message).toBe('邮箱或密码错误');
      }
    });
  });

  describe('getSession - 获取会话', () => {
    it('未登录时应该返回空会话', async () => {
      const ctx = {
        req: {} as any,
        res: {} as any,
        user: null,
        session: null,
        logger: { info: () => {}, error: () => {}, warn: () => {} },
        requestId: 'test-request-id',
        opts: {} as any,
      };

      const result = await authRouter.getSession({
        input: undefined,
        ctx,
      });

      // 验证会话数据结构
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('session');

      // 验证空会话
      expect(result.user).toBeNull();
      expect(result.session).toBeNull();
    });
  });

  describe('me - 获取用户资料', () => {
    it('未登录时应该返回空用户', async () => {
      const ctx = {
        req: {} as any,
        res: {} as any,
        user: null,
        session: null,
        logger: { info: () => {}, error: () => {}, warn: () => {} },
        requestId: 'test-request-id',
        opts: {} as any,
      };

      const result = await authRouter.me({
        input: undefined,
        ctx,
      });

      // 验证用户数据结构（未登录时为空）
      expect(result).toHaveProperty('id', null);
      expect(result).toHaveProperty('email', null);
      expect(result).toHaveProperty('userName', null);
    });
  });
});
