import { router, publicProcedure } from "../index";
import { z } from "zod";
import { users } from "../../db/schema";
import { eq, and, desc, like } from "drizzle-orm";
import { db } from "../../index";
import { throwIfNull, throwIf } from "../../lib/exception";
import { ErrorType } from "../../lib/errors";

export const userRouter = router({
  list: publicProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(10),
        keyword: z.string().optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const { page = 1, pageSize = 10, keyword } = input || {};
      let query = db.select().from(users).where(eq(users.isDelete, false));
      if (keyword) {
        query = db.select().from(users).where(and(eq(users.isDelete, false), like(users.userName, `%${keyword}%`)));
      }
      const allUsers = await query.orderBy(desc(users.createTime)).limit(pageSize).offset((page - 1) * pageSize);
      return allUsers;
    }),

  byId: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [user] = await db.select().from(users)
        .where(and(eq(users.id, input.id), eq(users.isDelete, false)))
        .limit(1);
      throwIfNull(user, ErrorType.USER_NOT_FOUND, undefined, { userId: input.id });
      return user;
    }),

  create: publicProcedure
    .input(
      z.object({
        userAccount: z.string().min(3).max(256),
        userPassword: z.string().min(6).max(64),
        email: z.string().email().optional(),
        userName: z.string().min(1).max(256).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [existingUser] = await db.select().from(users)
        .where(eq(users.userAccount, input.userAccount))
        .limit(1);
      throwIf(!!existingUser, ErrorType.USER_ALREADY_EXISTS, undefined, { userAccount: input.userAccount });
      const [newUser] = await db.insert(users).values(input).returning();
      return newUser;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        userName: z.string().optional(),
        userAvatar: z.string().url().optional(),
        userProfile: z.string().max(512).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;
      const [updatedUser] = await db.update(users)
        .set({ ...updateData, updateTime: new Date() })
        .where(eq(users.id, id))
        .returning();
      return updatedUser;
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [deletedUser] = await db.update(users)
        .set({ isDelete: true, updateTime: new Date() })
        .where(eq(users.id, input.id))
        .returning();
      throwIfNull(deletedUser, ErrorType.USER_NOT_FOUND, undefined, { userId: input.id });
      return { success: true, id: deletedUser.id };
    }),
});
