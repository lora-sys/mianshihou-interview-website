import { router, publicProcedure } from '../index';
import { z } from 'zod';
import { db } from '../../index';
import { questionBanks, questions, users } from '../../db/schema';
import { and, desc, eq, like, or } from 'drizzle-orm';
import { paginate, createPaginationMeta, success } from '../../lib/response-wrapper';
import { throwIfNull } from '../../lib/exception';
import { ErrorType } from '../../lib/errors';

function systemOwnerCondition() {
  return and(eq(users.isDelete, false), eq(users.status, 'active'), eq(users.userRole, 'admin'));
}

export const exploreRouter = router({
  questionBanks: router({
    list: publicProcedure
      .input(
        z.object({
          page: z.number().min(1).default(1),
          pageSize: z.number().min(1).max(100).default(10),
          title: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        const offset = (input.page - 1) * input.pageSize;
        const conditions = [eq(questionBanks.isDelete, false), systemOwnerCondition()];
        if (input.title) {
          conditions.push(
            or(
              like(questionBanks.title, `%${input.title}%`),
              like(questionBanks.description, `%${input.title}%`)
            )
          );
        }

        const [data, totalResult] = await Promise.all([
          db
            .select({
              id: questionBanks.id,
              title: questionBanks.title,
              description: questionBanks.description,
              picture: questionBanks.picture,
              userId: questionBanks.userId,
              questionCount: questionBanks.questionCount,
              createTime: questionBanks.createTime,
              updateTime: questionBanks.updateTime,
            })
            .from(questionBanks)
            .innerJoin(users, eq(questionBanks.userId, users.id))
            .where(and(...conditions))
            .orderBy(desc(questionBanks.updateTime))
            .offset(offset)
            .limit(input.pageSize),
          db
            .select({ id: questionBanks.id })
            .from(questionBanks)
            .innerJoin(users, eq(questionBanks.userId, users.id))
            .where(and(...conditions)),
        ]);

        const pagination = createPaginationMeta(input.page, input.pageSize, totalResult.length);
        return paginate(data, pagination, '获取系统题库列表成功');
      }),

    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const [row] = await db
        .select({
          id: questionBanks.id,
          title: questionBanks.title,
          description: questionBanks.description,
          picture: questionBanks.picture,
          userId: questionBanks.userId,
          questionCount: questionBanks.questionCount,
          createTime: questionBanks.createTime,
          updateTime: questionBanks.updateTime,
        })
        .from(questionBanks)
        .innerJoin(users, eq(questionBanks.userId, users.id))
        .where(
          and(
            eq(questionBanks.id, input.id),
            eq(questionBanks.isDelete, false),
            systemOwnerCondition()
          )
        )
        .limit(1);

      throwIfNull(row, ErrorType.RESOURCE_NOT_FOUND, undefined, { id: input.id });
      return success(row, '获取系统题库成功');
    }),

    getQuestions: publicProcedure
      .input(
        z.object({
          questionBankId: z.number(),
          page: z.number().min(1).default(1),
          pageSize: z.number().min(1).max(100).default(10),
          title: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        const offset = (input.page - 1) * input.pageSize;
        const conditions = [
          eq(questions.isDelete, false),
          eq(questions.questionBankId, input.questionBankId),
          systemOwnerCondition(),
        ];
        if (input.title) {
          conditions.push(
            or(like(questions.title, `%${input.title}%`), like(questions.tags, `%${input.title}%`))
          );
        }

        const [data, totalResult] = await Promise.all([
          db
            .select({
              id: questions.id,
              title: questions.title,
              content: questions.content,
              tags: questions.tags,
              userId: questions.userId,
              questionBankId: questions.questionBankId,
              createTime: questions.createTime,
              updateTime: questions.updateTime,
            })
            .from(questions)
            .innerJoin(users, eq(questions.userId, users.id))
            .where(and(...conditions))
            .orderBy(desc(questions.updateTime))
            .offset(offset)
            .limit(input.pageSize),
          db
            .select({ id: questions.id })
            .from(questions)
            .innerJoin(users, eq(questions.userId, users.id))
            .where(and(...conditions)),
        ]);

        const pagination = createPaginationMeta(input.page, input.pageSize, totalResult.length);
        return paginate(data, pagination, '获取系统题库题目成功');
      }),

    getRecent: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(50).default(10) }))
      .query(async ({ input }) => {
        const rows = await db
          .select({
            id: questionBanks.id,
            title: questionBanks.title,
            description: questionBanks.description,
            picture: questionBanks.picture,
            userId: questionBanks.userId,
            questionCount: questionBanks.questionCount,
            createTime: questionBanks.createTime,
            updateTime: questionBanks.updateTime,
          })
          .from(questionBanks)
          .innerJoin(users, eq(questionBanks.userId, users.id))
          .where(and(eq(questionBanks.isDelete, false), systemOwnerCondition()))
          .orderBy(desc(questionBanks.updateTime))
          .limit(input.limit);
        return success(rows, '获取系统最近题库成功');
      }),
  }),

  questions: router({
    list: publicProcedure
      .input(
        z.object({
          page: z.number().min(1).default(1),
          pageSize: z.number().min(1).max(100).default(10),
          title: z.string().optional(),
          questionBankId: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        const offset = (input.page - 1) * input.pageSize;
        const conditions = [eq(questions.isDelete, false), systemOwnerCondition()];
        if (input.title) {
          conditions.push(
            or(like(questions.title, `%${input.title}%`), like(questions.tags, `%${input.title}%`))
          );
        }
        if (input.questionBankId)
          conditions.push(eq(questions.questionBankId, input.questionBankId));

        const [data, totalResult] = await Promise.all([
          db
            .select({
              id: questions.id,
              title: questions.title,
              content: questions.content,
              tags: questions.tags,
              userId: questions.userId,
              questionBankId: questions.questionBankId,
              createTime: questions.createTime,
              updateTime: questions.updateTime,
            })
            .from(questions)
            .innerJoin(users, eq(questions.userId, users.id))
            .where(and(...conditions))
            .orderBy(desc(questions.updateTime))
            .offset(offset)
            .limit(input.pageSize),
          db
            .select({ id: questions.id })
            .from(questions)
            .innerJoin(users, eq(questions.userId, users.id))
            .where(and(...conditions)),
        ]);

        const pagination = createPaginationMeta(input.page, input.pageSize, totalResult.length);
        return paginate(data, pagination, '获取系统题目列表成功');
      }),

    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const [row] = await db
        .select({
          id: questions.id,
          title: questions.title,
          content: questions.content,
          tags: questions.tags,
          userId: questions.userId,
          questionBankId: questions.questionBankId,
          createTime: questions.createTime,
          updateTime: questions.updateTime,
        })
        .from(questions)
        .innerJoin(users, eq(questions.userId, users.id))
        .where(
          and(eq(questions.id, input.id), eq(questions.isDelete, false), systemOwnerCondition())
        )
        .limit(1);

      throwIfNull(row, ErrorType.RESOURCE_NOT_FOUND, undefined, { id: input.id });
      return success(row, '获取系统题目成功');
    }),

    getRecent: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(50).default(10) }))
      .query(async ({ input }) => {
        const rows = await db
          .select({
            id: questions.id,
            title: questions.title,
            content: questions.content,
            tags: questions.tags,
            userId: questions.userId,
            questionBankId: questions.questionBankId,
            createTime: questions.createTime,
            updateTime: questions.updateTime,
          })
          .from(questions)
          .innerJoin(users, eq(questions.userId, users.id))
          .where(and(eq(questions.isDelete, false), systemOwnerCondition()))
          .orderBy(desc(questions.updateTime))
          .limit(input.limit);
        return success(rows, '获取系统最近题目成功');
      }),
  }),
});
