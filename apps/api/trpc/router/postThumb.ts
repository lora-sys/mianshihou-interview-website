import { router, publicProcedure } from '../index';
import { z } from 'zod';
import { postThumbs } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { db } from '../../index';
import { throwIfNull, throwIf } from '../../lib/exception';
import { ErrorType } from '../../lib/errors';
import { success } from '../../lib/response-wrapper';

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
          const { withTransaction } = await import('../../lib/transaction');
          const { posts } = await import('../../db/schema');
          const { sql } = await import('drizzle-orm');

          const result = await withTransaction(
            async ({ tx }) => {
              // 检查是否已点赞
              const [existingThumb] = await tx
                .select()
                .from(postThumbs)
                .where(
                  and(
                    eq(postThumbs.postId, BigInt(input.postId)),
                    eq(postThumbs.userId, input.userId)
                  )
                )
                .limit(1);

              throwIf(!!existingThumb, ErrorType.DUPLICATE_OPERATION, '已经点赞过了');

              // 添加点赞记录
              const [newThumb] = await tx
                .insert(postThumbs)
                .values({
                  postId: BigInt(input.postId),
                  userId: input.userId,
                })
                .returning();

              // 更新帖子点赞数
              await tx
                .update(posts)
                .set({
                  thumbNum: sql`${posts.thumbNum} + 1`,
                  updateTime: new Date(),
                })
                .where(eq(posts.id, BigInt(input.postId)));

              return newThumb;
            },
            { logger: ctx.logger, operationName: 'createPostThumb' }
          );

          ctx.logger.info(
            { thumbId: result.id, postId: input.postId, userId: input.userId },
            '点赞帖子成功'
          );

          return success(result, '点赞成功');
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
          const { withTransaction } = await import('../../lib/transaction');
          const { posts } = await import('../../db/schema');
          const { sql } = await import('drizzle-orm');

          const result = await withTransaction(
            async ({ tx }) => {
              // 检查点赞记录是否存在
              const [thumb] = await tx
                .select()
                .from(postThumbs)
                .where(
                  and(
                    eq(postThumbs.postId, BigInt(input.postId)),
                    eq(postThumbs.userId, input.userId)
                  )
                )
                .limit(1);

              throwIfNull(thumb, ErrorType.RESOURCE_NOT_FOUND, undefined, {
                postId: input.postId,
                userId: input.userId,
              });

              // 删除点赞记录
              const [deletedThumb] = await tx
                .delete(postThumbs)
                .where(
                  and(
                    eq(postThumbs.postId, BigInt(input.postId)),
                    eq(postThumbs.userId, input.userId)
                  )
                )
                .returning();

              // 更新帖子点赞数
              await tx
                .update(posts)
                .set({
                  thumbNum: sql`${posts.thumbNum} - 1`,
                  updateTime: new Date(),
                })
                .where(eq(posts.id, BigInt(input.postId)));

              return deletedThumb;
            },
            { logger: ctx.logger, operationName: 'deletePostThumb' }
          );

          ctx.logger.info(
            { thumbId: result.id, postId: input.postId, userId: input.userId },
            '取消点赞成功'
          );

          return success({ id: result.id }, '取消点赞成功');
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

        return success({ isLiked: !!thumb }, '检查点赞状态成功');
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

        return success(thumbs, '获取点赞列表成功');
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

        return success(thumbs, '获取用户点赞列表成功');
      }),
  }),
});
