import { db } from '../../index';
import { accounts } from '../../db/schema';
import { lt, sql } from 'drizzle-orm';
import { logger } from '../../lib/logger';
import type { CleanupResult } from '../cleanup-schedule';

/**
 * 清理过期的 OAuth Token
 * 删除访问令牌和刷新令牌都已过期的账户
 *
 * 执行频率: 每天凌晨4点
 * 清理范围: accessTokenExpiresAt 和 refreshTokenExpiresAt 都小于当前时间的账户
 */
export async function cleanupExpiredTokens(): Promise<CleanupResult> {
  const taskName = 'cleanupExpiredTokens';
  logger.info({ taskName }, '开始清理过期Token...');

  const now = new Date();

  try {
    // 删除两种 token 都已过期的账户
    const result = await db
      .delete(accounts)
      .where(
        sql`${accounts.accessTokenExpiresAt} < ${now} AND ${accounts.refreshTokenExpiresAt} < ${now}`
      )
      .returning({ id: accounts.id, userId: accounts.userId, providerId: accounts.providerId });

    logger.info(
      { taskName, deletedCount: result.length },
      `清理了 ${result.length} 个过期的Token账户`
    );

    return {
      deletedCount: result.length,
      timestamp: now,
      taskName,
      details: {
        accountsDeleted: result.length,
      },
    };
  } catch (error) {
    logger.error({ taskName, error }, '清理过期Token失败');
    throw error;
  }
}
