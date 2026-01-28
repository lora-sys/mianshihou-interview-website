import { router, publicProcedure } from "../index";
import { z } from "zod";
import { questionBanks, questionBankQuestions, questions } from "../../db/schema";
import { eq, desc, and, like, sql } from "drizzle-orm";
import { db } from "../../index";
import { throwIfNull, throwIf, throwIfNot } from "../../lib/exception";
import { ErrorType } from "../../lib/errors";

export const questionBankRouter = router({
  questionBanks: router({
    create: publicProcedure
      .input(
        z.object({
          title: z.string().min(1, { message: "标题不能为空" }),
          description: z.string().optional(),
          picture: z.string().optional(),
          userId: z.string(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        ctx.logger.info({ title: input.title,
          userId: input.userId 
         }, '创建题库开始');

        try {
          const [newQuestionBank] = await db
            .insert(questionBanks)
            .values({
              title: input.title,
              description: input.description,
              picture: input.picture,
              userId: input.userId,
            })
            .returning();

          ctx.logger.info({ questionBankId: newQuestionBank.id,
            title: newQuestionBank.title 
           }, '题库创建成功');

          return newQuestionBank;
        } catch (error) {
          ctx.logger.error({ title: input.title, error }, '创建题库失败');
          throw error;
        }
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        ctx.logger.info({ questionBankId: input.id }, '删除题库开始');

        try {
          const [questionBank] = await db
            .select()
            .from(questionBanks)
            .where(and(eq(questionBanks.id, input.id), eq(questionBanks.isDelete, false)))
            .limit(1);

          throwIfNull(questionBank, ErrorType.RESOURCE_NOT_FOUND, undefined, {
            questionBankId: input.id,
          });

          const [deletedQuestionBank] = await db
            .update(questionBanks)
            .set({ isDelete: true, updateTime: new Date() })
            .where(eq(questionBanks.id, input.id))
            .returning();

          ctx.logger.info({ questionBankId: deletedQuestionBank.id }, '题库删除成功');

          return { success: true, id: deletedQuestionBank.id };
        } catch (error) {
          ctx.logger.error({ questionBankId: input.id, error }, '删除题库失败');
          throw error;
        }
      }),

    update: publicProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().min(1, { message: "标题不能为空" }).optional(),
          description: z.string().optional(),
          picture: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        ctx.logger.info({ questionBankId: input.id }, '更新题库开始');

        try {
          const { id, ...updateData } = input;

          const [questionBank] = await db
            .select()
            .from(questionBanks)
            .where(and(eq(questionBanks.id, id), eq(questionBanks.isDelete, false)))
            .limit(1);

          throwIfNull(questionBank, ErrorType.RESOURCE_NOT_FOUND, undefined, {
            questionBankId: input.id,
          });

          const hasUpdates = Object.keys(updateData).length > 0;
          throwIf(
            !hasUpdates,
            ErrorType.INVALID_PARAMS,
            "没有提供需要更新的字段",
          );

          const [updatedQuestionBank] = await db
            .update(questionBanks)
            .set({ ...updateData, updateTime: new Date() })
            .where(eq(questionBanks.id, id))
            .returning();

          ctx.logger.info({ questionBankId: updatedQuestionBank.id,
            updatedFields: Object.keys(updateData) 
           }, '题库更新成功');

          return updatedQuestionBank;
        } catch (error) {
          ctx.logger.error({ questionBankId: input.id, error }, '更新题库失败');
          throw error;
        }
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        ctx.logger.info({ questionBankId: input.id }, '根据ID查询题库');

        const [questionBank] = await db
          .select()
          .from(questionBanks)
          .where(and(eq(questionBanks.id, input.id), eq(questionBanks.isDelete, false)))
          .limit(1);

        throwIfNull(questionBank, ErrorType.RESOURCE_NOT_FOUND, undefined, {
          questionBankId: input.id,
        });

        ctx.logger.info({ questionBankId: input.id,
          title: questionBank.title 
         }, '查询题库成功');

        return questionBank;
      }),

    list: publicProcedure
      .input(
        z.object({
          page: z.number().min(1).default(1),
          pageSize: z.number().min(1).max(100).default(10),
          title: z.string().optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        ctx.logger.info({ page: input.page,
          pageSize: input.pageSize,
          title: input.title 
         }, '查询题库列表');

        const offset = (input.page - 1) * input.pageSize;

        const conditions = [];

        if (input.title) {
          conditions.push(like(questionBanks.title, `%${input.title}%`));
        }

        const [data, totalResult] = await Promise.all([
          db
            .select()
            .from(questionBanks)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .offset(offset)
            .limit(input.pageSize)
            .orderBy(desc(questionBanks.createTime)),
          db
            .select()
            .from(questionBanks)
            .where(conditions.length > 0 ? and(...conditions) : undefined),
        ]);

        ctx.logger.info({ count: data.length,
          total: totalResult.length,
          page: input.page 
         }, '查询题库列表成功');

        return {
          data,
          total: totalResult.length,
          page: input.page,
          pageSize: input.pageSize,
          totalPages: Math.ceil(totalResult.length / input.pageSize),
        };
      }),

    addQuestion: publicProcedure
      .input(
        z.object({
          questionBankId: z.number(),
          questionId: z.number(),
          userId: z.string(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        ctx.logger.info({ questionBankId: input.questionBankId,
          questionId: input.questionId,
          userId: input.userId 
         }, '添加题目到题库开始');

        try {
          // 检查题库是否存在
          const [questionBank] = await db
            .select()
            .from(questionBanks)
            .where(
              and(
                eq(questionBanks.id, input.questionBankId),
                eq(questionBanks.isDelete, false),
              ),
            )
            .limit(1);

          throwIfNull(questionBank, ErrorType.RESOURCE_NOT_FOUND, undefined, {
            questionBankId: input.questionBankId,
          });

          // 检查题目是否存在
          const [question] = await db
            .select()
            .from(questions)
            .where(
              and(
                eq(questions.id, input.questionId),
                eq(questions.isDelete, false),
              ),
            )
            .limit(1);

          throwIfNull(question, ErrorType.RESOURCE_NOT_FOUND, undefined, {
            questionId: input.questionId,
          });

          // 检查是否已经关联
          const [existingRelation] = await db
            .select()
            .from(questionBankQuestions)
            .where(
              and(
                eq(questionBankQuestions.questionBankId, input.questionBankId),
                eq(questionBankQuestions.questionId, input.questionId),
              ),
            )
            .limit(1);

          throwIf(
            !!existingRelation,
            ErrorType.DUPLICATE_OPERATION,
            "题目已在该题库中",
          );

          // 添加关联
          const [newRelation] = await db
            .insert(questionBankQuestions)
            .values({
              questionBankId: input.questionBankId,
              questionId: input.questionId,
              userId: input.userId,
            })
            .returning();

          // 更新题库的题目数量
          await db
            .update(questionBanks)
            .set({
              questionCount: sql`${questionBanks.questionCount} + 1`,
              updateTime: new Date(),
            })
            .where(eq(questionBanks.id, input.questionBankId));

          ctx.logger.info({ questionBankId: input.questionBankId,
            questionId: input.questionId 
           }, '题目添加到题库成功');

          return newRelation;
        } catch (error) {
          ctx.logger.error({ questionBankId: input.questionBankId,
            questionId: input.questionId 
          , error }, '添加题目到题库失败');
          throw error;
        }
      }),

    removeQuestion: publicProcedure
      .input(
        z.object({
          questionBankId: z.number(),
          questionId: z.number(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        ctx.logger.info({ questionBankId: input.questionBankId,
          questionId: input.questionId 
         }, '从题库移除题目开始');

        try {
          // 检查关联是否存在
          const [relation] = await db
            .select()
            .from(questionBankQuestions)
            .where(
              and(
                eq(questionBankQuestions.questionBankId, input.questionBankId),
                eq(questionBankQuestions.questionId, input.questionId),
              ),
            )
            .limit(1);

          throwIfNull(relation, ErrorType.RESOURCE_NOT_FOUND, undefined, {
            questionBankId: input.questionBankId,
            questionId: input.questionId,
          });

          // 删除关联
          await db
            .delete(questionBankQuestions)
            .where(
              and(
                eq(questionBankQuestions.questionBankId, input.questionBankId),
                eq(questionBankQuestions.questionId, input.questionId),
              ),
            );

          // 更新题库的题目数量
          await db
            .update(questionBanks)
            .set({
              questionCount: sql`${questionBanks.questionCount} - 1`,
              updateTime: new Date(),
            })
            .where(eq(questionBanks.id, input.questionBankId));

          ctx.logger.info({ questionBankId: input.questionBankId,
            questionId: input.questionId 
           }, '从题库移除题目成功');

          return { success: true };
        } catch (error) {
          ctx.logger.error({ questionBankId: input.questionBankId,
            questionId: input.questionId 
          , error }, '从题库移除题目失败');
          throw error;
        }
      }),

    getQuestions: publicProcedure
      .input(
        z.object({
          questionBankId: z.number(),
          page: z.number().min(1).default(1),
          pageSize: z.number().min(1).max(100).default(10),
        }),
      )
      .query(async ({ ctx, input }) => {
        ctx.logger.info({ questionBankId: input.questionBankId,
          page: input.page,
          pageSize: input.pageSize 
         }, '获取题库的题目列表开始');

        const offset = (input.page - 1) * input.pageSize;

        // 检查题库是否存在
        const [questionBank] = await db
          .select()
          .from(questionBanks)
          .where(
            and(
              eq(questionBanks.id, input.questionBankId),
              eq(questionBanks.isDelete, false),
            ),
          )
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
          return {
            data: [],
            total: 0,
            page: input.page,
            pageSize: input.pageSize,
            totalPages: 0,
          };
        }

        // 获取题目详情
        const [data, totalResult] = await Promise.all([
          db
            .select()
            .from(questions)
            .where(
              and(
                eq(questions.isDelete, false),
                sql`${questions.id} = ANY(${questionIds})`,
              ),
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
                sql`${questions.id} = ANY(${questionIds})`,
              ),
            ),
        ]);

        ctx.logger.info({ questionBankId: input.questionBankId,
          count: data.length,
          total: totalResult.length 
         }, '获取题库的题目列表成功');

        return {
          data,
          total: totalResult.length,
          page: input.page,
          pageSize: input.pageSize,
          totalPages: Math.ceil(totalResult.length / input.pageSize),
        };
      }),
  }),
});