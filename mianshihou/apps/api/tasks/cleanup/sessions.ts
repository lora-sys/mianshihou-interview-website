import { db } from '../../index';
import { sessions } from '../../db/schema';
import { lt } from 'drizzle-orm';
import { logger } from '../../lib/logger';
import type { CleanupResult } from '../cleanup-schedule';

/**
 * 清理过期的会话数据
 * 删除 expiresAt 小于当前时间的会话
 *
 * 执行频率: 每天凌晨2点
 * 清理范围: 所有已过期的 Better-Auth 会话
 */
export async function cleanupExpiredSessions(): Promise<CleanupResult> {
  const taskName = 'cleanupExpiredSessions';
  logger.info({ taskName }, '开始清理过期会话...');

  const now = new Date();

  try {
    const result = await db
      .delete(sessions)
      .where(lt(sessions.expiresAt, now))
      .returning({ id: sessions.id, userId: sessions.userId, expiresAt: sessions.expiresAt });

    logger.info({ taskName, deletedCount: result.length }, `清理了 ${result.length} 个过期会话`);

    return {
      deletedCount: result.length,
      timestamp: now,
      taskName,
      details: {
        sessionsDeleted: result.length,
      },
    };
  } catch (error) {
    logger.error({ taskName, error }, '清理过期会话失败');
    throw error;
  }
}
