import { router, publicProcedure } from "../index";
import { z } from "zod";
import { questions } from "../../db/schema";
import { eq, desc, and, like } from "drizzle-orm";
import { db } from "../../index";
import { throwIfNull, throwIf } from "../../lib/exception";
import { ErrorType } from "../../lib/errors";

export const questionRouter = router({
  questions: router({
    create: publicProcedure
      .input(
        z.object({
          title: z.string().min(1, { message: "标题不能为空" }),
          content: z.string().min(1, { message: "内容不能为空" }),
          answer: z.string().optional(),
          tags: z.array(z.string()).optional(),
          questionBankId: z.number().optional(),
          userId: z.number(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        ctx.logger.info({ 
          title: input.title,
          questionBankId: input.questionBankId,
          userId: input.userId 
        }, '创建题目开始');

        try {
          const [newQuestion] = await db
            .insert(questions)
            .values({
              title: input.title,
              content: input.content,
              answer: input.answer,
              tags: input.tags ? JSON.stringify(input.tags) : null,
              questionBankId: input.questionBankId,
              userId: input.userId,
            })
            .returning();

          ctx.logger.info({ 
            questionId: newQuestion.id,
            title: newQuestion.title 
          }, '题目创建成功');

          return newQuestion;
        } catch (error) {
          ctx.logger.error({ title: input.title, error }, '创建题目失败');
          throw error;
        }
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        ctx.logger.info({ questionId: input.id }, '删除题目开始');

        try {
          const [question] = await db
            .select()
            .from(questions)
            .where(and(eq(questions.id, input.id), eq(questions.isDelete, false)))
            .limit(1);

          throwIfNull(question, ErrorType.RESOURCE_NOT_FOUND, undefined, {
            questionId: input.id,
          });

          const [deletedQuestion] = await db
            .update(questions)
            .set({ isDelete: true, updateTime: new Date() })
            .where(eq(questions.id, input.id))
            .returning();

          ctx.logger.info({ questionId: deletedQuestion.id }, '题目删除成功');

          return { success: true, id: deletedQuestion.id };
        } catch (error) {
          ctx.logger.error({ questionId: input.id, error }, '删除题目失败');
          throw error;
        }
      }),

    update: publicProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().min(1, { message: "标题不能为空" }).optional(),
          content: z.string().min(1, { message: "内容不能为空" }).optional(),
          answer: z.string().optional(),
          tags: z.array(z.string()).optional(),
          questionBankId: z.number().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        ctx.logger.info({ questionId: input.id }, '更新题目开始');

        try {
          const { id, ...updateData } = input;

          const [question] = await db
            .select()
            .from(questions)
            .where(and(eq(questions.id, id), eq(questions.isDelete, false)))
            .limit(1);

          throwIfNull(question, ErrorType.RESOURCE_NOT_FOUND, undefined, {
            questionId: input.id,
          });

          const hasUpdates = Object.keys(updateData).length > 0;
          throwIf(
            !hasUpdates,
            ErrorType.INVALID_PARAMS,
            "没有提供需要更新的字段",
          );

          const finalUpdateData: any = {
            title: updateData.title,
            content: updateData.content,
            answer: updateData.answer,
            questionBankId: updateData.questionBankId,
          };

          if (updateData.tags) {
            finalUpdateData.tags = JSON.stringify(updateData.tags);
          }

          const [updatedQuestion] = await db
            .update(questions)
            .set({ ...finalUpdateData, updateTime: new Date() })
            .where(eq(questions.id, id))
            .returning();

          ctx.logger.info({ questionId: updatedQuestion.id,
            updatedFields: Object.keys(updateData) 
           }, '题目更新成功');

          return updatedQuestion;
        } catch (error) {
          ctx.logger.error({ questionId: input.id, error }, '更新题目失败');
          throw error;
        }
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        ctx.logger.info({ questionId: input.id }, '根据ID查询题目');

        const [question] = await db
          .select()
          .from(questions)
          .where(and(eq(questions.id, input.id), eq(questions.isDelete, false)))
          .limit(1);

        throwIfNull(question, ErrorType.RESOURCE_NOT_FOUND, undefined, {
          questionId: input.id,
        });

        ctx.logger.info({ questionId: input.id, title: question.title }, '查询题目成功');

        return question;
      }),

    list: publicProcedure
      .input(
        z.object({
          page: z.number().min(1).default(1),
          pageSize: z.number().min(1).max(100).default(10),
          title: z.string().optional(),
          questionBankId: z.number().optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        ctx.logger.info({ page: input.page,
          pageSize: input.pageSize,
          title: input.title,
          questionBankId: input.questionBankId 
         }, '查询题目列表');

        const offset = (input.page - 1) * input.pageSize;

        const conditions = [];

        if (input.title) {
          conditions.push(like(questions.title, `%${input.title}%`));
        }
        if (input.questionBankId) {
          conditions.push(
            eq(questions.questionBankId, input.questionBankId),
          );
        }

        const [data, totalResult] = await Promise.all([
          db
            .select()
            .from(questions)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .offset(offset)
            .limit(input.pageSize)
            .orderBy(desc(questions.createTime)),
          db
            .select()
            .from(questions)
            .where(conditions.length > 0 ? and(...conditions) : undefined),
        ]);

        ctx.logger.info({ count: data.length,
          total: totalResult.length,
          page: input.page 
         }, '查询题目列表成功');

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