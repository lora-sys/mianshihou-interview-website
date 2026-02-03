import { router } from '../index';
import { z } from 'zod';
import { protectedProcedure } from '../middleware/auth';
import { db } from '../../index';
import { questionFavours, questions, users } from '../../db/schema';
import { and, desc, eq, sql } from 'drizzle-orm';
import { success, paginate, createPaginationMeta } from '../../lib/response-wrapper';
import { throwIfNull } from '../../lib/exception';
import { ErrorType } from '../../lib/errors';

export const questionFavourRouter = router({
  toggle: protectedProcedure
    .input(z.object({ questionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [q] = await db
        .select({ id: questions.id })
        .from(questions)
        .where(and(eq(questions.id, input.questionId), eq(questions.isDelete, false)))
        .limit(1);
      throwIfNull(q, ErrorType.QUESTION_NOT_FOUND, undefined, { id: input.questionId });

      const [existing] = await db
        .select()
        .from(questionFavours)
        .where(
          and(
            eq(questionFavours.userId, ctx.user.id),
            eq(questionFavours.questionId, input.questionId)
          )
        )
        .limit(1);

      if (existing) {
        await db
          .delete(questionFavours)
          .where(
            and(
              eq(questionFavours.userId, ctx.user.id),
              eq(questionFavours.questionId, input.questionId)
            )
          );
        return success({ isFavour: false }, '已取消收藏');
      }

      await db
        .insert(questionFavours)
        .values({ userId: ctx.user.id, questionId: input.questionId });
      return success({ isFavour: true }, '已收藏');
    }),

  check: protectedProcedure
    .input(z.object({ questionId: z.number() }))
    .query(async ({ ctx, input }) => {
      const [row] = await db
        .select({ id: questionFavours.id })
        .from(questionFavours)
        .where(
          and(
            eq(questionFavours.userId, ctx.user.id),
            eq(questionFavours.questionId, input.questionId)
          )
        )
        .limit(1);
      return success({ isFavour: !!row }, '查询收藏状态成功');
    }),

  listMy: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.pageSize;

      const [rows, totalRes] = await Promise.all([
        db
          .select({
            id: sql<string>`(${questionFavours.id})::text`,
            createTime: questionFavours.createTime,
            questionId: questions.id,
            title: questions.title,
            content: questions.content,
            tags: questions.tags,
            questionBankId: questions.questionBankId,
            isSystem: sql<boolean>`(${users.userRole} = 'admin')`,
          })
          .from(questionFavours)
          .innerJoin(questions, eq(questionFavours.questionId, questions.id))
          .innerJoin(users, eq(questions.userId, users.id))
          .where(and(eq(questionFavours.userId, ctx.user.id), eq(questions.isDelete, false)))
          .orderBy(desc(questionFavours.createTime))
          .offset(offset)
          .limit(input.pageSize),
        db
          .select({ count: sql<number>`count(*)` })
          .from(questionFavours)
          .innerJoin(questions, eq(questionFavours.questionId, questions.id))
          .where(and(eq(questionFavours.userId, ctx.user.id), eq(questions.isDelete, false))),
      ]);

      const total = Number((totalRes?.[0] as any)?.count ?? 0);
      const pagination = createPaginationMeta(input.page, input.pageSize, total);
      return paginate(rows, pagination, '获取我的收藏成功');
    }),
});
