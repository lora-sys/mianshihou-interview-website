import { describe, it, expect } from 'bun:test';
import { success, paginate, createPaginationMeta } from '../../lib/response-wrapper';
import { sanitizeUser, sanitizeUsers } from '../../lib/data-sanitizer';
import { transformUser, transformUsers } from '../../lib/field-transformer';

describe('Unified Response Format Integration', () => {
  describe('完整的用户数据处理流程', () => {
    it('应该完成用户数据的脱敏、转换和包装', () => {
      // 模拟从数据库获取的用户数据（包含敏感字段）
      const rawUser = {
        id: '1',
        userAccount: 'test@example.com',
        userPassword: 'hashed_password_123',
        userName: 'Test User',
        userAvatar: 'avatar.jpg',
        userProfile: 'Test profile',
        userRole: 'user',
        unionId: 'union_123',
        lastLoginIp: '192.168.1.1',
        isDelete: false,
        createTime: '2026-01-30T00:00:00Z',
        updateTime: '2026-01-30T00:00:00Z',
        email: 'test@example.com',
        emailVerified: true,
        status: 'active',
      };

      // 步骤1: 脱敏处理
      const sanitized = sanitizeUser(rawUser);
      expect(sanitized).not.toHaveProperty('userPassword');
      expect(sanitized).not.toHaveProperty('unionId');
      expect(sanitized).not.toHaveProperty('lastLoginIp');
      expect(sanitized).not.toHaveProperty('isDelete');

      // 步骤2: 字段转换
      const transformed = transformUser(sanitized);
      expect(transformed).toHaveProperty('account', 'test@example.com');
      expect(transformed).toHaveProperty('name', 'Test User');
      expect(transformed).toHaveProperty('avatar', 'avatar.jpg');
      expect(transformed).toHaveProperty('profile', 'Test profile');
      expect(transformed).toHaveProperty('role', 'user');
      expect(transformed).toHaveProperty('createdAt', '2026-01-30T00:00:00Z');
      expect(transformed).toHaveProperty('updatedAt', '2026-01-30T00:00:00Z');

      // 步骤3: 响应包装
      const response = success(transformed, '获取用户信息成功');
      expect(response).toEqual({
        success: true,
        data: transformed,
        message: '获取用户信息成功',
      });
    });

    it('应该完成用户列表的脱敏、转换和包装', () => {
      // 模拟从数据库获取的用户列表
      const rawUsers = [
        {
          id: '1',
          userAccount: 'user1@example.com',
          userPassword: 'hash1',
          userName: 'User 1',
          createTime: '2026-01-30T00:00:00Z',
          updateTime: '2026-01-30T00:00:00Z',
        },
        {
          id: '2',
          userAccount: 'user2@example.com',
          userPassword: 'hash2',
          userName: 'User 2',
          createTime: '2026-01-30T00:00:00Z',
          updateTime: '2026-01-30T00:00:00Z',
        },
      ];

      // 步骤1: 批量脱敏
      const sanitized = sanitizeUsers(rawUsers);
      expect(sanitized).toHaveLength(2);
      expect(sanitized[0]).not.toHaveProperty('userPassword');
      expect(sanitized[1]).not.toHaveProperty('userPassword');

      // 步骤2: 批量转换
      const transformed = transformUsers(sanitized);
      expect(transformed[0]).toHaveProperty('name', 'User 1');
      expect(transformed[0]).toHaveProperty('account', 'user1@example.com');
      expect(transformed[1]).toHaveProperty('name', 'User 2');
      expect(transformed[1]).toHaveProperty('account', 'user2@example.com');

      // 步骤3: 创建分页元数据
      const pagination = createPaginationMeta(1, 10, 2);
      expect(pagination).toEqual({
        page: 1,
        pageSize: 10,
        total: 2,
        totalPages: 1,
      });

      // 步骤4: 分页包装
      const response = paginate(transformed, pagination, '获取用户列表成功');
      expect(response).toEqual({
        success: true,
        data: {
          items: transformed,
          pagination,
        },
        message: '获取用户列表成功',
      });
    });
  });

  describe('边界情况处理', () => {
    it('应该处理空的用户列表', () => {
      const rawUsers: any[] = [];
      const sanitized = sanitizeUsers(rawUsers);
      const transformed = transformUsers(sanitized);
      const pagination = createPaginationMeta(1, 10, 0);
      const response = paginate(transformed, pagination);

      expect(response.data.items).toEqual([]);
      expect(response.data.pagination.total).toBe(0);
    });

    it('应该处理用户数据为null的情况', () => {
      const result = success(null);
      expect(result.data).toBeNull();
    });

    it('应该处理不完整的用户数据', () => {
      const incompleteUser = {
        id: '1',
        userName: 'Test User',
      };

      const sanitized = sanitizeUser(incompleteUser);
      const transformed = transformUser(sanitized);
      const response = success(transformed);

      expect(transformed).toHaveProperty('name', 'Test User');
      expect(transformed).not.toHaveProperty('userName');
      expect(response.success).toBe(true);
    });
  });

  describe('数据完整性验证', () => {
    it('应该确保处理流程不会丢失非敏感字段', () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        emailVerified: true,
        userPassword: 'hash',
        userName: 'Test',
        createTime: '2026-01-30T00:00:00Z',
      };

      const sanitized = sanitizeUser(user);
      const transformed = transformUser(sanitized);
      const response = success(transformed);

      // 确保保留所有非敏感字段
      expect(response.data).toHaveProperty('id', '1');
      expect(response.data).toHaveProperty('email', 'test@example.com');
      expect(response.data).toHaveProperty('emailVerified', true);
      expect(response.data).toHaveProperty('name', 'Test');
      expect(response.data).toHaveProperty('createdAt', '2026-01-30T00:00:00Z');

      // 确保移除敏感字段
      expect(response.data).not.toHaveProperty('userPassword');
    });
  });
});
