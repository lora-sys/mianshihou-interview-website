import { router } from '../index';
import { protectedProcedure } from '../middleware/auth';
import { z } from 'zod';
import { questions, questionBanks, practices } from '../../db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { db } from '../../index';
import { success } from '../../lib/response-wrapper';

export const dashboardRouter = router({
  getStats: protectedProcedure.query(async ({ ctx }) => {
    ctx.logger.info('获取统计数据开始');

    try {
      // 并行查询各项统计数据
      const [totalQuestionsResult, totalQuestionBanksResult] = await Promise.all([
        db
          .select({ count: sql<number>`count(*)` })
          .from(questions)
          .where(eq(questions.isDelete, false)),
        db
          .select({ count: sql<number>`count(*)` })
          .from(questionBanks)
          .where(eq(questionBanks.isDelete, false)),
      ]);

      const stats = {
        totalQuestions: totalQuestionsResult[0]?.count || 0,
        totalQuestionBanks: totalQuestionBanksResult[0]?.count || 0,
        completedPractices: 0, // TODO: 从 practices 表查询
        averageScore: 0, // TODO: 从 practices 表计算
      };

      ctx.logger.info(stats, '获取统计数据成功');

      return success(stats, '获取统计数据成功');
    } catch (error) {
      ctx.logger.error({ error }, '获取统计数据失败');
      throw error;
    }
  }),
});
