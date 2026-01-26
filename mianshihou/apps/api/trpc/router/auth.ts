import { router, publicProcedure } from "../index";
import { z } from "zod";
import { auth } from "../../lib/auth";
import { db } from "../../index";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";
import { throwIf, throwIfNull } from "../../lib/exception";
import { ErrorType } from "../../lib/errors";
import { log } from "../../lib/logger";
import type { Context } from "../index";

function generateUserAccount(email: string): string {
  const prefix = email.split("@")[0];
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${random}`;
}

function getUserFromCookie(ctx: Context) {
  const userId = ctx.req.cookies?.user_id;
  if (!userId) return null;
  return { id: parseInt(userId) };
}

export const authRouter = router({
  signUp: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      log.info('用户注册', { email: input.email });

      const [existingUser] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
      throwIf(!!existingUser, ErrorType.USER_ALREADY_EXISTS, undefined, { email: input.email });

      const userAccount = generateUserAccount(input.email);
      log.info('创建用户', { userAccount, email: input.email });
      
      const [newUser] = await db.insert(users).values({
        userAccount,
        userPassword: input.password,
        email: input.email,
        userName: input.name,
        emailVerified: false,
      }).returning();

      log.info('用户注册成功', { userId: newUser.id, email: input.email });

      return { user: newUser, message: "注册成功" };
    }),

  signIn: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      log.info('用户登录', { email: input.email });

      const [user] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
      throwIfNull(user, ErrorType.USER_NOT_FOUND, undefined, { email: input.email });

      log.info('验证密码', { userId: user.id, email: input.email });

      throwIf(user.userPassword !== input.password, ErrorType.INVALID_PASSWORD, undefined, { userId: user.id });

      log.info('用户登录成功', { userId: user.id, email: input.email });

      // 设置 cookie
      ctx.res.setCookie('user_id', user.id.toString(), {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7, // 7天
        sameSite: 'lax',
      });

      return { user, message: "登录成功" };
    }),

  signOut: publicProcedure.mutation(async ({ ctx }) => {
    ctx.res.clearCookie('user_id');
    return { success: true };
  }),

  getSession: publicProcedure.query(async ({ ctx }) => {
    const userId = ctx.req.cookies?.user_id;
    if (!userId) return null;
    
    const [user] = await db.select().from(users).where(eq(users.id, parseInt(userId))).limit(1);
    return user ? { user, session: { userId: user.id } } : null;
  }),

  me: publicProcedure.query(async ({ ctx }) => {
    const userId = ctx.req.cookies?.user_id;
    if (!userId) return null;
    
    const [user] = await db.select().from(users).where(eq(users.id, parseInt(userId))).limit(1);
    return user || null;
  }),
});
