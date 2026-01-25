import { router, publicProcedure } from "../index";
import { z } from "zod"; // 用于输入验证
import { users } from "../../db/schema"; // 用户表
import { eq, and, desc, like } from "drizzle-orm"; // Drizzle ORM 操作符
import { db } from "../../index";
import { throwIf, throwIfNot, throwIfNull } from "../../lib/exception";
import { ErrorType } from "../../lib/errors";

export const userRouter = router({
  users: router({
    list: publicProcedure
      .input(
        z
          .object({
            page: z.number().min(1).default(1),
            pageSize: z.number().min(1).max(100).default(10),
            keyword: z.string().optional(),
          })
          .optional(),
      )
      .query(async ({ ctx, input }) => {
        ctx.logger.info({ input }, '查询用户列表');

        const { page = 1, pageSize = 10, keyword } = input || {};

        let query = db.select().from(users).where(eq(users.isDelete, false));

        if (keyword) {
          query = db
            .select()
            .from(users)
            .where(
              and(
                eq(users.isDelete, false),
                like(users.userName, `%${keyword}%`),
              ),
            );
        }

        const allUsers = await query
          .orderBy(desc(users.createTime))
          .limit(pageSize)
          .offset((page - 1) * pageSize);

        ctx.logger.info({ count: allUsers.length, page, pageSize }, '查询用户列表成功');

        return allUsers;
      }),

    byId: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        ctx.logger.info({ userId: input.id }, '根据ID查询用户');

        const [user] = await db
          .select()
          .from(users)
          .where(and(eq(users.id, input.id), eq(users.isDelete, false)))
          .limit(1);

        throwIfNull(user, ErrorType.USER_NOT_FOUND, undefined, {
          userId: input.id,
        });

        ctx.logger.info({ userId: input.id, userAccount: user.userAccount }, '查询用户成功');

        return user;
      }),

    byAccount: publicProcedure
      .input(z.object({ userAccount: z.string() }))
      .query(async ({ ctx, input }) => {
        ctx.logger.info({ userAccount: input.userAccount }, '根据账号查询用户');

        const [user] = await db
          .select()
          .from(users)
          .where(
            and(
              eq(users.userAccount, input.userAccount),
              eq(users.isDelete, false),
            ),
          )
          .limit(1);

        ctx.logger.info({ 
          userAccount: input.userAccount,
          found: !!user 
        }, '查询用户账号成功');

        return user;
      }),

    create: publicProcedure
      .input(
        z.object({
          userAccount: z.string().min(3).max(256),
          userPassword: z.string().min(6).max(64),
          email: z.string().email({ message: "请输入有效邮箱地址" }).optional(),
          phone: z
            .string()
            .regex(/^1[3-9]\d{9}$/, { message: "请输入有效的手机号" })
            .optional(),
          userName: z.string().min(1).max(256).optional(),
          userAvatar: z
            .string()
            .url({ message: "请输入有效的头像 URL" })
            .optional(),
          userProfile: z.string().max(512).optional(),
          userRole: z.enum(["user", "admin"]).default("user"),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        ctx.logger.info({ 
          userAccount: input.userAccount,
          email: input.email,
          userRole: input.userRole 
        }, '创建用户开始');

        try {
          const [existingUser] = await db
            .select()
            .from(users)
            .where(eq(users.userAccount, input.userAccount))
            .limit(1);

          throwIf(!!existingUser, ErrorType.USER_ALREADY_EXISTS, undefined, {
            userAccount: input.userAccount,
          });

          const [newUser] = await db.insert(users).values(input).returning();

          ctx.logger.info({ 
            userId: newUser.id,
            userAccount: newUser.userAccount 
          }, '用户创建成功');

          return newUser;
        } catch (error) {
          ctx.logger.error({ userAccount: input.userAccount, error }, '创建用户失败');
          throw error;
        }
      }),

    update: publicProcedure
      .input(
        z.object({
          id: z.number(),
          userName: z.string().min(1).max(256).optional(),
          userAvatar: z
            .string()
            .url({ message: "请输入有效的头像地址" })
            .optional(),
          userProfile: z.string().max(512).optional(),
          email: z.string().email({ message: "请输入有效的邮箱地址" }).optional(),
          phone: z
            .string()
            .regex(/^1[3-9]\d{9}$/, { message: "请输入有效的手机号" })
            .optional(),
          status: z.enum(["active", "inactive", "banned"]).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        ctx.logger.info({ userId: input.id }, '更新用户开始');

        try {
          const { id, ...updateData } = input;

          const [existingUser] = await db
            .select()
            .from(users)
            .where(and(eq(users.id, id), eq(users.isDelete, false)))
            .limit(1);
          throwIfNull(existingUser, ErrorType.USER_NOT_FOUND, undefined, {
            userId: input.id,
          });

          const hasUpdates = Object.keys(updateData).length > 0;

          throwIfNot(
            hasUpdates,
            ErrorType.INVALID_PARAMS,
            "没有提供需要更新的字段",
          );

          const [updatedUser] = await db
            .update(users)
            .set({ ...updateData, updateTime: new Date() })
            .where(eq(users.id, id))
            .returning();

          ctx.logger.info({ 
            userId: updatedUser.id,
            updatedFields: Object.keys(updateData) 
          }, '用户更新成功');

          return updatedUser;
        } catch (error) {
          ctx.logger.error({ userId: input.id, error }, '更新用户失败');
          throw error;
        }
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        ctx.logger.info({ userId: input.id }, '删除用户开始');

        try {
          const [deletedUser] = await db
            .update(users)
            .set({
              isDelete: true,
              updateTime: new Date(),
            })
            .where(eq(users.id, input.id))
            .returning();

          throwIfNull(deletedUser, ErrorType.USER_NOT_FOUND, undefined, {
            userId: input.id,
          });

          ctx.logger.info({ userId: deletedUser.id }, '用户删除成功');

          return { success: true, id: deletedUser.id };
        } catch (error) {
          ctx.logger.error({ userId: input.id, error }, '删除用户失败');
          throw error;
        }
      }),
  }),
});