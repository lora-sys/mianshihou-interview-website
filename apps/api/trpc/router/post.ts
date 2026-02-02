import { router, publicProcedure } from '../index';
import { z } from 'zod';
import { posts } from '../../db/schema';
import { eq, desc, and, like, sql } from 'drizzle-orm';
import { db } from '../../index';
import { throwIfNull, throwIf, throwIfNot } from '../../lib/exception';
import { ErrorType } from '../../lib/errors';
import { success, paginate, createPaginationMeta } from '../../lib/response-wrapper';
import { transformPost, transformPosts } from '../../lib/field-transformer';

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

          // 转换字段命名并包装响应
          const transformedPost = transformPost(newPost);
          return success(transformedPost, '帖子创建成功');
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

        return success({ id: deletedPost.id }, '帖子删除成功');
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

          // 转换字段命名并包装响应
          const transformedPost = transformPost(updatedPost);
          return success(transformedPost, '帖子更新成功');
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

      // 转换字段命名并包装响应
      const transformedPost = transformPost(post);
      return success(transformedPost, '查询帖子成功');
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

        // 转换字段命名并包装分页响应
        const transformedPosts = transformPosts(data);
        const pagination = createPaginationMeta(input.page, input.pageSize, totalResult.length);
        return paginate(transformedPosts, pagination, '查询帖子列表成功');
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

          // 转换字段命名并包装响应
          const transformedPost = transformPost(updatedPost);
          return success(transformedPost, '点赞数更新成功');
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

          // 转换字段命名并包装响应
          const transformedPost = transformPost(updatedPost);
          return success(transformedPost, '收藏数更新成功');
        } catch (error) {
          ctx.logger.error(
            { postId: input.id, increment: input.increment, error },
            '更新帖子收藏数失败'
          );
          throw error;
        }
      }),

    // List posts with user thumb/favour status
    listWithUserStatus: publicProcedure
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
          '查询帖子列表和用户状态'
        );

        const offset = (input.page - 1) * input.pageSize;

        const conditions = [eq(posts.isDelete, false)];

        if (input.title) {
          conditions.push(like(posts.title, `%${input.title}%`));
        }
        if (input.userId) {
          conditions.push(eq(posts.userId, input.userId));
        }

        // 并行查询帖子列表和总数
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
          '查询帖子列表成功，开始查询用户状态'
        );

        // 获取当前用户 ID（如果已登录）
        const currentUserId = ctx.user?.id;

        let thumbs: any[] = [];
        let favours: any[] = [];

        // 如果用户已登录，并行查询点赞和收藏状态
        if (currentUserId) {
          [thumbs, favours] = await Promise.all([
            db.select().from(postThumbs).where(eq(postThumbs.userId, currentUserId)),
            db.select().from(postFavours).where(eq(postFavours.userId, currentUserId)),
          ]);
        }

        // 组合结果
        const postsWithStatus = data.map((post) => ({
          ...post,
          isThumbed: currentUserId ? thumbs.some((t) => t.postId === post.id) : false,
          isFavoured: currentUserId ? favours.some((f) => f.postId === post.id) : false,
        }));

        // 转换字段命名并包装分页响应
        const transformedPosts = transformPosts(postsWithStatus);
        const pagination = createPaginationMeta(input.page, input.pageSize, totalResult.length);
        return success(
          {
            items: transformedPosts,
            pagination,
          },
          '查询帖子列表和用户状态成功'
        );
      }),
  }),
});
