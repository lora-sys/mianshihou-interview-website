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
import {
  handleConcurrentLogin,
  getUserActiveDevices,
  revokeDevice,
  revokeAllDevices,
} from '../../lib/concurrent-login';
import { generateDeviceInfo } from '../../lib/device-fingerprint';

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

        if (!result.user || !result.session) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: '邮箱或密码错误',
          });
        }

        // 获取客户端 IP 和 User-Agent
        const ip = ctx.req.ip || (ctx.req.headers['x-forwarded-for'] as string) || 'unknown';
        const userAgent = (ctx.req.headers['user-agent'] as string) || 'unknown';

        // 检查并发登录
        const concurrentCheck = await handleConcurrentLogin(
          result.user.id,
          ip,
          userAgent,
          result.session.id
        );

        if (!concurrentCheck.allowed) {
          // 登出当前会话
          await auth.api.signOut({ headers });

          throw new TRPCError({
            code: 'FORBIDDEN',
            message: concurrentCheck.message || '达到设备登录上限',
          });
        }

        log.info('用户登录成功', {
          email: input.email,
          userId: result.user?.id,
          ip,
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

  /**
   * 获取当前用户的活跃设备列表
   */
  myDevices: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: '未登录',
      });
    }

    log.debug('获取用户设备列表', { userId: ctx.user.id });

    const devices = await getUserActiveDevices(ctx.user.id);

    return success(devices, '获取设备列表成功');
  }),

  /**
   * 踢出指定设备
   */
  revokeDevice: publicProcedure
    .input(
      z.object({
        deviceFingerprint: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: '未登录',
        });
      }

      log.info('用户踢出设备', {
        userId: ctx.user.id,
        deviceFingerprint: input.deviceFingerprint,
      });

      await revokeDevice(ctx.user.id, input.deviceFingerprint);

      return success(null, '设备已移除');
    }),

  /**
   * 踢出所有设备（当前设备除外）
   */
  revokeAllDevices: publicProcedure.mutation(async ({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: '未登录',
      });
    }

    // 获取当前设备的指纹
    const ip = ctx.req.ip || (ctx.req.headers['x-forwarded-for'] as string) || 'unknown';
    const userAgent = (ctx.req.headers['user-agent'] as string) || 'unknown';
    const { fingerprint: currentFingerprint } = generateDeviceInfo(ip, userAgent);

    // 获取所有设备
    const allDevices = await getUserActiveDevices(ctx.user.id);

    // 踢出其他设备
    for (const device of allDevices) {
      if (device.fingerprint !== currentFingerprint) {
        await revokeDevice(ctx.user.id, device.fingerprint);
      }
    }

    log.info('用户踢出所有设备', { userId: ctx.user.id });

    return success(null, '已踢出所有其他设备');
  }),
});
