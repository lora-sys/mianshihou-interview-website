import { router, publicProcedure } from '../index';
import { z } from 'zod';
import { postThumbs } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { db } from '../../index';
import { throwIfNull, throwIf } from '../../lib/exception';
import { ErrorType } from '../../lib/errors';

export const postThumbRouter = router({
  postThumbs: router({
    create: publicProcedure
      .input(
        z.object({
          postId: z.number(),
          userId: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        ctx.logger.info({ postId: input.postId, userId: input.userId }, '点赞帖子开始');

        try {
          const [existingThumb] = await db
            .select()
            .from(postThumbs)
            .where(
              and(eq(postThumbs.postId, BigInt(input.postId)), eq(postThumbs.userId, input.userId))
            )
            .limit(1);

          throwIf(!!existingThumb, ErrorType.DUPLICATE_OPERATION, '已经点赞过了');

          const [newThumb] = await db
            .insert(postThumbs)
            .values({
              postId: BigInt(input.postId),
              userId: input.userId,
            })
            .returning();

          ctx.logger.info(
            { thumbId: newThumb.id, postId: input.postId, userId: input.userId },
            '点赞帖子成功'
          );

          return newThumb;
        } catch (error) {
          ctx.logger.error({ postId: input.postId, userId: input.userId, error }, '点赞帖子失败');
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
        ctx.logger.info({ postId: input.postId, userId: input.userId }, '取消点赞开始');

        try {
          const [thumb] = await db
            .select()
            .from(postThumbs)
            .where(
              and(eq(postThumbs.postId, BigInt(input.postId)), eq(postThumbs.userId, input.userId))
            )
            .limit(1);

          throwIfNull(thumb, ErrorType.RESOURCE_NOT_FOUND, undefined, {
            postId: input.postId,
            userId: input.userId,
          });

          const [deletedThumb] = await db
            .delete(postThumbs)
            .where(
              and(eq(postThumbs.postId, BigInt(input.postId)), eq(postThumbs.userId, input.userId))
            )
            .returning();

          ctx.logger.info(
            { thumbId: deletedThumb.id, postId: input.postId, userId: input.userId },
            '取消点赞成功'
          );

          return { success: true, id: deletedThumb.id };
        } catch (error) {
          ctx.logger.error({ postId: input.postId, userId: input.userId, error }, '取消点赞失败');
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
        ctx.logger.debug({ postId: input.postId, userId: input.userId }, '检查是否已点赞');

        const [thumb] = await db
          .select()
          .from(postThumbs)
          .where(
            and(eq(postThumbs.postId, BigInt(input.postId)), eq(postThumbs.userId, input.userId))
          )
          .limit(1);

        return { isLiked: !!thumb };
      }),

    getByPostId: publicProcedure
      .input(z.object({ postId: z.number() }))
      .query(async ({ ctx, input }) => {
        ctx.logger.info({ postId: input.postId }, '获取帖子的点赞列表');

        const thumbs = await db
          .select()
          .from(postThumbs)
          .where(eq(postThumbs.postId, BigInt(input.postId)));

        ctx.logger.info({ postId: input.postId, count: thumbs.length }, '获取帖子点赞列表成功');

        return thumbs;
      }),

    getByUserId: publicProcedure
      .input(z.object({ userId: z.string() }))
      .query(async ({ ctx, input }) => {
        ctx.logger.info({ userId: input.userId }, '获取用户的点赞列表');

        const thumbs = await db
          .select()
          .from(postThumbs)
          .where(eq(postThumbs.userId, input.userId));

        ctx.logger.info({ userId: input.userId, count: thumbs.length }, '获取用户点赞列表成功');

        return thumbs;
      }),
  }),
});
