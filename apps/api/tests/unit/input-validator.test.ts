import { describe, it, expect } from 'bun:test';
import {
  validateString,
  validateNumber,
  validateObject,
  validateArray,
  sanitizeString,
  validateAndSanitize,
  isPotentialSQLInjection,
  validationConfigs,
} from '../../lib/input-validator';

describe('Input Validator', () => {
  describe('字符串验证', () => {
    it('应该验证有效的字符串', () => {
      const result = validateString('test123');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该检测过长的字符串', () => {
      const result = validateString('a'.repeat(1001), { maxLength: 1000 });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('不能超过'))).toBe(true);
    });

    it('应该检测过短的字符串', () => {
      const result = validateString('ab', { minLength: 3 });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('不能少于'))).toBe(true);
    });

    it('应该检测 SQL 关键词', () => {
      const result = validateString('SELECT * FROM users', { allowSQLKeywords: false });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('SQL 关键词'))).toBe(true);
    });

    it('应该检测危险字符', () => {
      const result = validateString("test'; DROP TABLE users; --", { allowSpecialChars: false });
      expect(result.valid).toBe(false); // 包含 SQL 关键词，应该无效
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('应该验证自定义正则表达式', () => {
      const result = validateString('invalid-email', {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('格式不正确'))).toBe(true);
    });

    it('应该使用自定义验证函数', () => {
      const result = validateString('test', {
        customValidator: (value: string) => {
          return value.length >= 5 || '字符串长度必须至少为 5';
        },
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('字符串长度必须至少为 5');
    });
  });

  describe('数字验证', () => {
    it('应该验证有效的数字', () => {
      const result = validateNumber(42);
      expect(result.valid).toBe(true);
    });

    it('应该拒绝非数字', () => {
      const result = validateNumber('not a number' as any);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('有效的数字'))).toBe(true);
    });

    it('应该拒绝 NaN', () => {
      const result = validateNumber(NaN);
      expect(result.valid).toBe(false);
    });

    it('应该验证整数', () => {
      const result = validateNumber(3.14, { integer: true });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('整数'))).toBe(true);
    });

    it('应该验证最小值', () => {
      const result = validateNumber(5, { min: 10 });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('不能小于'))).toBe(true);
    });

    it('应该验证最大值', () => {
      const result = validateNumber(100, { max: 50 });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('不能大于'))).toBe(true);
    });

    it('应该接受范围内的数字', () => {
      const result = validateNumber(25, { min: 10, max: 50 });
      expect(result.valid).toBe(true);
    });
  });

  describe('对象验证', () => {
    it('应该验证有效的对象', () => {
      const result = validateObject(
        { username: 'test123', email: 'test@example.com' },
        {
          username: { minLength: 3 },
          email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
        }
      );
      expect(result.valid).toBe(true);
    });

    it('应该验证无效的字段', () => {
      const result = validateObject(
        { username: 'ab', email: 'invalid' },
        {
          username: { minLength: 3 },
          email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
        }
      );
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(2);
    });

    it('应该跳过空值', () => {
      const result = validateObject(
        { username: null, email: undefined },
        {
          username: { minLength: 3 },
          email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
        }
      );
      expect(result.valid).toBe(true);
    });

    it('应该支持类型化的 schema', () => {
      const result = validateObject(
        { name: 'test', age: 25, active: true },
        {
          name: { type: 'string', config: { minLength: 3 } },
          age: { type: 'number', config: { min: 0 } },
          active: { type: 'boolean' },
        }
      );
      expect(result.valid).toBe(true);
    });

    it('应该拒绝错误的类型', () => {
      const result = validateObject(
        { name: 123, age: '25' },
        {
          name: { type: 'string' },
          age: { type: 'number' },
        }
      );
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(2);
    });
  });

  describe('数组验证', () => {
    it('应该验证有效的数组', () => {
      const result = validateArray(['a', 'b', 'c'], (item) =>
        validateString(item, { minLength: 1 })
      );
      expect(result.valid).toBe(true);
    });

    it('应该检测数组中的无效项', () => {
      const result = validateArray(['valid', ''], (item) => validateString(item, { minLength: 1 }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('[1]:'))).toBe(true);
    });
  });

  describe('字符串清理', () => {
    it('应该移除 SQL 注释', () => {
      const result = sanitizeString('test -- this is a comment');
      expect(result).toBe('test');
    });

    it('应该移除多行注释', () => {
      const result = sanitizeString('test /* comment */ value');
      expect(result).toBe('test value');
    });

    it('应该转义引号', () => {
      const result = sanitizeString("test'quote");
      expect(result).toBe("test''quote");
    });

    it('应该转义反引号', () => {
      const result = sanitizeString('test`backtick');
      expect(result).toBe('test``backtick');
    });

    it('应该转义反斜杠', () => {
      const result = sanitizeString('test\\backslash');
      expect(result).toBe('test\\\\backslash');
    });
  });

  describe('验证和清理', () => {
    it('应该验证并清理输入', () => {
      const result = validateAndSanitize('test -- comment', { allowSQLKeywords: false });
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('test');
    });

    it('应该在验证失败时返回清理后的字符串', () => {
      const result = validateAndSanitize('test', { minLength: 10 });
      expect(result.valid).toBe(false);
      expect(result.sanitized).toBe('test');
    });
  });

  describe('SQL 注入检测', () => {
    it('应该检测 SQL 注入', () => {
      expect(isPotentialSQLInjection("'; DROP TABLE users; --")).toBe(true);
    });

    it('应该检测 UNION 攻击', () => {
      expect(isPotentialSQLInjection("1' UNION SELECT * FROM users")).toBe(true);
    });

    it('应该检测 SELECT 注入', () => {
      expect(isPotentialSQLInjection('SELECT * FROM users')).toBe(true);
    });

    it('应该接受安全的字符串', () => {
      expect(isPotentialSQLInjection('正常用户名123')).toBe(false);
    });
  });

  describe('预定义配置', () => {
    it('应该提供用户名配置', () => {
      expect(validationConfigs.username).toBeDefined();
      expect(validationConfigs.username.minLength).toBe(3);
    });

    it('应该提供邮箱配置', () => {
      expect(validationConfigs.email).toBeDefined();
      expect(validationConfigs.email.pattern).toBeDefined();
    });

    it('应该提供密码配置', () => {
      expect(validationConfigs.password).toBeDefined();
      expect(validationConfigs.password.minLength).toBe(8);
    });

    it('应该验证用户名', () => {
      const result = validateString('test_user123', validationConfigs.username);
      expect(result.valid).toBe(true);
    });

    it('应该验证邮箱', () => {
      const result = validateString('test@example.com', validationConfigs.email);
      expect(result.valid).toBe(true);
    });

    it('应该验证强密码', () => {
      const result = validateString('StrongPass123', validationConfigs.password);
      expect(result.valid).toBe(true);
    });

    it('应该拒绝弱密码', () => {
      const result = validateString('weak', validationConfigs.password);
      expect(result.valid).toBe(false);
    });
  });
});
