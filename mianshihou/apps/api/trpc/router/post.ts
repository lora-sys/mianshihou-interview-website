import { router, publicProcedure } from '../index';
import { z } from 'zod';
import { posts } from '../../db/schema';
import { eq, desc, and, like, sql } from 'drizzle-orm';
import { db } from '../../index';
import { throwIfNull, throwIf, throwIfNot } from '../../lib/exception';
import { ErrorType } from '../../lib/errors';

export const postRouter = router({
  posts: router({
    create: publicProcedure
      .input(
        z.object({
          title: z.string().min(1, { message: '标题不能为空' }),
          content: z.string().min(1, { message: '内容不能为空' }),
          tags: z.string().optional(),
          userId: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        ctx.logger.info({ title: input.title, userId: input.userId }, '创建帖子开始');

        try {
          const [newPost] = await db
            .insert(posts)
            .values({
              title: input.title,
              content: input.content,
              tags: input.tags,
              userId: input.userId,
              thumbNum: 0,
              favourNum: 0,
            })
            .returning();

          ctx.logger.info({ postId: newPost.id, title: newPost.title }, '帖子创建成功');

          return newPost;
        } catch (error) {
          ctx.logger.error({ title: input.title, error }, '创建帖子失败');
          throw error;
        }
      }),

    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      ctx.logger.info({ postId: input.id }, '删除帖子开始');

      try {
        const [post] = await db
          .select()
          .from(posts)
          .where(and(eq(posts.id, BigInt(input.id)), eq(posts.isDelete, false)))
          .limit(1);

        throwIfNull(post, ErrorType.RESOURCE_NOT_FOUND, undefined, {
          postId: input.id,
        });

        const [deletedPost] = await db
          .update(posts)
          .set({ isDelete: true, updateTime: new Date() })
          .where(eq(posts.id, BigInt(input.id)))
          .returning();

        ctx.logger.info({ postId: deletedPost.id }, '帖子删除成功');

        return { success: true, id: deletedPost.id };
      } catch (error) {
        ctx.logger.error({ postId: input.id, error }, '删除帖子失败');
        throw error;
      }
    }),

    update: publicProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().min(1, { message: '标题不能为空' }).optional(),
          content: z.string().min(1, { message: '内容不能为空' }).optional(),
          tags: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        ctx.logger.info({ postId: input.id }, '更新帖子开始');

        try {
          const { id, ...updateData } = input;

          const [post] = await db
            .select()
            .from(posts)
            .where(and(eq(posts.id, BigInt(id)), eq(posts.isDelete, false)))
            .limit(1);

          throwIfNull(post, ErrorType.RESOURCE_NOT_FOUND, undefined, {
            postId: input.id,
          });

          const hasUpdates = Object.keys(updateData).length > 0;
          throwIf(!hasUpdates, ErrorType.INVALID_PARAMS, '没有提供需要更新的字段');

          const [updatedPost] = await db
            .update(posts)
            .set({ ...updateData, updateTime: new Date() })
            .where(eq(posts.id, BigInt(id)))
            .returning();

          ctx.logger.info(
            { postId: updatedPost.id, updatedFields: Object.keys(updateData) },
            '帖子更新成功'
          );

          return updatedPost;
        } catch (error) {
          ctx.logger.error({ postId: input.id, error }, '更新帖子失败');
          throw error;
        }
      }),

    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
      ctx.logger.info({ postId: input.id }, '根据ID查询帖子');

      const [post] = await db
        .select()
        .from(posts)
        .where(and(eq(posts.id, BigInt(input.id)), eq(posts.isDelete, false)))
        .limit(1);

      throwIfNull(post, ErrorType.RESOURCE_NOT_FOUND, undefined, {
        postId: input.id,
      });

      ctx.logger.info({ postId: input.id, title: post.title }, '查询帖子成功');

      return post;
    }),

    list: publicProcedure
      .input(
        z.object({
          page: z.number().min(1).default(1),
          pageSize: z.number().min(1).max(100).default(10),
          title: z.string().optional(),
          userId: z.string().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        ctx.logger.info(
          { page: input.page, pageSize: input.pageSize, title: input.title, userId: input.userId },
          '查询帖子列表'
        );

        const offset = (input.page - 1) * input.pageSize;

        const conditions = [eq(posts.isDelete, false)];

        if (input.title) {
          conditions.push(like(posts.title, `%${input.title}%`));
        }
        if (input.userId) {
          conditions.push(eq(posts.userId, input.userId));
        }

        const [data, totalResult] = await Promise.all([
          db
            .select()
            .from(posts)
            .where(and(...conditions))
            .offset(offset)
            .limit(input.pageSize)
            .orderBy(desc(posts.createTime)),
          db
            .select()
            .from(posts)
            .where(and(...conditions)),
        ]);

        ctx.logger.info(
          { count: data.length, total: totalResult.length, page: input.page },
          '查询帖子列表成功'
        );

        return {
          data,
          total: totalResult.length,
          page: input.page,
          pageSize: input.pageSize,
          totalPages: Math.ceil(totalResult.length / input.pageSize),
        };
      }),

    updateThumbNum: publicProcedure
      .input(
        z.object({
          id: z.number(),
          increment: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        ctx.logger.info({ postId: input.id, increment: input.increment }, '更新帖子点赞数');

        try {
          const [post] = await db
            .select()
            .from(posts)
            .where(and(eq(posts.id, BigInt(input.id)), eq(posts.isDelete, false)))
            .limit(1);

          throwIfNull(post, ErrorType.RESOURCE_NOT_FOUND, undefined, {
            postId: input.id,
          });

          const [updatedPost] = await db
            .update(posts)
            .set({
              thumbNum: sql`${posts.thumbNum} + ${input.increment}`,
              updateTime: new Date(),
            })
            .where(eq(posts.id, BigInt(input.id)))
            .returning();

          ctx.logger.info(
            { postId: updatedPost.id, newThumbNum: updatedPost.thumbNum },
            '帖子点赞数更新成功'
          );

          return updatedPost;
        } catch (error) {
          ctx.logger.error(
            { postId: input.id, increment: input.increment, error },
            '更新帖子点赞数失败'
          );
          throw error;
        }
      }),

    updateFavourNum: publicProcedure
      .input(
        z.object({
          id: z.number(),
          increment: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        ctx.logger.info({ postId: input.id, increment: input.increment }, '更新帖子收藏数');

        try {
          const [post] = await db
            .select()
            .from(posts)
            .where(and(eq(posts.id, BigInt(input.id)), eq(posts.isDelete, false)))
            .limit(1);

          throwIfNull(post, ErrorType.RESOURCE_NOT_FOUND, undefined, {
            postId: input.id,
          });

          const [updatedPost] = await db
            .update(posts)
            .set({
              favourNum: sql`${posts.favourNum} + ${input.increment}`,
              updateTime: new Date(),
            })
            .where(eq(posts.id, BigInt(input.id)))
            .returning();

          ctx.logger.info(
            { postId: updatedPost.id, newFavourNum: updatedPost.favourNum },
            '帖子收藏数更新成功'
          );

          return updatedPost;
        } catch (error) {
          ctx.logger.error(
            { postId: input.id, increment: input.increment, error },
            '更新帖子收藏数失败'
          );
          throw error;
        }
      }),
  }),
});
