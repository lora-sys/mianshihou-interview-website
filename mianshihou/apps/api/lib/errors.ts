/**
 * 错误类型枚举
 */
export enum ErrorType {
  // 通用错误
  UNKNOWN = 'UNKNOWN',
  INVALID_PARAMS = 'INVALID_PARAMS',

  // 用户相关错误
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  ACCOUNT_DISABLED = 'ACCOUNT_DISABLED',

  // 权限错误
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',

  // 资源错误
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',

  // 业务错误
  OPERATION_FAILED = 'OPERATION_FAILED',
  DUPLICATE_OPERATION = 'DUPLICATE_OPERATION',
}

/**
 * 错误信息映射
 */
export const ErrorMessages: Record<ErrorType, string> = {
  [ErrorType.UNKNOWN]: '未知错误',
  [ErrorType.INVALID_PARAMS]: '参数错误',

  [ErrorType.USER_NOT_FOUND]: '用户不存在',
  [ErrorType.USER_ALREADY_EXISTS]: '用户已存在',
  [ErrorType.INVALID_PASSWORD]: '密码错误',
  [ErrorType.ACCOUNT_DISABLED]: '账号已被禁用',

  [ErrorType.UNAUTHORIZED]: '未授权',
  [ErrorType.FORBIDDEN]: '无权限访问',

  [ErrorType.RESOURCE_NOT_FOUND]: '资源不存在',
  [ErrorType.RESOURCE_ALREADY_EXISTS]: '资源已存在',

  [ErrorType.OPERATION_FAILED]: '操作失败',
  [ErrorType.DUPLICATE_OPERATION]: '重复操作',
};

/**
 * HTTP 状态码映射
 */
export const ErrorHttpStatus: Record<ErrorType, number> = {
  [ErrorType.UNKNOWN]: 500,
  [ErrorType.INVALID_PARAMS]: 400,

  [ErrorType.USER_NOT_FOUND]: 404,
  [ErrorType.USER_ALREADY_EXISTS]: 409,
  [ErrorType.INVALID_PASSWORD]: 401,
  [ErrorType.ACCOUNT_DISABLED]: 403,

  [ErrorType.UNAUTHORIZED]: 401,
  [ErrorType.FORBIDDEN]: 403,

  [ErrorType.RESOURCE_NOT_FOUND]: 404,
  [ErrorType.RESOURCE_ALREADY_EXISTS]: 409,

  [ErrorType.OPERATION_FAILED]: 500,
  [ErrorType.DUPLICATE_OPERATION]: 409,
};
