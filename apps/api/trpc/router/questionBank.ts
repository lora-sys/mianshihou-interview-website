import { router, publicProcedure } from '../index';
import { protectedProcedure } from '../middleware/auth';
import { z } from 'zod';
import { questionBanks, questionBankQuestions, questions } from '../../db/schema';
import { eq, desc, and, like, sql, inArray } from 'drizzle-orm';
import { db } from '../../index';
import { throwIfNull, throwIf, throwIfNot } from '../../lib/exception';
import { ErrorType } from '../../lib/errors';
import { success, paginate, createPaginationMeta } from '../../lib/response-wrapper';

function isAdmin(ctx: any) {
  return ctx.user?.userRole === 'admin';
}

export const questionBankRouter = router({
  getRecent: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(20).default(5),
      })
    )
    .query(async ({ ctx, input }) => {
      ctx.logger.info({ limit: input.limit }, '获取最近题库列表开始');

      try {
        const bankConditions = [eq(questionBanks.isDelete, false)];
        if (!isAdmin(ctx)) {
          bankConditions.push(eq(questionBanks.userId, ctx.user.id));
        }

        const recentBanks = await db
          .select()
          .from(questionBanks)
          .where(and(...bankConditions))
          .orderBy(desc(questionBanks.createTime))
          .limit(input.limit);

        ctx.logger.info({ count: recentBanks.length }, '获取最近题库列表成功');

        const banksWithCount = recentBanks.map((bank) => ({
          ...bank,
          questionCount: bank.questionCount ?? 0,
        }));

        return success(banksWithCount, '获取最近题库列表成功');
      } catch (error) {
        ctx.logger.error({ error }, '获取最近题库列表失败');
        throw error;
      }
    }),

  questionBanks: router({
    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1, { message: '标题不能为空' }),
          description: z.string().optional(),
          picture: z.string().optional(),
          userId: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        ctx.logger.info({ title: input.title, userId }, '创建题库开始');

        try {
          const [newQuestionBank] = await db
            .insert(questionBanks)
            .values({
              title: input.title,
              description: input.description,
              picture: input.picture,
              userId,
            })
            .returning();

          ctx.logger.info(
            { questionBankId: newQuestionBank.id, title: newQuestionBank.title },
            '题库创建成功'
          );

          return success(newQuestionBank, '题库创建成功');
        } catch (error) {
          ctx.logger.error({ title: input.title, error }, '创建题库失败');
          throw error;
        }
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        ctx.logger.info({ questionBankId: input.id }, '删除题库开始');

        try {
          const conditions = [eq(questionBanks.id, input.id), eq(questionBanks.isDelete, false)];
          if (!isAdmin(ctx)) {
            conditions.push(eq(questionBanks.userId, ctx.user.id));
          }

          const [questionBank] = await db
            .select()
            .from(questionBanks)
            .where(and(...conditions))
            .limit(1);

          throwIfNull(questionBank, ErrorType.RESOURCE_NOT_FOUND, undefined, {
            questionBankId: input.id,
          });

          const [deletedQuestionBank] = await db
            .update(questionBanks)
            .set({ isDelete: true, updateTime: new Date() })
            .where(and(...conditions))
            .returning();

          ctx.logger.info({ questionBankId: deletedQuestionBank.id }, '题库删除成功');

          return success({ id: deletedQuestionBank.id }, '题库删除成功');
        } catch (error) {
          ctx.logger.error({ questionBankId: input.id, error }, '删除题库失败');
          throw error;
        }
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().min(1, { message: '标题不能为空' }).optional(),
          description: z.string().optional(),
          picture: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        ctx.logger.info({ questionBankId: input.id }, '更新题库开始');

        try {
          const { id, ...updateData } = input;

          const conditions = [eq(questionBanks.id, id), eq(questionBanks.isDelete, false)];
          if (!isAdmin(ctx)) {
            conditions.push(eq(questionBanks.userId, ctx.user.id));
          }

          const [questionBank] = await db
            .select()
            .from(questionBanks)
            .where(and(...conditions))
            .limit(1);

          throwIfNull(questionBank, ErrorType.RESOURCE_NOT_FOUND, undefined, {
            questionBankId: input.id,
          });

          const hasUpdates = Object.keys(updateData).length > 0;
          throwIf(!hasUpdates, ErrorType.INVALID_PARAMS, '没有提供需要更新的字段');

          const [updatedQuestionBank] = await db
            .update(questionBanks)
            .set({ ...updateData, updateTime: new Date() })
            .where(and(...conditions))
            .returning();

          ctx.logger.info(
            { questionBankId: updatedQuestionBank.id, updatedFields: Object.keys(updateData) },
            '题库更新成功'
          );

          return success(updatedQuestionBank, '题库更新成功');
        } catch (error) {
          ctx.logger.error({ questionBankId: input.id, error }, '更新题库失败');
          throw error;
        }
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        ctx.logger.info({ questionBankId: input.id }, '根据ID查询题库');

        const conditions = [eq(questionBanks.id, input.id), eq(questionBanks.isDelete, false)];
        if (!isAdmin(ctx)) {
          conditions.push(eq(questionBanks.userId, ctx.user.id));
        }

        const [questionBank] = await db
          .select()
          .from(questionBanks)
          .where(and(...conditions))
          .limit(1);

        throwIfNull(questionBank, ErrorType.RESOURCE_NOT_FOUND, undefined, {
          questionBankId: input.id,
        });

        ctx.logger.info({ questionBankId: input.id, title: questionBank.title }, '查询题库成功');

        return success(questionBank, '查询题库成功');
      }),

    list: protectedProcedure
      .input(
        z.object({
          page: z.number().min(1).default(1),
          pageSize: z.number().min(1).max(100).default(10),
          title: z.string().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        ctx.logger.info(
          { page: input.page, pageSize: input.pageSize, title: input.title },
          '查询题库列表'
        );

        const offset = (input.page - 1) * input.pageSize;

        const conditions = [eq(questionBanks.isDelete, false)];
        if (!isAdmin(ctx)) {
          conditions.push(eq(questionBanks.userId, ctx.user.id));
        }

        if (input.title) {
          conditions.push(like(questionBanks.title, `%${input.title}%`));
        }

        const [data, totalResult] = await Promise.all([
          db
            .select()
            .from(questionBanks)
            .where(and(...conditions))
            .offset(offset)
            .limit(input.pageSize)
            .orderBy(desc(questionBanks.createTime)),
          db
            .select()
            .from(questionBanks)
            .where(and(...conditions)),
        ]);

        ctx.logger.info(
          { count: data.length, total: totalResult.length, page: input.page },
          '查询题库列表成功'
        );

        const pagination = createPaginationMeta(input.page, input.pageSize, totalResult.length);
        return paginate(data, pagination, '查询题库列表成功');
      }),

    addQuestion: protectedProcedure
      .input(
        z.object({
          questionBankId: z.number(),
          questionId: z.number(),
          userId: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        ctx.logger.info(
          {
            questionBankId: input.questionBankId,
            questionId: input.questionId,
            userId,
          },
          '添加题目到题库开始'
        );

        try {
          const { withTransaction } = await import('../../lib/transaction');

          const result = await withTransaction(
            async ({ tx }) => {
              const bankConditions = [
                eq(questionBanks.id, input.questionBankId),
                eq(questionBanks.isDelete, false),
              ];
              const questionConditions = [
                eq(questions.id, input.questionId),
                eq(questions.isDelete, false),
              ];
              if (!isAdmin(ctx)) {
                bankConditions.push(eq(questionBanks.userId, ctx.user.id));
                questionConditions.push(eq(questions.userId, ctx.user.id));
              }

              // 检查题库是否存在
              const [questionBank] = await tx
                .select()
                .from(questionBanks)
                .where(and(...bankConditions))
                .limit(1);

              throwIfNull(questionBank, ErrorType.RESOURCE_NOT_FOUND, undefined, {
                questionBankId: input.questionBankId,
              });

              // 检查题目是否存在
              const [question] = await tx
                .select()
                .from(questions)
                .where(and(...questionConditions))
                .limit(1);

              throwIfNull(question, ErrorType.RESOURCE_NOT_FOUND, undefined, {
                questionId: input.questionId,
              });

              // 检查是否已经关联
              const [existingRelation] = await tx
                .select()
                .from(questionBankQuestions)
                .where(
                  and(
                    eq(questionBankQuestions.questionBankId, input.questionBankId),
                    eq(questionBankQuestions.questionId, input.questionId)
                  )
                )
                .limit(1);

              throwIf(!!existingRelation, ErrorType.DUPLICATE_OPERATION, '题目已在该题库中');

              // 添加关联
              const [newRelation] = await tx
                .insert(questionBankQuestions)
                .values({
                  questionBankId: input.questionBankId,
                  questionId: input.questionId,
                  userId,
                })
                .returning();

              // 更新题库的题目数量
              await tx
                .update(questionBanks)
                .set({
                  questionCount: sql`${questionBanks.questionCount} + 1`,
                  updateTime: new Date(),
                })
                .where(and(...bankConditions));

              return newRelation;
            },
            { logger: ctx.logger, operationName: 'addQuestion' }
          );

          ctx.logger.info(
            { questionBankId: input.questionBankId, questionId: input.questionId },
            '题目添加到题库成功'
          );

          return success(result, '题目添加到题库成功');
        } catch (error) {
          ctx.logger.error(
            { questionBankId: input.questionBankId, questionId: input.questionId, error },
            '添加题目到题库失败'
          );
          throw error;
        }
      }),

    removeQuestion: protectedProcedure
      .input(
        z.object({
          questionBankId: z.number(),
          questionId: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        ctx.logger.info(
          { questionBankId: input.questionBankId, questionId: input.questionId },
          '从题库移除题目开始'
        );

        try {
          const { withTransaction } = await import('../../lib/transaction');

          await withTransaction(
            async ({ tx }) => {
              const bankConditions = [
                eq(questionBanks.id, input.questionBankId),
                eq(questionBanks.isDelete, false),
              ];
              if (!isAdmin(ctx)) {
                bankConditions.push(eq(questionBanks.userId, ctx.user.id));
              }

              const [questionBank] = await tx
                .select()
                .from(questionBanks)
                .where(and(...bankConditions))
                .limit(1);

              throwIfNull(questionBank, ErrorType.RESOURCE_NOT_FOUND, undefined, {
                questionBankId: input.questionBankId,
              });

              // 检查关联是否存在
              const [relation] = await tx
                .select()
                .from(questionBankQuestions)
                .where(
                  and(
                    eq(questionBankQuestions.questionBankId, input.questionBankId),
                    eq(questionBankQuestions.questionId, input.questionId)
                  )
                )
                .limit(1);

              throwIfNull(relation, ErrorType.RESOURCE_NOT_FOUND, undefined, {
                questionBankId: input.questionBankId,
                questionId: input.questionId,
              });

              // 删除关联
              await tx
                .delete(questionBankQuestions)
                .where(
                  and(
                    eq(questionBankQuestions.questionBankId, input.questionBankId),
                    eq(questionBankQuestions.questionId, input.questionId)
                  )
                );

              // 更新题库的题目数量
              await tx
                .update(questionBanks)
                .set({
                  questionCount: sql`${questionBanks.questionCount} - 1`,
                  updateTime: new Date(),
                })
                .where(and(...bankConditions));
            },
            { logger: ctx.logger, operationName: 'removeQuestion' }
          );

          ctx.logger.info(
            { questionBankId: input.questionBankId, questionId: input.questionId },
            '从题库移除题目成功'
          );

          return success({}, '从题库移除题目成功');
        } catch (error) {
          ctx.logger.error(
            { questionBankId: input.questionBankId, questionId: input.questionId, error },
            '从题库移除题目失败'
          );
          throw error;
        }
      }),

    getQuestions: protectedProcedure
      .input(
        z.object({
          questionBankId: z.number(),
          page: z.number().min(1).default(1),
          pageSize: z.number().min(1).max(100).default(10),
        })
      )
      .query(async ({ ctx, input }) => {
        ctx.logger.info(
          { questionBankId: input.questionBankId, page: input.page, pageSize: input.pageSize },
          '获取题库的题目列表开始'
        );

        const offset = (input.page - 1) * input.pageSize;

        // 检查题库是否存在
        const bankConditions = [
          eq(questionBanks.id, input.questionBankId),
          eq(questionBanks.isDelete, false),
        ];
        if (!isAdmin(ctx)) {
          bankConditions.push(eq(questionBanks.userId, ctx.user.id));
        }

        const [questionBank] = await db
          .select()
          .from(questionBanks)
          .where(and(...bankConditions))
          .limit(1);

        throwIfNull(questionBank, ErrorType.RESOURCE_NOT_FOUND, undefined, {
          questionBankId: input.questionBankId,
        });

        // 获取题库中的所有题目ID
        const relations = await db
          .select()
          .from(questionBankQuestions)
          .where(eq(questionBankQuestions.questionBankId, input.questionBankId));

        const questionIds = relations.map((r) => r.questionId);

        if (questionIds.length === 0) {
          ctx.logger.info({ questionBankId: input.questionBankId }, '题库中没有题目');
          const pagination = createPaginationMeta(input.page, input.pageSize, 0);
          return paginate([], pagination, '题库中没有题目');
        }

        // 获取题目详情
        const [data, totalResult] = await Promise.all([
          db
            .select()
            .from(questions)
            .where(
              and(
                eq(questions.isDelete, false),
                inArray(questions.id, questionIds),
                ...(isAdmin(ctx) ? [] : [eq(questions.userId, ctx.user.id)])
              )
            )
            .offset(offset)
            .limit(input.pageSize)
            .orderBy(desc(questions.createTime)),
          db
            .select()
            .from(questions)
            .where(
              and(
                eq(questions.isDelete, false),
                inArray(questions.id, questionIds),
                ...(isAdmin(ctx) ? [] : [eq(questions.userId, ctx.user.id)])
              )
            ),
        ]);

        ctx.logger.info(
          { questionBankId: input.questionBankId, count: data.length, total: totalResult.length },
          '获取题库的题目列表成功'
        );

        const pagination = createPaginationMeta(input.page, input.pageSize, totalResult.length);
        return paginate(data, pagination, '获取题库题目列表成功');
      }),
  }),

  batchCreate: protectedProcedure
    .input(
      z.object({
        questionBanks: z
          .array(
            z.object({
              title: z.string().min(1),
              description: z.string().optional(),
              picture: z.string().optional(),
              userId: z.string().optional(),
            })
          )
          .min(1)
          .max(50),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      ctx.logger.info({ count: input.questionBanks.length }, '批量创建题库开始');

      const results = {
        success: [] as number[],
        failed: [] as { title: string; reason: string }[],
      };

      // 并行创建题库
      const createPromises = input.questionBanks.map(async (questionBankData) => {
        try {
          const [newQuestionBank] = await db
            .insert(questionBanks)
            .values({
              title: questionBankData.title,
              description: questionBankData.description,
              picture: questionBankData.picture,
              userId,
            })
            .returning();

          results.success.push(newQuestionBank.id);
          return newQuestionBank.id;
        } catch (error) {
          results.failed.push({
            title: questionBankData.title,
            reason: error instanceof Error ? error.message : '创建失败',
          });
          return null;
        }
      });

      await Promise.all(createPromises);

      ctx.logger.info(
        {
          success: results.success.length,
          failed: results.failed.length,
        },
        '批量创建题库完成'
      );

      return success(
        results,
        `批量创建题库完成：成功 ${results.success.length}，失败 ${results.failed.length}`
      );
    }),

  batchDelete: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.number()).min(1).max(50),
      })
    )
    .mutation(async ({ ctx, input }) => {
      ctx.logger.info({ ids: input.ids }, '批量删除题库开始');

      if (!isAdmin(ctx)) {
        throwIf(true, ErrorType.FORBIDDEN, '无权限');
      }

      const results = {
        success: [] as number[],
        failed: [] as { id: number; reason: string }[],
      };

      // 并行删除题库
      const deletePromises = input.ids.map(async (id) => {
        try {
          const [deletedQuestionBank] = await db
            .update(questionBanks)
            .set({ isDelete: true, updateTime: new Date() })
            .where(and(eq(questionBanks.id, id), eq(questionBanks.isDelete, false)))
            .returning();

          if (deletedQuestionBank) {
            results.success.push(id);
            return id;
          } else {
            results.failed.push({
              id,
              reason: '题库不存在或已删除',
            });
            return null;
          }
        } catch (error) {
          results.failed.push({
            id,
            reason: error instanceof Error ? error.message : '删除失败',
          });
          return null;
        }
      });

      await Promise.all(deletePromises);

      ctx.logger.info(
        {
          success: results.success.length,
          failed: results.failed.length,
        },
        '批量删除题库完成'
      );

      return success(
        results,
        `批量删除题库完成：成功 ${results.success.length}，失败 ${results.failed.length}`
      );
    }),

  // List question banks with question count
  listWithQuestionCount: protectedProcedure
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
        '查询题库列表和题目数量'
      );

      const offset = (input.page - 1) * input.pageSize;

      const conditions = [eq(questionBanks.isDelete, false)];
      if (!isAdmin(ctx)) {
        conditions.push(eq(questionBanks.userId, ctx.user.id));
      } else if (input.userId) {
        conditions.push(eq(questionBanks.userId, input.userId));
      }

      if (input.title) {
        conditions.push(like(questionBanks.title, `%${input.title}%`));
      }

      // 并行查询题库列表和总数
      const [data, totalResult] = await Promise.all([
        db
          .select()
          .from(questionBanks)
          .where(and(...conditions))
          .offset(offset)
          .limit(input.pageSize)
          .orderBy(desc(questionBanks.createTime)),
        db
          .select()
          .from(questionBanks)
          .where(and(...conditions)),
      ]);

      ctx.logger.info(
        { count: data.length, total: totalResult.length, page: input.page },
        '查询题库列表成功，开始查询题目数量'
      );

      // 并行查询每个题库的题目数量
      const questionBanksWithCount = await Promise.all(
        data.map(async (qb) => {
          const [{ count }] = await db
            .select({ count: sql<number>`count(*)` })
            .from(questionBankQuestions)
            .where(
              and(
                eq(questionBankQuestions.questionBankId, qb.id),
                ...(isAdmin(ctx) ? [] : [eq(questionBankQuestions.userId, ctx.user.id)])
              )
            );

          return {
            ...qb,
            questionCount: count || 0,
          };
        })
      );

      const pagination = createPaginationMeta(input.page, input.pageSize, totalResult.length);
      return success(
        {
          items: questionBanksWithCount,
          pagination,
        },
        '查询题库列表和题目数量成功'
      );
    }),
});
