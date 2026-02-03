import { router } from '../index';
import { z } from 'zod';
import { protectedProcedure } from '../middleware/auth';
import { db } from '../../index';
import { questionPractices, questions } from '../../db/schema';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { success } from '../../lib/response-wrapper';
import { throwIfNull } from '../../lib/exception';
import { ErrorType } from '../../lib/errors';

export const practiceRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        questionId: z.number(),
        score: z.number().min(0).max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [q] = await db
        .select({ id: questions.id })
        .from(questions)
        .where(and(eq(questions.id, input.questionId), eq(questions.isDelete, false)))
        .limit(1);
      throwIfNull(q, ErrorType.QUESTION_NOT_FOUND, undefined, { id: input.questionId });

      const [row] = await db
        .insert(questionPractices)
        .values({
          userId: ctx.user.id,
          questionId: input.questionId,
          score: input.score ?? null,
        })
        .returning();

      return success(
        {
          id: row?.id ? String(row.id) : null,
          questionId: row?.questionId ?? input.questionId,
          doneAt: row?.doneAt ?? new Date(),
          score: row?.score ?? input.score ?? null,
        },
        '记录练习成功'
      );
    }),

  getDailyCounts: protectedProcedure
    .input(
      z.object({
        days: z.number().min(7).max(365).default(365),
      })
    )
    .query(async ({ ctx, input }) => {
      const from = new Date();
      from.setDate(from.getDate() - (input.days - 1));
      from.setHours(0, 0, 0, 0);

      const rows = await db
        .select({
          day: sql<string>`to_char(date_trunc('day', ${questionPractices.doneAt}), 'YYYY-MM-DD')`,
          count: sql<number>`count(*)`,
        })
        .from(questionPractices)
        .where(and(eq(questionPractices.userId, ctx.user.id), gte(questionPractices.doneAt, from)))
        .groupBy(sql`date_trunc('day', ${questionPractices.doneAt})`)
        .orderBy(sql`date_trunc('day', ${questionPractices.doneAt})`);

      return success(rows, '获取练习贡献数据成功');
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const [totalRes, recentRes] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(questionPractices)
        .where(eq(questionPractices.userId, ctx.user.id)),
      db
        .select({
          questionId: questionPractices.questionId,
          doneAt: questionPractices.doneAt,
          score: questionPractices.score,
        })
        .from(questionPractices)
        .where(eq(questionPractices.userId, ctx.user.id))
        .orderBy(desc(questionPractices.doneAt))
        .limit(10),
    ]);

    const total = totalRes?.[0]?.count ?? 0;
    return success({ total, recent: recentRes }, '获取练习统计成功');
  }),
});
