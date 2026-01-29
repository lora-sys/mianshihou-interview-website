import { TRPCError } from '@trpc/server';
import { publicProcedure } from '../index';
import type { Context } from '../index';
import { log } from '../../lib/logger';
export const protectedProcedure = publicProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    log.warn('未授权访问', { path: 'protected-route' }); // ✅ 使用 logger
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: '请先登录',
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});
