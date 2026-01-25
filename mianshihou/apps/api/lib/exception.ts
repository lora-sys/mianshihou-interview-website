import { TRPCError } from '@trpc/server';
import { ErrorType, ErrorMessages, ErrorHttpStatus } from './errors';
import { log } from './logger';

/**
 * 全局异常处理器类
 * 支持多种参数形式：
 * - throwException(ErrorType.USER_NOT_FOUND)
 * - throwException(ErrorType.USER_NOT_FOUND, '自定义消息')
 * - throwException(ErrorType.USER_NOT_FOUND, '自定义消息', { userId: 1 })
 */
class ExceptionHandler {
  /**
   * 抛出异常
   * @param type 错误类型
   * @param customMessage 自定义错误消息（可选）
   * @param context 上下文信息（可选）
   */
  throw(
    type: ErrorType,
    customMessage?: string,
    context?: Record<string, any>
  ): never {
    const message = customMessage || ErrorMessages[type];
    const code = ErrorHttpStatus[type];

    const fullMessage = context 
      ? `${message} [${JSON.stringify(context)}]` 
      : message;

    // 记录错误日志
    log.error('抛出异常', {
      type,
      message: fullMessage,
      code,
      context,
    });

    throw new TRPCError({
      code: this.getTrpcErrorCode(code),
      message: fullMessage,
    });
  }

  /**
   * 条件抛出异常
   * @param condition 条件，为 true 时抛出异常
   * @param type 错误类型
   * @param customMessage 自定义错误消息（可选）
   * @param context 上下文信息（可选）
   */
  throwIf(
    condition: boolean,
    type: ErrorType,
    customMessage?: string,
    context?: Record<string, any>
  ): void {
    if (condition) {
      this.throw(type, customMessage, context);
    }
  }

  /**
   * 条件抛出异常（反向）
   * @param condition 条件，为 false 时抛出异常
   * @param type 错误类型
   * @param customMessage 自定义错误消息（可选）
   * @param context 上下文信息（可选）
   */
  throwIfNot(
    condition: boolean,
    type: ErrorType,
    customMessage?: string,
    context?: Record<string, any>
  ): void {
    if (!condition) {
      this.throw(type, customMessage, context);
    }
  }

  /**
   * 检查并抛出异常（用于检查资源是否存在）
   * @param resource 资源对象
   * @param type 错误类型
   * @param customMessage 自定义错误消息（可选）
   * @param context 上下文信息（可选）
   */
  throwIfNull<T>(
    resource: T | null | undefined,
    type: ErrorType,
    customMessage?: string,
    context?: Record<string, any>
  ): asserts resource is T {
    if (resource === null || resource === undefined) {
      this.throw(type, customMessage, context);
    }
  }

  /**
   * 将 HTTP 状态码转换为 tRPC 错误代码
   */
  private getTrpcErrorCode(httpCode: number): 'BAD_REQUEST' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'INTERNAL_SERVER_ERROR' {
    if (httpCode === 400) return 'BAD_REQUEST';
    if (httpCode === 401) return 'UNAUTHORIZED';
    if (httpCode === 403) return 'FORBIDDEN';
    if (httpCode === 404) return 'NOT_FOUND';
    return 'INTERNAL_SERVER_ERROR';
  }
}

export const exception: ExceptionHandler = new ExceptionHandler();

export const throwException = (type: ErrorType, customMessage?: string, context?: Record<string, any>) => {
  exception.throw(type, customMessage, context);
};

export const throwIf = (condition: boolean, type: ErrorType, customMessage?: string, context?: Record<string, any>) => {
  exception.throwIf(condition, type, customMessage, context);
};

export const throwIfNot = (condition: boolean, type: ErrorType, customMessage?: string, context?: Record<string, any>) => {
  exception.throwIfNot(condition, type, customMessage, context);
};

export const throwIfNull = <T>(resource: T | null | undefined, type: ErrorType, customMessage?: string, context?: Record<string, any>) => {
  exception.throwIfNull(resource, type, customMessage, context);
};