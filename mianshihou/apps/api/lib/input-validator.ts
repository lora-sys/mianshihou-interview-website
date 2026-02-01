import { createLogger } from './logger';

const logger = createLogger('InputValidator');

// SQL 关键词列表（不区分大小写）
const SQL_KEYWORDS = [
  'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE', 'TRUNCATE',
  'UNION', 'WHERE', 'AND', 'OR', 'XOR', 'NOT', 'LIKE', 'IN', 'BETWEEN', 'IS',
  'NULL', 'TRUE', 'FALSE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'FULL',
  'CROSS', 'ON', 'GROUP', 'BY', 'HAVING', 'ORDER', 'LIMIT', 'OFFSET', 'DISTINCT',
  'ALL', 'ANY', 'SOME', 'EXISTS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'AS',
  'FROM', 'INTO', 'VALUES', 'SET', 'TABLE', 'DATABASE', 'SCHEMA', 'INDEX',
  'VIEW', 'PROCEDURE', 'FUNCTION', 'TRIGGER', 'CONSTRAINT', 'PRIMARY', 'KEY',
  'FOREIGN', 'REFERENCES', 'UNIQUE', 'CHECK', 'DEFAULT', 'CASCADE', 'RESTRICT',
  'NO', 'ACTION', 'SET', 'NULL', 'COMMENT', 'GRANT', 'REVOKE', 'COMMIT',
  'ROLLBACK', 'TRANSACTION', 'BEGIN', 'SAVEPOINT', 'RELEASE', 'LOCK', 'UNLOCK',
  'DESC', 'ASC', 'WITH', 'RECURSIVE', 'WINDOW', 'OVER', 'PARTITION', 'ROWS',
  'RANGE', 'UNBOUNDED', 'PRECEDING', 'FOLLOWING', 'CURRENT', 'ROW', 'EXCLUDE',
  'TIES', 'NO', 'OTHERS', 'FIRST', 'LAST', 'RANK', 'DENSE_RANK', 'ROW_NUMBER',
  'LEAD', 'LAG', 'NTILE', 'CUME_DIST', 'PERCENT_RANK', 'PERCENTILE_CONT',
  'PERCENTILE_DISC', 'ARRAY', 'ROW', 'JSON', 'JSONB', 'XML', 'HSTORE', 'UUID',
  'TEXT', 'INTEGER', 'BIGINT', 'SMALLINT', 'DECIMAL', 'NUMERIC', 'REAL',
  'DOUBLE', 'PRECISION', 'FLOAT', 'BOOLEAN', 'DATE', 'TIME', 'TIMESTAMP',
  'INTERVAL', 'BYTEA', 'BIT', 'VARBIT', 'CHAR', 'VARCHAR', 'NCHAR', 'NVARCHAR',
  'CLOB', 'BLOB', 'BINARY', 'VARBINARY',
];

// 危险字符模式
const DANGEROUS_PATTERNS = [
  /--/, // SQL 注释
  /\/\*/, // 多行注释开始
  /\*\//, // 多行注释结束
  /;/, // 分号
  /'/, // 单引号
  /"/, // 双引号
  /`/, // 反引号
  /\\/, // 反斜杠
  /\|/, // 管道符
  /&&/, // 逻辑与
  /\|\|/, // 逻辑或
  /\*/, // 乘号
  /=/, // 等于
  /</, // 小于
  />/, // 大于
  /;/, // 分号
];

// 验证结果接口
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// 验证配置接口
export interface ValidationConfig {
  // 最大字符串长度
  maxLength?: number;
  // 最小字符串长度
  minLength?: number;
  // 是否允许特殊字符
  allowSpecialChars?: boolean;
  // 是否允许 SQL 关键词
  allowSQLKeywords?: boolean;
  // 自定义正则表达式
  pattern?: RegExp;
  // 自定义验证函数
  customValidator?: (value: any) => boolean | string;
}

// 默认配置
const DEFAULT_CONFIG: Required<ValidationConfig> = {
  maxLength: 1000,
  minLength: 0,
  allowSpecialChars: false,
  allowSQLKeywords: false,
  pattern: /^[\w\s\-._@]+$/,
  customValidator: () => true,
};

/**
 * 检查字符串是否包含 SQL 关键词
 */
function containsSQLKeywords(input: string): boolean {
  if (typeof input !== 'string') {
    return false;
  }
  const upperInput = input.toUpperCase();
  return SQL_KEYWORDS.some(keyword => upperInput.includes(keyword));
}

/**
 * 检查字符串是否包含危险字符
 */
function containsDangerousPatterns(input: string): string[] {
  if (typeof input !== 'string') {
    return [];
  }

  const foundPatterns: string[] = [];

  DANGEROUS_PATTERNS.forEach(pattern => {
    if (pattern.test(input)) {
      foundPatterns.push(pattern.source);
    }
  });

  return foundPatterns;
}

/**
 * 验证字符串输入
 */
export function validateString(
  input: string,
  config: Partial<ValidationConfig> = {}
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // 检查长度
  if (input.length < finalConfig.minLength) {
    errors.push(`输入长度不能少于 ${finalConfig.minLength} 个字符`);
  }

  if (input.length > finalConfig.maxLength) {
    errors.push(`输入长度不能超过 ${finalConfig.maxLength} 个字符`);
  }

  // 检查 SQL 关键词
  if (!finalConfig.allowSQLKeywords && containsSQLKeywords(input)) {
    errors.push('输入包含 SQL 关键词，可能存在 SQL 注入风险');
  }

  // 检查危险字符
  if (!finalConfig.allowSpecialChars) {
    const dangerousPatterns = containsDangerousPatterns(input);
    if (dangerousPatterns.length > 0) {
      warnings.push(`输入包含潜在危险字符: ${dangerousPatterns.join(', ')}`);
    }
  }

  // 检查自定义正则表达式
  if (finalConfig.pattern && !finalConfig.pattern.test(input)) {
    errors.push('输入格式不正确');
  }

  // 自定义验证
  if (finalConfig.customValidator) {
    const customResult = finalConfig.customValidator(input);
    if (typeof customResult === 'string') {
      errors.push(customResult);
    } else if (!customResult) {
      errors.push('自定义验证失败');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 验证数字输入
 */
export function validateNumber(
  input: number,
  config: { min?: number; max?: number; integer?: boolean } = {}
): ValidationResult {
  const errors: string[] = [];

  // 检查是否为数字
  if (typeof input !== 'number' || isNaN(input)) {
    errors.push('输入必须是有效的数字');
    return { valid: false, errors, warnings: [] };
  }

  // 检查是否为整数
  if (config.integer && !Number.isInteger(input)) {
    errors.push('输入必须是整数');
  }

  // 检查范围
  if (config.min !== undefined && input < config.min) {
    errors.push(`输入不能小于 ${config.min}`);
  }

  if (config.max !== undefined && input > config.max) {
    errors.push(`输入不能大于 ${config.max}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: [],
  };
}

