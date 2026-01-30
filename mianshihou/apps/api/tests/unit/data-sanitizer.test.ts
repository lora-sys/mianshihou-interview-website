import { describe, it, expect } from 'bun:test';
import { sanitizeUser, sanitizeSession, sanitizeAccount } from '../../lib/data-sanitizer';

describe('Data Sanitizer', () => {
  describe('sanitizeUser', () => {
    it('应该过滤用户密码字段', () => {
      const user = {
        id: '1',
        userAccount: 'test@example.com',
        userPassword: 'hashed_password_123',
        userName: 'Test User',
      };
      const result = sanitizeUser(user);

      expect(result).not.toHaveProperty('userPassword');
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('userAccount');
      expect(result).toHaveProperty('userName');
    });

    it('应该过滤第三方登录敏感字段', () => {
      const user = {
        id: '1',
        userAccount: 'test@example.com',
        unionId: 'union_123',
        mpOpenId: 'mp_open_123',
        userName: 'Test User',
      };
      const result = sanitizeUser(user);

      expect(result).not.toHaveProperty('unionId');
      expect(result).not.toHaveProperty('mpOpenId');
    });

    it('应该过滤IP和系统字段', () => {
      const user = {
        id: '1',
        userAccount: 'test@example.com',
        lastLoginIp: '192.168.1.1',
        isDelete: false,
        userName: 'Test User',
      };
      const result = sanitizeUser(user);

      expect(result).not.toHaveProperty('lastLoginIp');
      expect(result).not.toHaveProperty('isDelete');
    });

    it('应该保留公开字段', () => {
      const user = {
        id: '1',
        userAccount: 'test@example.com',
        email: 'test@example.com',
        emailVerified: true,
        userName: 'Test User',
        userAvatar: 'avatar.jpg',
        userProfile: 'Test profile',
        userRole: 'user',
        status: 'active',
      };
      const result = sanitizeUser(user);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('emailVerified');
      expect(result).toHaveProperty('userName');
      expect(result).toHaveProperty('userAvatar');
      expect(result).toHaveProperty('userProfile');
      expect(result).toHaveProperty('userRole');
      expect(result).toHaveProperty('status');
    });

    it('应该处理空对象', () => {
      const result = sanitizeUser({});
      expect(typeof result).toBe('object');
    });

    it('应该处理null值', () => {
      const result = sanitizeUser(null);
      expect(result).toBeNull();
    });
  });

  describe('sanitizeSession', () => {
    it('应该过滤会话令牌', () => {
      const session = {
        id: 'session_1',
        userId: 'user_1',
        token: 'secret_token_123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };
      const result = sanitizeSession(session);

      expect(result).not.toHaveProperty('token');
    });

    it('应该过滤IP地址和用户代理', () => {
      const session = {
        id: 'session_1',
        userId: 'user_1',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        expiresAt: '2026-12-31T00:00:00Z',
      };
      const result = sanitizeSession(session);

      expect(result).not.toHaveProperty('ipAddress');
      expect(result).not.toHaveProperty('userAgent');
    });

    it('应该保留基本信息', () => {
      const session = {
        id: 'session_1',
        userId: 'user_1',
        expiresAt: '2026-12-31T00:00:00Z',
        createdAt: '2026-01-30T00:00:00Z',
      };
      const result = sanitizeSession(session);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('expiresAt');
      expect(result).toHaveProperty('createdAt');
    });
  });

  describe('sanitizeAccount', () => {
    it('应该过滤OAuth令牌', () => {
      const account = {
        id: 'account_1',
        userId: 'user_1',
        accessToken: 'access_token_123',
        refreshToken: 'refresh_token_123',
        idToken: 'id_token_123',
        password: 'password_123',
      };
      const result = sanitizeAccount(account);

      expect(result).not.toHaveProperty('accessToken');
      expect(result).not.toHaveProperty('refreshToken');
      expect(result).not.toHaveProperty('idToken');
      expect(result).not.toHaveProperty('password');
    });

    it('应该过滤第三方账户信息', () => {
      const account = {
        id: 'account_1',
        userId: 'user_1',
        accountId: 'google_account_123',
        providerId: 'google',
      };
      const result = sanitizeAccount(account);

      expect(result).not.toHaveProperty('accountId');
      expect(result).not.toHaveProperty('providerId');
    });

    it('应该保留基本信息', () => {
      const account = {
        id: 'account_1',
        userId: 'user_1',
        createdAt: '2026-01-30T00:00:00Z',
        updatedAt: '2026-01-30T00:00:00Z',
      };
      const result = sanitizeAccount(account);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
    });
  });
});
