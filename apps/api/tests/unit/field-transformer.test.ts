import { describe, it, expect } from 'bun:test';
import { transformUser, transformPost } from '../../lib/field-transformer';

describe('Field Transformer', () => {
  describe('transformUser', () => {
    it('应该转换用户字段命名', () => {
      const user = {
        id: '1',
        userAccount: 'test@example.com',
        userName: 'Test User',
        userAvatar: 'avatar.jpg',
        userProfile: 'Test profile',
        userRole: 'user',
        createTime: '2026-01-30T00:00:00Z',
        updateTime: '2026-01-30T00:00:00Z',
      };
      const result = transformUser(user);

      expect(result).toHaveProperty('account', 'test@example.com');
      expect(result).toHaveProperty('name', 'Test User');
      expect(result).toHaveProperty('avatar', 'avatar.jpg');
      expect(result).toHaveProperty('profile', 'Test profile');
      expect(result).toHaveProperty('role', 'user');
      expect(result).toHaveProperty('createdAt', '2026-01-30T00:00:00Z');
      expect(result).toHaveProperty('updatedAt', '2026-01-30T00:00:00Z');
    });

    it('应该删除旧字段名', () => {
      const user = {
        id: '1',
        userAccount: 'test@example.com',
        userName: 'Test User',
      };
      const result = transformUser(user);

      expect(result).not.toHaveProperty('userAccount');
      expect(result).not.toHaveProperty('userName');
      expect(result).not.toHaveProperty('userAvatar');
      expect(result).not.toHaveProperty('userProfile');
      expect(result).not.toHaveProperty('userRole');
      expect(result).not.toHaveProperty('createTime');
      expect(result).not.toHaveProperty('updateTime');
    });

    it('应该保留其他字段', () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        emailVerified: true,
        status: 'active',
      };
      const result = transformUser(user);

      expect(result).toHaveProperty('id', '1');
      expect(result).toHaveProperty('email', 'test@example.com');
      expect(result).toHaveProperty('emailVerified', true);
      expect(result).toHaveProperty('status', 'active');
    });

    it('应该处理部分字段', () => {
      const user = {
        id: '1',
        userName: 'Test User',
      };
      const result = transformUser(user);

      expect(result).toHaveProperty('name', 'Test User');
      expect(result).not.toHaveProperty('userName');
    });

    it('应该处理空对象', () => {
      const result = transformUser({});
      expect(typeof result).toBe('object');
    });

    it('应该处理null值', () => {
      const result = transformUser(null);
      expect(result).toBeNull();
    });
  });

  describe('transformPost', () => {
    it('应该转换帖子字段命名', () => {
      const post = {
        id: 1,
        title: 'Test Post',
        content: 'Test content',
        thumbNum: 10,
        favourNum: 5,
        createTime: '2026-01-30T00:00:00Z',
        updateTime: '2026-01-30T00:00:00Z',
      };
      const result = transformPost(post);

      expect(result).toHaveProperty('thumbCount', 10);
      expect(result).toHaveProperty('favourCount', 5);
      expect(result).toHaveProperty('createdAt', '2026-01-30T00:00:00Z');
      expect(result).toHaveProperty('updatedAt', '2026-01-30T00:00:00Z');
    });

    it('应该删除旧字段名', () => {
      const post = {
        id: 1,
        thumbNum: 10,
        favourNum: 5,
        createTime: '2026-01-30T00:00:00Z',
        updateTime: '2026-01-30T00:00:00Z',
      };
      const result = transformPost(post);

      expect(result).not.toHaveProperty('thumbNum');
      expect(result).not.toHaveProperty('favourNum');
      expect(result).not.toHaveProperty('createTime');
      expect(result).not.toHaveProperty('updateTime');
    });

    it('应该保留其他字段', () => {
      const post = {
        id: 1,
        title: 'Test Post',
        content: 'Test content',
        userId: 'user_1',
        tags: 'tag1,tag2',
      };
      const result = transformPost(post);

      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('title', 'Test Post');
      expect(result).toHaveProperty('content', 'Test content');
      expect(result).toHaveProperty('userId', 'user_1');
      expect(result).toHaveProperty('tags', 'tag1,tag2');
    });

    it('应该处理部分字段', () => {
      const post = {
        id: 1,
        thumbNum: 10,
      };
      const result = transformPost(post);

      expect(result).toHaveProperty('thumbCount', 10);
      expect(result).not.toHaveProperty('thumbNum');
    });

    it('应该处理空对象', () => {
      const result = transformPost({});
      expect(typeof result).toBe('object');
    });

    it('应该处理null值', () => {
      const result = transformPost(null);
      expect(result).toBeNull();
    });
  });
});
