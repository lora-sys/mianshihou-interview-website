import { db } from '../../index';
import { verifications } from '../../db/schema';
import { lt } from 'drizzle-orm';
import { logger } from '../../lib/logger';
import type { CleanupResult } from '../cleanup-schedule';

/**
 * 清理过期的验证码
 * 删除 expiresAt 小于当前时间的验证记录
 *
 * 执行频率: 每小时
 * 清理范围: 所有已过期的 Better-Auth 验证码（邮箱验证、手机验证等）
 */
export async function cleanupExpiredVerifications(): Promise<CleanupResult> {
  const taskName = 'cleanupExpiredVerifications';
  logger.info({ taskName }, '开始清理过期验证码...');

  const now = new Date();

  try {
    const result = await db
      .delete(verifications)
      .where(lt(verifications.expiresAt, now))
      .returning({ id: verifications.id, identifier: verifications.identifier });

    logger.info({ taskName, deletedCount: result.length }, `清理了 ${result.length} 个过期验证码`);

    return {
      deletedCount: result.length,
      timestamp: now,
      taskName,
      details: {
        verificationsDeleted: result.length,
      },
    };
  } catch (error) {
    logger.error({ taskName, error }, '清理过期验证码失败');
    throw error;
  }
}
