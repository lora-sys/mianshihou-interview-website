import cron from 'node-cron';
import { cleanupExpiredSessions } from './cleanup/sessions';
import { cleanupSoftDeletedData } from './cleanup/soft-delete';
import { cleanupExpiredVerifications } from './cleanup/verification';
import { cleanupExpiredTokens } from './cleanup/tokens';
import { logger } from '../lib/logger';

/**
 * 清理任务配置接口
 */
interface CleanupTaskConfig {
  /** 任务名称 */
  name: string;
  /** Cron表达式 */
  cronExpression: string;
  /** 任务描述 */
  description: string;
  /** 任务执行函数 */
  task: () => Promise<CleanupResult>;
}

/**
 * 清理任务结果接口
 */
export interface CleanupResult {
  /** 删除的数量 */
  deletedCount: number;
  /** 执行时间戳 */
  timestamp: Date;
  /** 任务名称 */
  taskName?: string;
  /** 额外的详细信息 */
  details?: Record<string, number>;
}

/**
 * 清理任务配置
 */
const cleanupTasks: CleanupTaskConfig[] = [
  {
    name: 'cleanupExpiredSessions',
    description: '清理过期的会话数据',
    cronExpression: '0 2 * * *', // 每天凌晨2点执行
    task: cleanupExpiredSessions,
  },
  {
    name: 'cleanupSoftDeletedData',
    description: '清理超过90天的软删除数据',
    cronExpression: '0 3 * * 0', // 每周日凌晨3点执行
    task: cleanupSoftDeletedData,
  },
  {
    name: 'cleanupExpiredVerifications',
    description: '清理过期的验证码',
    cronExpression: '0 * * * *', // 每小时执行
    task: cleanupExpiredVerifications,
  },
  {
    name: 'cleanupExpiredTokens',
    description: '清理过期的OAuth Token',
    cronExpression: '0 4 * * *', // 每天凌晨4点执行
    task: cleanupExpiredTokens,
  },
];

/**
 * 存储定时任务引用
 */
const scheduledTasks = new Map<string, cron.ScheduledTask>();

/**
 * 启动所有清理任务
 */
export function startCleanupTasks() {
  logger.info('启动清理任务...');

  cleanupTasks.forEach(({ name, cronExpression, description, task }) => {
    const scheduledTask = cron.schedule(cronExpression, async () => {
      logger.info({ taskName: name, description }, `开始执行清理任务: ${name}`);
      try {
        const result = await task();
        logger.info(
          { taskName: name, deletedCount: result.deletedCount, timestamp: result.timestamp },
          `清理任务完成: ${name}`
        );
      } catch (error) {
        logger.error({ taskName: name, error }, `清理任务失败: ${name}`);
      }
    });

    scheduledTasks.set(name, scheduledTask);
    logger.info({ taskName: name, cronExpression, description }, `已注册清理任务: ${name}`);
  });

  logger.info('所有清理任务已启动');
}

/**
 * 停止所有清理任务
 */
export function stopCleanupTasks() {
  logger.info('停止清理任务...');

  scheduledTasks.forEach((task, name) => {
    task.stop();
    logger.info({ taskName: name }, `已停止清理任务: ${name}`);
  });

  scheduledTasks.clear();
  logger.info('所有清理任务已停止');
}

/**
 * 手动触发清理任务（用于测试和管理）
 */
export async function runCleanupTask(taskName: string): Promise<CleanupResult> {
  const taskConfig = cleanupTasks.find((t) => t.name === taskName);

  if (!taskConfig) {
    throw new Error(`未找到清理任务: ${taskName}`);
  }

  logger.info({ taskName }, `手动执行清理任务: ${taskName}`);
  const result = await taskConfig.task();
  logger.info({ taskName, deletedCount: result.deletedCount }, `清理任务完成: ${taskName}`);

  return result;
}

/**
 * 获取所有清理任务列表
 */
export function listCleanupTasks(): Array<{
  name: string;
  description: string;
  cronExpression: string;
}> {
  return cleanupTasks.map(({ name, description, cronExpression }) => ({
    name,
    description,
    cronExpression,
  }));
}

/**
 * 检查清理任务是否正在运行
 */
export function isTaskRunning(taskName: string): boolean {
  return scheduledTasks.has(taskName);
}
