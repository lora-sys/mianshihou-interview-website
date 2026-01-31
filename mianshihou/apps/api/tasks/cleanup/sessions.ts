import { db } from '../../index';
import { sessions } from '../../db/schema';
import { lt, eq, and } from 'drizzle-orm';
import { logger } from '../../lib/logger';
import type { CleanupResult } from '../cleanup-schedule';
import { cleanupUserSessions } from '../../lib/concurrent-login';

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
    // 查询所有过期会话
    const expiredSessions = await db
      .select({
        id: sessions.id,
        userId: sessions.userId,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .where(lt(sessions.expiresAt, now));

    if (expiredSessions.length === 0) {
      logger.info({ taskName }, '没有过期会话需要清理');
      return {
        deletedCount: 0,
        timestamp: now,
        taskName,
        details: {
          sessionsDeleted: 0,
        },
      };
    }

    // 删除数据库中的过期会话
    await db.delete(sessions).where(lt(sessions.expiresAt, now));

    // 按用户分组，清理设备信息
    const userSessions = new Map<string, string[]>();
    for (const session of expiredSessions) {
      if (!userSessions.has(session.userId)) {
        userSessions.set(session.userId, []);
      }
      userSessions.get(session.userId)!.push(session.id);
    }

    // 清理每个用户的设备信息
    for (const [userId, expiredSessionIds] of userSessions) {
      // 获取用户的活跃会话
      const activeSessions = await db
        .select({ id: sessions.id })
        .from(sessions)
        .where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, now)));

      const activeSessionIds = activeSessions.map((s) => s.id);

      // 清理设备中的过期会话
      await cleanupUserSessions(userId, activeSessionIds);
    }

    logger.info(
      { taskName, deletedCount: expiredSessions.length },
      `清理了 ${expiredSessions.length} 个过期会话`
    );

    return {
      deletedCount: expiredSessions.length,
      timestamp: now,
      taskName,
      details: {
        sessionsDeleted: expiredSessions.length,
        usersAffected: userSessions.size,
      },
    };
  } catch (error) {
    logger.error({ taskName, error }, '清理过期会话失败');
    throw error;
  }
}
