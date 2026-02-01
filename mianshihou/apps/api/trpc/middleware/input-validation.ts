import { middleware } from '../index';
import { TRPCError } from '@trpc/server';
import { createLogger } from '../../lib/logger';
import {
  validateString,
  validateNumber,
  validateObject,
  validateArray,
  ValidationResult,
  isPotentialSQLInjection,
  logValidationFailure,
  ValidationConfig,
} from '../../lib/input-validator';

const logger = createLogger('InputValidationMiddleware');

/**
 * 创建输入验证中间件
 */
export function createInputValidationMiddleware(
  validator: (input: any) => ValidationResult,
  options: {
    throwError?: boolean; // 是否在验证失败时抛出错误
    logFailure?: boolean; // 是否记录验证失败的日志
  } = {}
) {
  const { throwError = true, logFailure = true } = options;

  return middleware(async ({ input, next }) => {
    const result = validator(input);

    // 记录验证失败
    if (logFailure && (!result.valid || result.warnings.length > 0)) {
      logValidationFailure(input, result, 'tRPC input validation');
    }

    // 抛出错误
    if (throwError && !result.valid) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `输入验证失败: ${result.errors.join(', ')}`,
      });
    }

    // 添加警告到上下文
    if (result.warnings.length > 0) {
      logger.warn('输入验证警告', {
        warnings: result.warnings,
      });
    }

    return next();
  });
}

/**
 * 字符串验证中间件
 */
export function stringValidationMiddleware(config: Partial<ValidationConfig> = {}) {
  return createInputValidationMiddleware((input) => {
    if (typeof input !== 'string') {
      return {
        valid: false,
        errors: ['输入必须是字符串'],
        warnings: [],
      };
    }
    return validateString(input, config);
  });
}

/**
 * 数字验证中间件
 */
export function numberValidationMiddleware(
  config: { min?: number; max?: number; integer?: boolean } = {}
) {
  return createInputValidationMiddleware((input) => {
    if (typeof input !== 'number') {
      return {
        valid: false,
        errors: ['输入必须是数字'],
        warnings: [],
      };
    }
    return validateNumber(input, config);
  });
}

/**
 * 对象验证中间件
 */
export function objectValidationMiddleware(
  schema: Record<
    string,
    | Partial<ValidationConfig>
    | { type: 'string' | 'number' | 'boolean'; config?: Partial<ValidationConfig> }
  >
) {
  return createInputValidationMiddleware((input) => {
    if (typeof input !== 'object' || input === null) {
      return {
        valid: false,
        errors: ['输入必须是对象'],
        warnings: [],
      };
    }
    return validateObject(input, schema);
  });
}

/**
 * SQL 注入检测中间件
 */
export function sqlInjectionDetectionMiddleware() {
  return createInputValidationMiddleware((input) => {
    const checkForSQLInjection = (value: any): boolean => {
      if (typeof value === 'string') {
        return isPotentialSQLInjection(value);
      } else if (Array.isArray(value)) {
        return value.some((item) => checkForSQLInjection(item));
      } else if (typeof value === 'object' && value !== null) {
        return Object.values(value).some((item) => checkForSQLInjection(item));
      }
      return false;
    };

    const hasSQLInjection = checkForSQLInjection(input);

    if (hasSQLInjection) {
      return {
        valid: false,
        errors: ['检测到潜在的 SQL 注入攻击'],
        warnings: [],
      };
    }

    return {
      valid: true,
      errors: [],
      warnings: [],
    };
  });
}

/**
 * 批量输入验证中间件
 */
export function batchValidationMiddleware<T>(
  validator: (item: T) => ValidationResult,
  options: {
    maxBatchSize?: number; // 最大批量大小
    stopOnFirstError?: boolean; // 是否在第一个错误时停止
  } = {}
) {
  const { maxBatchSize = 100, stopOnFirstError = false } = options;

  return createInputValidationMiddleware((input) => {
    if (!Array.isArray(input)) {
      return {
        valid: false,
        errors: ['输入必须是数组'],
        warnings: [],
      };
    }

    if (input.length > maxBatchSize) {
      return {
        valid: false,
        errors: [`批量大小不能超过 ${maxBatchSize}`],
        warnings: [],
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    for (let i = 0; i < input.length; i++) {
      const result = validator(input[i]);
      errors.push(...result.errors.map((e) => `[${i}]: ${e}`));
      warnings.push(...result.warnings.map((w) => `[${i}]: ${w}`));

      if (stopOnFirstError && errors.length > 0) {
        break;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  });
}

/**
 * 用户名验证中间件
 */
export const usernameValidationMiddleware = stringValidationMiddleware({
  minLength: 3,
  maxLength: 50,
  pattern: /^[a-zA-Z0-9_-]+$/,
});

/**
 * 邮箱验证中间件
 */
export const emailValidationMiddleware = stringValidationMiddleware({
  minLength: 5,
  maxLength: 100,
  pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
});

/**
 * 密码验证中间件
 */
export const passwordValidationMiddleware = stringValidationMiddleware({
  minLength: 8,
  maxLength: 100,
  customValidator: (value: string) => {
    if (!/[A-Z]/.test(value)) return '密码必须包含至少一个大写字母';
    if (!/[a-z]/.test(value)) return '密码必须包含至少一个小写字母';
    if (!/[0-9]/.test(value)) return '密码必须包含至少一个数字';
    return true;
  },
});

/**
 * ID 验证中间件
 */
export const idValidationMiddleware = stringValidationMiddleware({
  minLength: 1,
  maxLength: 50,
  pattern: /^[a-zA-Z0-9_-]+$/,
});

/**
 * 搜索关键词验证中间件
 */
export const searchValidationMiddleware = stringValidationMiddleware({
  minLength: 1,
  maxLength: 100,
  allowSpecialChars: true,
});

/**
 * 通用输入验证中间件（组合多个验证器）
 */
export function combinedValidationMiddleware(validators: Array<(input: any) => ValidationResult>) {
  return createInputValidationMiddleware((input) => {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    for (const validator of validators) {
      const result = validator(input);
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
    }

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
    };
  });
}
