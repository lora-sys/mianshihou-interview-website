import { router, publicProcedure } from '../index';
import { z } from 'zod';
import { db } from '../../index';
import { questionBanks, questions, users } from '../../db/schema';
import { and, desc, eq, like, or } from 'drizzle-orm';
import { success } from '../../lib/response-wrapper';

function systemOwnerCondition() {
  return and(eq(users.isDelete, false), eq(users.status, 'active'), eq(users.userRole, 'admin'));
}

function normalizeQuery(q: string) {
  return (q ?? '').trim();
}

function expandKeywords(q: string) {
  const keywords = new Set<string>();
  const trimmed = normalizeQuery(q);
  if (trimmed) keywords.add(trimmed);

  if (trimmed.includes('系统精选')) {
    keywords.add('系统');
    keywords.add('精选');
  }

  for (const part of trimmed.split(/[\s,，;；/|]+/g)) {
    const p = normalizeQuery(part);
    if (p) keywords.add(p);
  }

  return Array.from(keywords);
}

function likeAny(column: any, patterns: string[]) {
  if (patterns.length <= 0) throw new Error('patterns must not be empty');
  if (patterns.length === 1) return like(column, patterns[0]);
  return or(...patterns.map((p) => like(column, p)));
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
      const normalizedQ = normalizeQuery(input.q);
      const patterns =
        normalizedQ === '系统精选' ? ['%%'] : expandKeywords(normalizedQ).map((k) => `%${k}%`);

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
              or(
                likeAny(questions.title, patterns),
                likeAny(questions.tags, patterns),
                likeAny(questions.content, patterns)
              )
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
              or(
                likeAny(questionBanks.title, patterns),
                likeAny(questionBanks.description, patterns)
              )
            )
          )
          .orderBy(desc(questionBanks.updateTime))
          .limit(input.limit),
      ]);

      if (!ctx.user) {
        return success(
          {
            q: normalizedQ,
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
              or(
                likeAny(questions.title, patterns),
                likeAny(questions.tags, patterns),
                likeAny(questions.content, patterns)
              )
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
              or(
                likeAny(questionBanks.title, patterns),
                likeAny(questionBanks.description, patterns)
              )
            )
          )
          .orderBy(desc(questionBanks.updateTime))
          .limit(input.limit),
      ]);

      return success(
        {
          q: normalizedQ,
          system: { questions: systemQuestions, questionBanks: systemBanks },
          mine: { questions: myQuestions, questionBanks: myBanks },
        },
        '搜索成功'
      );
    }),
});
