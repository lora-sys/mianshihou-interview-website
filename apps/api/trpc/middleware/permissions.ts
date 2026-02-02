import { TRPCError } from '@trpc/server';
import { publicProcedure } from '../index';
import { log } from '../../lib/logger';

const ERROR_MESSAGES = {
  UNAUTHORIZED: '未授权访问，请先登录',
  FORBIDDEN: '权限不足',
  BANNED: '账号已被封禁',
  INVALID_ROLE: '无效的角色',
};

/**
 * 检查用户是否是资源所有者
 */
export function isOwner(user: any, resource: any): boolean {
  if (!user || !resource) return false;
  return user.id === resource.userId || user.id === resource.id;
}

/**
 * 检查用户是否拥有指定角色
 */
export function hasRole(user: any, role: string): boolean {
  if (!user) return false;
  return user.userRole === role || user.role === role;
}

/**
 * 检查用户是否是管理员
 */
export function isAdmin(user: any): boolean {
  return hasRole(user, 'admin');
}

// 中间件：验证用户是否已登录
export const requireAuth = async ({ ctx, next }: any) => {
  if (!ctx.user) {
    log.warn('未授权访问 - 缺少用户信息');
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: ERROR_MESSAGES.UNAUTHORIZED,
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
};

// 中间件：验证用户账号是否激活
export const requireActive = async ({ ctx, next }: any) => {
  if (!ctx.user) {
    log.warn('未授权访问 - 缺少用户信息');
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: ERROR_MESSAGES.UNAUTHORIZED,
    });
  }

  if (ctx.user.status !== 'active') {
    log.warn('封禁账号尝试访问', { userId: ctx.user.id, status: ctx.user.status });
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: ERROR_MESSAGES.BANNED,
    });
  }

  return next({ ctx: { ...ctx, user: ctx.user } });
};

// 中间件工厂：验证用户角色
export const requireRole = (role: string) => {
  return async ({ ctx, next }: any) => {
    if (!ctx.user) {
      log.warn('未授权访问 - 缺少用户信息');
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: ERROR_MESSAGES.UNAUTHORIZED,
      });
    }

    if (ctx.user.status !== 'active') {
      log.warn('封禁账号尝试访问', { userId: ctx.user.id, status: ctx.user.status });
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: ERROR_MESSAGES.BANNED,
      });
    }

    if (ctx.user.userRole !== role) {
      log.warn('角色权限不足', {
        userId: ctx.user?.id,
        requiredRole: role,
        userRole: ctx.user?.userRole,
      });
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: ERROR_MESSAGES.INVALID_ROLE,
      });
    }

    return next({ ctx: { ...ctx, user: ctx.user } });
  };
};

// 预定义的权限中间件
export const requireUser = requireRole('user');
export const adminProcedure = publicProcedure.use(requireRole('admin'));
export const userProcedure = publicProcedure.use(requireRole('user'));

// 中间件：验证管理员或资源所有者权限
export const adminOrOwnerProcedure = async ({ ctx, next }: any) => {
  if (!ctx.user) {
    log.warn('未授权访问 - 缺少用户信息');
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: ERROR_MESSAGES.UNAUTHORIZED,
    });
  }

  const ownerId = ctx.next?.meta?.ownerId;
  const isAdmin = ctx.user.userRole === 'admin';
  const isOwner = !ownerId || ctx.user.id === ownerId;

  if (!isAdmin && !isOwner) {
    log.warn('管理员或资源所有者权限不足', {
      userId: ctx.user.id,
      requestedOwnerId: ownerId,
      isAdmin,
    });
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: ERROR_MESSAGES.FORBIDDEN,
    });
  }

  return next({ ctx: { ...ctx, user: ctx.user } });
};
