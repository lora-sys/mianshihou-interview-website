import { router, publicProcedure } from '../index';
import { z } from 'zod';
import { db } from '../../index';
import { questionBanks, questions, users } from '../../db/schema';
import { and, desc, eq, like, or } from 'drizzle-orm';
import { success } from '../../lib/response-wrapper';

function systemOwnerCondition() {
  return and(eq(users.isDelete, false), eq(users.status, 'active'), eq(users.userRole, 'admin'));
}

export const searchRouter = router({
  query: publicProcedure
    .input(
      z.object({
        q: z.string().trim().min(1),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const qLike = `%${input.q}%`;

      const [systemQuestions, systemBanks] = await Promise.all([
        db
          .select({
            id: questions.id,
            title: questions.title,
            content: questions.content,
            tags: questions.tags,
            questionBankId: questions.questionBankId,
            updateTime: questions.updateTime,
          })
          .from(questions)
          .innerJoin(users, eq(questions.userId, users.id))
          .where(
            and(
              eq(questions.isDelete, false),
              systemOwnerCondition(),
              or(like(questions.title, qLike), like(questions.tags, qLike))
            )
          )
          .orderBy(desc(questions.updateTime))
          .limit(input.limit),
        db
          .select({
            id: questionBanks.id,
            title: questionBanks.title,
            description: questionBanks.description,
            picture: questionBanks.picture,
            questionCount: questionBanks.questionCount,
            updateTime: questionBanks.updateTime,
          })
          .from(questionBanks)
          .innerJoin(users, eq(questionBanks.userId, users.id))
          .where(
            and(
              eq(questionBanks.isDelete, false),
              systemOwnerCondition(),
              or(like(questionBanks.title, qLike), like(questionBanks.description, qLike))
            )
          )
          .orderBy(desc(questionBanks.updateTime))
          .limit(input.limit),
      ]);

      if (!ctx.user) {
        return success(
          {
            q: input.q,
            system: { questions: systemQuestions, questionBanks: systemBanks },
            mine: null,
          },
          '搜索成功'
        );
      }

      const [myQuestions, myBanks] = await Promise.all([
        db
          .select({
            id: questions.id,
            title: questions.title,
            content: questions.content,
            tags: questions.tags,
            questionBankId: questions.questionBankId,
            updateTime: questions.updateTime,
          })
          .from(questions)
          .where(
            and(
              eq(questions.isDelete, false),
              eq(questions.userId, ctx.user.id),
              or(like(questions.title, qLike), like(questions.tags, qLike))
            )
          )
          .orderBy(desc(questions.updateTime))
          .limit(input.limit),
        db
          .select({
            id: questionBanks.id,
            title: questionBanks.title,
            description: questionBanks.description,
            picture: questionBanks.picture,
            questionCount: questionBanks.questionCount,
            updateTime: questionBanks.updateTime,
          })
          .from(questionBanks)
          .where(
            and(
              eq(questionBanks.isDelete, false),
              eq(questionBanks.userId, ctx.user.id),
              or(like(questionBanks.title, qLike), like(questionBanks.description, qLike))
            )
          )
          .orderBy(desc(questionBanks.updateTime))
          .limit(input.limit),
      ]);

      return success(
        {
          q: input.q,
          system: { questions: systemQuestions, questionBanks: systemBanks },
          mine: { questions: myQuestions, questionBanks: myBanks },
        },
        '搜索成功'
      );
    }),
});
