import { db } from '../../index';
import { posts, questions, questionBanks } from '../../db/schema';
import { eq, and, lt } from 'drizzle-orm';
import { logger } from '../../lib/logger';
import type { CleanupResult } from '../cleanup-schedule';

/**
 * 清理超过 90 天的软删除数据
 * 包括: 帖子、题目、题库
 *
 * 执行频率: 每周日凌晨3点
 * 清理范围: isDelete=true 且 updateTime 超过90天的数据
 */
export async function cleanupSoftDeletedData(): Promise<CleanupResult> {
  const taskName = 'cleanupSoftDeletedData';
  logger.info({ taskName }, '开始清理软删除数据...');

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  let totalDeleted = 0;
  const details: Record<string, number> = {};

  try {
    // 清理帖子
    const deletedPosts = await db
      .delete(posts)
      .where(and(eq(posts.isDelete, true), lt(posts.updateTime, ninetyDaysAgo)))
      .returning({ id: posts.id, title: posts.title });

    details.postsDeleted = deletedPosts.length;
    totalDeleted += deletedPosts.length;
    logger.info(
      { taskName, count: deletedPosts.length },
      `清理了 ${deletedPosts.length} 个软删除的帖子`
    );

    // 清理题目
    const deletedQuestions = await db
      .delete(questions)
      .where(and(eq(questions.isDelete, true), lt(questions.updateTime, ninetyDaysAgo)))
      .returning({ id: questions.id, title: questions.title });

    details.questionsDeleted = deletedQuestions.length;
    totalDeleted += deletedQuestions.length;
    logger.info(
      { taskName, count: deletedQuestions.length },
      `清理了 ${deletedQuestions.length} 个软删除的题目`
    );

    // 清理题库
    const deletedBanks = await db
      .delete(questionBanks)
      .where(and(eq(questionBanks.isDelete, true), lt(questionBanks.updateTime, ninetyDaysAgo)))
      .returning({ id: questionBanks.id, title: questionBanks.title });

    details.banksDeleted = deletedBanks.length;
    totalDeleted += deletedBanks.length;
    logger.info(
      { taskName, count: deletedBanks.length },
      `清理了 ${deletedBanks.length} 个软删除的题库`
    );

    // 注意：通常不删除用户，保留用户记录用于历史追溯
    logger.info({ taskName, totalDeleted }, '清理软删除数据完成');

    return {
      deletedCount: totalDeleted,
      timestamp: new Date(),
      taskName,
      details,
    };
  } catch (error) {
    logger.error({ taskName, error }, '清理软删除数据失败');
    throw error;
  }
}
