import { router, publicProcedure } from '../index';
import { z } from 'zod';
import { users } from '../../db/schema';
import { eq, and, desc, like } from 'drizzle-orm';
import { db } from '../../index';
import { throwIfNull, throwIf } from '../../lib/exception';
import { ErrorType } from '../../lib/errors';
import { adminProcedure, adminOrOwnerProcedure } from '../middleware/permissions';

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
      return allUsers;
    }),

  // Get user by ID - requires admin or owner
  byId: adminOrOwner.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, input.id), eq(users.isDelete, false)))
      .limit(1);
    throwIfNull(user, ErrorType.USER_NOT_FOUND, undefined, { userId: input.id });
    return user;
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
      return newUser;
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
      return updatedUser;
    }),

  // Delete user - requires admin
  delete: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const [deletedUser] = await db
      .update(users)
      .set({ isDelete: true, updateTime: new Date() })
      .where(eq(users.id, input.id))
      .returning();
    throwIfNull(deletedUser, ErrorType.USER_NOT_FOUND, undefined, { userId: input.id });
    return { success: true, id: deletedUser.id };
  }),
});
