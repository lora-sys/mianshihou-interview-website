import { router, publicProcedure } from '../index';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { auth } from '../../lib/auth';
import { throwIf, throwIfNull } from '../../lib/exception';
import { ErrorType } from '../../lib/errors';
import { log } from '../../lib/logger';
import { headersFromRequest } from '../../lib/cookie-utils';
import { success } from '../../lib/response-wrapper';
import { sanitizeUser, transformUser } from '../../lib/data-sanitizer';
import { transformUser as transformUserField } from '../../lib/field-transformer';

export const authRouter = router({
  signUp: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().min(1).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      log.info('用户注册请求', { email: input.email });

      try {
        // 使用 Better-Auth 的 API 方法，并传递 headers 以获取 cookies
        const headers = headersFromRequest(ctx.req);
        const result = await auth.api.signUpEmail({
          body: {
            email: input.email,
            password: input.password,
            name: input.name || input.email.split('@')[0],
          },
          headers,
        });

        log.info('用户注册成功', {
          email: input.email,
          userId: result.user?.id,
        });

        // 脱敏和转换用户数据
        const transformedUser = transformUserField(sanitizeUser(result.user));

        // 包装响应
        return success(transformedUser, '注册成功');
      } catch (error: any) {
        // Better-Auth v1.4+ uses structured error codes
        if (error?.code === 'USER_EXISTS') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '该邮箱已被注册',
          });
        }
        throw error;
      }
    }),

  signIn: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      log.info('用户登录请求', { email: input.email });

      try {
        // 使用 Better-Auth 的 API 方法，并传递 headers 以获取 cookies
        const headers = headersFromRequest(ctx.req);
        const result = await auth.api.signInEmail({
          body: {
            email: input.email,
            password: input.password,
          },
          headers,
        });

        log.info('用户登录成功', {
          email: input.email,
          userId: result.user?.id,
        });

        // 脱敏和转换用户数据
        const transformedUser = transformUserField(sanitizeUser(result.user));

        // 包装响应
        return success(transformedUser, '登录成功');
      } catch (error: any) {
        if (error?.status === 401 || error?.message?.includes('Invalid credentials')) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: '邮箱或密码错误',
          });
        }
        throw error;
      }
    }),

  signOut: publicProcedure.mutation(async ({ ctx }) => {
    log.info('用户登出', { userId: ctx.user?.id });

    try {
      // 使用解耦的工具函数获取 Better-Auth Headers
      const headers = headersFromRequest(ctx.req);

      await auth.api.signOut({
        headers,
      });

      return success(null, '登出成功');
    } catch (error) {
      log.error('登出失败', error as Error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: '登出失败',
      });
    }
  }),

  getSession: publicProcedure.query(async ({ ctx }) => {
    log.debug('获取会话信息', { userId: ctx.user?.id });

    // 脱敏会话数据
    const sanitizedSession = ctx.session
      ? {
          ...ctx.session,
          token: undefined, // 不返回令牌
        }
      : null;

    return success(
      {
        user: ctx.user,
        session: sanitizedSession,
      },
      '获取会话成功'
    );
  }),

  me: publicProcedure.query(async ({ ctx }) => {
    log.debug('获取用户资料', { userId: ctx.user?.id });

    if (!ctx.user) {
      return success(null, '未登录');
    }

    // 脱敏和转换用户数据
    const transformedUser = transformUserField(sanitizeUser(ctx.user));

    return success(transformedUser, '获取用户资料成功');
  }),
});
