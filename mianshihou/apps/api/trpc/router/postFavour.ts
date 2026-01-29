import { router, publicProcedure } from '../index';
import { z } from 'zod';
import { postFavours } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { db } from '../../index';
import { throwIfNull, throwIf } from '../../lib/exception';
import { ErrorType } from '../../lib/errors';

export const postFavourRouter = router({
  postFavours: router({
    create: publicProcedure
      .input(
        z.object({
          postId: z.number(),
          userId: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        ctx.logger.info({ postId: input.postId, userId: input.userId }, '收藏帖子开始');

        try {
          const [existingFavour] = await db
            .select()
            .from(postFavours)
            .where(
              and(
                eq(postFavours.postId, BigInt(input.postId)),
                eq(postFavours.userId, input.userId)
              )
            )
            .limit(1);

          throwIf(!!existingFavour, ErrorType.DUPLICATE_OPERATION, '已经收藏过了');

          const [newFavour] = await db
            .insert(postFavours)
            .values({
              postId: BigInt(input.postId),
              userId: input.userId,
            })
            .returning();

          ctx.logger.info(
            { favourId: newFavour.id, postId: input.postId, userId: input.userId },
            '收藏帖子成功'
          );

          return newFavour;
        } catch (error) {
          ctx.logger.error({ postId: input.postId, userId: input.userId, error }, '收藏帖子失败');
          throw error;
        }
      }),

    delete: publicProcedure
      .input(
        z.object({
          postId: z.number(),
          userId: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        ctx.logger.info({ postId: input.postId, userId: input.userId }, '取消收藏开始');

        try {
          const [favour] = await db
            .select()
            .from(postFavours)
            .where(
              and(
                eq(postFavours.postId, BigInt(input.postId)),
                eq(postFavours.userId, input.userId)
              )
            )
            .limit(1);

          throwIfNull(favour, ErrorType.RESOURCE_NOT_FOUND, undefined, {
            postId: input.postId,
            userId: input.userId,
          });

          const [deletedFavour] = await db
            .delete(postFavours)
            .where(
              and(
                eq(postFavours.postId, BigInt(input.postId)),
                eq(postFavours.userId, input.userId)
              )
            )
            .returning();

          ctx.logger.info(
            { favourId: deletedFavour.id, postId: input.postId, userId: input.userId },
            '取消收藏成功'
          );

          return { success: true, id: deletedFavour.id };
        } catch (error) {
          ctx.logger.error({ postId: input.postId, userId: input.userId, error }, '取消收藏失败');
          throw error;
        }
      }),

    check: publicProcedure
      .input(
        z.object({
          postId: z.number(),
          userId: z.string(),
        })
      )
      .query(async ({ ctx, input }) => {
        ctx.logger.debug({ postId: input.postId, userId: input.userId }, '检查是否已收藏');

        const [favour] = await db
          .select()
          .from(postFavours)
          .where(
            and(eq(postFavours.postId, BigInt(input.postId)), eq(postFavours.userId, input.userId))
          )
          .limit(1);

        return { isFavoured: !!favour };
      }),

    getByPostId: publicProcedure
      .input(z.object({ postId: z.number() }))
      .query(async ({ ctx, input }) => {
        ctx.logger.info({ postId: input.postId }, '获取帖子的收藏列表');

        const favours = await db
          .select()
          .from(postFavours)
          .where(eq(postFavours.postId, BigInt(input.postId)));

        ctx.logger.info({ postId: input.postId, count: favours.length }, '获取帖子收藏列表成功');

        return favours;
      }),

    getByUserId: publicProcedure
      .input(z.object({ userId: z.string() }))
      .query(async ({ ctx, input }) => {
        ctx.logger.info({ userId: input.userId }, '获取用户的收藏列表');

        const favours = await db
          .select()
          .from(postFavours)
          .where(eq(postFavours.userId, input.userId));

        ctx.logger.info({ userId: input.userId, count: favours.length }, '获取用户收藏列表成功');

        return favours;
      }),
  }),
});
