import { router, publicProcedure } from "../index";
import { z } from "zod";
import { auth } from "../../lib/auth";
import { throwIf, throwIfNull } from "../../lib/exception";
import { ErrorType } from "../../lib/errors";
import { log } from "../../lib/logger";
import { headersFromRequest } from "../../lib/cookie-utils";

export const authRouter = router({
  signUp: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().min(1).optional(),
      }),
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
          userId: result.user?.id
        });

        return {
          user: result.user,
          message: "注册成功",
        };
      } catch (error: any) {
        // Better-Auth v1.4+ uses structured error codes
        if (error?.code === 'USER_EXISTS') {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "该邮箱已被注册",
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
      }),
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
          userId: result.user?.id
        });

        return {
          user: result.user,
          message: "登录成功",
        };
      } catch (error: any) {
        if (error?.status === 401 || error?.message?.includes('Invalid credentials')) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "邮箱或密码错误",
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

      return { success: true, message: "登出成功" };
    } catch (error) {
      log.error('登出失败', error as Error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "登出失败",
      });
    }
  }),

  getSession: publicProcedure.query(async ({ ctx }) => {
    log.debug('获取会话信息', { userId: ctx.user?.id });

    return {
      user: ctx.user,
      session: ctx.session,
    };
  }),

  me: publicProcedure.query(async ({ ctx }) => {
    log.debug('获取用户资料', { userId: ctx.user?.id });

    return {
      id: ctx.user?.id,
      email: ctx.user?.email,
      userName: ctx.user?.userName,
      userAvatar: ctx.user?.userAvatar,
      userRole: ctx.user?.userRole,
      status: ctx.user?.status,
    };
  }),
});
