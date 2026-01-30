import { describe, it, expect } from 'bun:test';
import { success, paginate } from '../../lib/response-wrapper';

describe('Response Wrapper', () => {
  describe('success', () => {
    it('应该包装成功响应', () => {
      const data = { id: 1, name: 'test' };
      const result = success(data);

      expect(result).toEqual({
        success: true,
        data,
        message: '操作成功',
      });
    });

    it('应该支持自定义消息', () => {
      const data = { id: 1, name: 'test' };
      const result = success(data, '创建成功');

      expect(result).toEqual({
        success: true,
        data,
        message: '创建成功',
      });
    });

    it('应该支持空数据', () => {
      const result = success(null);

      expect(result).toEqual({
        success: true,
        data: null,
        message: '操作成功',
      });
    });

    it('应该支持复杂对象', () => {
      const data = {
        user: { id: 1, name: 'test' },
        posts: [{ id: 1, title: 'test' }],
      };
      const result = success(data);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('message');
    });
  });

  describe('paginate', () => {
    it('应该包装分页响应', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const pagination = {
        page: 1,
        pageSize: 10,
        total: 100,
        totalPages: 10,
      };
      const result = paginate(items, pagination);

      expect(result).toEqual({
        success: true,
        data: {
          items,
          pagination,
        },
        message: '查询成功',
      });
    });

    it('应该支持自定义消息', () => {
      const items = [{ id: 1 }];
      const pagination = { page: 1, pageSize: 10, total: 1, totalPages: 1 };
      const result = paginate(items, pagination, '用户列表查询成功');

      expect(result).toEqual({
        success: true,
        data: {
          items,
          pagination,
        },
        message: '用户列表查询成功',
      });
    });

    it('应该支持空数组', () => {
      const items = [];
      const pagination = { page: 1, pageSize: 10, total: 0, totalPages: 0 };
      const result = paginate(items, pagination);

      expect(result.data.items).toEqual([]);
      expect(result.data.pagination.total).toBe(0);
    });

    it('应该正确计算总页数', () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const pagination = { page: 1, pageSize: 10, total: 25, totalPages: 3 };
      const result = paginate(items, pagination);

      expect(result.data.pagination.totalPages).toBe(3);
    });
  });
});
