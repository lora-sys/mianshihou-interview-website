import { router } from '../index';
import { protectedProcedure } from '../middleware/auth';
import { questions, questionBanks } from '../../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../../index';
import { success } from '../../lib/response-wrapper';

export const dashboardRouter = router({
  getStats: protectedProcedure.query(async ({ ctx }) => {
    ctx.logger.info('获取统计数据开始');

    try {
      const isAdmin = ctx.user?.userRole === 'admin';

      // 并行查询各项统计数据
      const [totalQuestionsResult, totalQuestionBanksResult] = await Promise.all([
        db
          .select({ count: sql<number>`count(*)` })
          .from(questions)
          .where(
            and(
              eq(questions.isDelete, false),
              ...(isAdmin ? [] : [eq(questions.userId, ctx.user.id)])
            )
          ),
        db
          .select({ count: sql<number>`count(*)` })
          .from(questionBanks)
          .where(
            and(
              eq(questionBanks.isDelete, false),
              ...(isAdmin ? [] : [eq(questionBanks.userId, ctx.user.id)])
            )
          ),
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
