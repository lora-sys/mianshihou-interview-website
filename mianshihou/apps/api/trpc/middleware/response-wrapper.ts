/**
 * tRPC 响应包装中间件
 * 自动包装 tRPC 响应为统一格式
 */
import { initTRPC, TRPCError } from '@trpc/server';
import { success } from '../lib/response-wrapper';
import { sanitizeUser, sanitizeUsers } from '../lib/data-sanitizer';
import { transformUser, transformUsers } from '../lib/field-transformer';

/**
 * 创建响应包装中间件
 * 自动包装响应、脱敏敏感字段、转换字段命名
 */
export function createResponseWrapperMiddleware() {
  return initTRPC.context().middleware(async ({ ctx, next, path }) => {
    const result = await next();

    // 如果已经是统一格式，直接返回
    if (result && typeof result === 'object' && 'success' in result) {
      return result;
    }

    // 检查路由类型，决定如何处理数据
    const pathStr = Array.isArray(path) ? path.join('.') : path;

    // 用户相关路由：脱敏和转换
    if (pathStr.includes('auth.') || pathStr.includes('users.')) {
      if (Array.isArray(result)) {
        // 用户列表
        return success(transformUsers(sanitizeUsers(result)));
      } else if (result && typeof result === 'object') {
        // 单个用户对象
        if (result.user) {
          return success({
            ...result,
            user: transformUser(sanitizeUser(result.user)),
          });
        }
        return success(transformUser(sanitizeUser(result)));
      }
    }

    // 其他路由：直接包装
    return success(result);
  });
}
