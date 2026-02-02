import { TRPCError } from '@trpc/server';
import { publicProcedure } from '../index';
import type { Context } from '../index';
import { log } from '../../lib/logger';

export const protectedProcedure = publicProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    log.warn('未授权访问', { path: 'protected-route' });
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: '请先登录',
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.userRole !== 'admin') {
    log.warn('无管理员权限', { userId: ctx.user.id, role: ctx.user.userRole });
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: '需要管理员权限',
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});