/**
 * 验证对象输入
 */
export function validateObject(
  input: Record<string, any>,
  schema: Record<string, Partial<ValidationConfig> | { type: 'string' | 'number' | 'boolean'; config?: Partial<ValidationConfig> }>
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const [key, fieldSchema] of Object.entries(schema)) {
    const value = input[key];

    if (value === undefined || value === null) {
      continue; // 跳过空值
    }

    if (typeof fieldSchema === 'object' && 'type' in fieldSchema) {
      // 类型化的 schema
      const type = fieldSchema.type;
      const config = fieldSchema.config || {};

      if (type === 'string') {
        const result = validateString(value, config);
        errors.push(...result.errors.map(e => `${key}: ${e}`));
        warnings.push(...result.warnings.map(w => `${key}: ${w}`));
      } else if (type === 'number') {
        const result = validateNumber(value, config);
        errors.push(...result.errors.map(e => `${key}: ${e}`));
      } else if (type === 'boolean') {
        if (typeof value !== 'boolean') {
          errors.push(`${key}: 必须是布尔值`);
        }
      }
    } else {
      // 简单的 string schema
      const result = validateString(value, fieldSchema);
      errors.push(...result.errors.map(e => `${key}: ${e}`));
      warnings.push(...result.warnings.map(w => `${key}: ${w}`));
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 验证数组输入
 */
export function validateArray<T>(
  input: T[],
  validator: (item: T, index: number) => ValidationResult
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  input.forEach((item, index) => {
    const result = validator(item, index);
    errors.push(...result.errors.map(e => `[${index}]: ${e}`));
    warnings.push(...result.warnings.map(w => `[${index}]: ${w}`));
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 清理字符串输入（移除危险字符）
 */
export function sanitizeString(input: string): string {
  // 移除 SQL 注释
  let sanitized = input.replace(/--.*$/gm, '');
  sanitized = sanitized.replace(/\/\*[\s\S]*?\*\//g, '');

  // 转义特殊字符
  sanitized = sanitized.replace(/'/g, "''");
  sanitized = sanitized.replace(/"/g, '""');
  sanitized = sanitized.replace(/`/g, '``');
  sanitized = sanitized.replace(/\\/g, '\\\\');

  return sanitized.trim();
}

/**
 * 验证并清理输入
 */
export function validateAndSanitize(input: string, config: Partial<ValidationConfig> = {}): {
  valid: boolean;
  sanitized: string;
  errors: string[];
  warnings: string[];
} {
  const validation = validateString(input, config);
  const sanitized = sanitizeString(input);

  return {
    ...validation,
    sanitized,
  };
}

/**
 * 检查是否为潜在的 SQL 注入
 */
export function isPotentialSQLInjection(input: string): boolean {
  const result = validateString(input, {
    allowSQLKeywords: false,
    allowSpecialChars: false,
  });

  return !result.valid || result.warnings.length > 0;
}

/**
 * 日志记录验证失败
 */
export function logValidationFailure(
  input: any,
  result: ValidationResult,
  context?: string
): void {
  if (!result.valid) {
    logger.warn('输入验证失败', {
      context,
      errors: result.errors,
      warnings: result.warnings,
      input: JSON.stringify(input).substring(0, 100), // 只记录前100个字符
    });
  }
}

// 预定义的验证配置
export const validationConfigs = {
  // 用户名验证
  username: {
    minLength: 3,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9_-]+$/,
    allowSQLKeywords: false,
    allowSpecialChars: false,
  } as ValidationConfig,

  // 邮箱验证
  email: {
    minLength: 5,
    maxLength: 100,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    allowSQLKeywords: false,
    allowSpecialChars: true,
  } as ValidationConfig,

  // 密码验证
  password: {
    minLength: 8,
    maxLength: 100,
    customValidator: (value: string) => {
      if (!/[A-Z]/.test(value)) return '密码必须包含至少一个大写字母';
      if (!/[a-z]/.test(value)) return '密码必须包含至少一个小写字母';
      if (!/[0-9]/.test(value)) return '密码必须包含至少一个数字';
      return true;
    },
  } as ValidationConfig,

  // ID 验证
  id: {
    minLength: 1,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9_-]+$/,
    allowSQLKeywords: false,
    allowSpecialChars: false,
  } as ValidationConfig,

  // 搜索关键词验证
  search: {
    minLength: 1,
    maxLength: 100,
    allowSQLKeywords: false,
    allowSpecialChars: true,
  } as ValidationConfig,
};