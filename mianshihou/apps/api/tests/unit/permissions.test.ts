import { describe, it, expect } from 'bun:test';
import { isOwner, hasRole, isAdmin } from '../../trpc/middleware/permissions';

describe('Permissions', () => {
  describe('isOwner', () => {
    it('当用户是资源所有者时应该返回 true', () => {
      const user = { id: 'user1', role: 'user' };
      const resource = { userId: 'user1' };

      expect(isOwner(user, resource)).toBe(true);
    });

    it('当用户不是资源所有者时应该返回 false', () => {
      const user = { id: 'user1', role: 'user' };
      const resource = { userId: 'user2' };

      expect(isOwner(user, resource)).toBe(false);
    });

    it('当用户为 null 时应该返回 false', () => {
      const resource = { userId: 'user1' };

      expect(isOwner(null, resource)).toBe(false);
    });

    it('当资源为 null 时应该返回 false', () => {
      const user = { id: 'user1', role: 'user' };

      expect(isOwner(user, null)).toBe(false);
    });

    it('应该支持 id 字段的资源', () => {
      const user = { id: 'user1', role: 'user' };
      const resource = { id: 'user1' };

      expect(isOwner(user, resource)).toBe(true);
    });
  });

  describe('hasRole', () => {
    it('当用户拥有指定角色时应该返回 true', () => {
      const user = { id: 'user1', role: 'admin' };

      expect(hasRole(user, 'admin')).toBe(true);
    });

    it('当用户不拥有指定角色时应该返回 false', () => {
      const user = { id: 'user1', role: 'user' };

      expect(hasRole(user, 'admin')).toBe(false);
    });

    it('当用户为 null 时应该返回 false', () => {
      expect(hasRole(null, 'admin')).toBe(false);
    });

    it('应该支持多个角色', () => {
      const user = { id: 'user1', role: 'admin' };

      expect(hasRole(user, 'admin')).toBe(true);
      expect(hasRole(user, 'user')).toBe(false);
    });
  });

  describe('isAdmin', () => {
    it('当用户是管理员时应该返回 true', () => {
      const user = { id: 'user1', role: 'admin' };

      expect(isAdmin(user)).toBe(true);
    });

    it('当用户不是管理员时应该返回 false', () => {
      const user = { id: 'user1', role: 'user' };

      expect(isAdmin(user)).toBe(false);
    });

    it('当用户为 null 时应该返回 false', () => {
      expect(isAdmin(null)).toBe(false);
    });
  });
});
