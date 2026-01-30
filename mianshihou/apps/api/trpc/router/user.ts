import { router, publicProcedure } from '../index';
import { z } from 'zod';
import { users } from '../../db/schema';
import { eq, and, desc, like } from 'drizzle-orm';
import { db } from '../../index';
import { throwIfNull, throwIf } from '../../lib/exception';
import { ErrorType } from '../../lib/errors';
import { adminProcedure, adminOrOwnerProcedure } from '../middleware/permissions';
import { success, createPaginationMeta } from '../../lib/response-wrapper';
import { sanitizeUser, sanitizeUsers } from '../../lib/data-sanitizer';
import { transformUser, transformUsers } from '../../lib/field-transformer';

// 创建 adminOrOwner 的 procedure
export const adminOrOwner = publicProcedure.use(adminOrOwnerProcedure);

export const userRouter = router({
  // List users - requires admin
  list: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(10),
        keyword: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page = 1, pageSize = 10, keyword } = input || {};

      // 获取总数
      let countQuery = db.select({ count: users.id }).from(users).where(eq(users.isDelete, false));
      if (keyword) {
        countQuery = db
          .select({ count: users.id })
          .from(users)
          .where(and(eq(users.isDelete, false), like(users.userName, `%${keyword}%`)));
      }
      const [{ count }] = await countQuery;

      // 获取用户列表
      let query = db.select().from(users).where(eq(users.isDelete, false));
      if (keyword) {
        query = db
          .select()
          .from(users)
          .where(and(eq(users.isDelete, false), like(users.userName, `%${keyword}%`)));
      }
      const allUsers = await query
        .orderBy(desc(users.createTime))
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      // 脱敏和转换用户数据
      const sanitizedUsers = sanitizeUsers(allUsers);
      const transformedUsers = transformUsers(sanitizedUsers);

      // 创建分页元数据
      const pagination = createPaginationMeta(page, pageSize, count);

      return success(
        {
          items: transformedUsers,
          pagination,
        },
        '获取用户列表成功'
      );
    }),

  // Get user by ID - requires admin or owner
  byId: adminOrOwner.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, input.id), eq(users.isDelete, false)))
      .limit(1);
    throwIfNull(user, ErrorType.USER_NOT_FOUND, undefined, { userId: input.id });

    // 脱敏和转换用户数据
    const sanitizedUser = sanitizeUser(user);
    const transformedUser = transformUser(sanitizedUser);

    return success(transformedUser, '获取用户成功');
  }),

  // Create user - requires admin
  create: adminProcedure
    .input(
      z.object({
        userAccount: z.string().min(3).max(256),
        userPassword: z.string().min(6).max(64),
        email: z.string().email().optional(),
        userName: z.string().min(1).max(256).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.userAccount, input.userAccount))
        .limit(1);
      throwIf(!!existingUser, ErrorType.USER_ALREADY_EXISTS, undefined, {
        userAccount: input.userAccount,
      });
      const [newUser] = await db.insert(users).values(input).returning();

      // 脱敏和转换用户数据（不返回密码）
      const sanitizedUser = sanitizeUser(newUser);
      const transformedUser = transformUser(sanitizedUser);

      return success(transformedUser, '创建用户成功');
    }),

  // Update user - requires admin or owner
  update: adminOrOwner
    .input(
      z.object({
        id: z.string(),
        userName: z.string().optional(),
        userAvatar: z.string().url().optional(),
        userProfile: z.string().max(512).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;
      const [updatedUser] = await db
        .update(users)
        .set({ ...updateData, updateTime: new Date() })
        .where(eq(users.id, id))
        .returning();

      // 脱敏和转换用户数据
      const sanitizedUser = sanitizeUser(updatedUser);
      const transformedUser = transformUser(sanitizedUser);

      return success(transformedUser, '更新用户成功');
    }),

  // Delete user - requires admin
  delete: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const [deletedUser] = await db
      .update(users)
      .set({ isDelete: true, updateTime: new Date() })
      .where(eq(users.id, input.id))
      .returning();
    throwIfNull(deletedUser, ErrorType.USER_NOT_FOUND, undefined, { userId: input.id });

    return success({ id: deletedUser.id }, '删除用户成功');
  }),
});
