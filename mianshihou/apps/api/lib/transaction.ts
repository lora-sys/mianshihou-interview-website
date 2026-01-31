import { db } from '../index';
import { Transaction } from 'drizzle-orm/pg-core';
import { logger as defaultLogger } from './logger';

/**
 * 事务上下文
 */
export interface TransactionContext {
  tx: Transaction;
  logger: any;
}

/**
 * 事务选项
 */
export interface TransactionOptions {
  logger?: any;
  operationName?: string;
}

/**
 * 在事务中执行操作
 *
 * @param operation - 要在事务中执行的操作函数
 * @param options - 事务选项
 * @returns 操作的结果
 *
 * @example
 * ```typescript
 * const result = await withTransaction(
 *   async ({ tx, logger }) => {
 *     // 所有数据库操作都在同一个事务中执行
 *     await tx.insert(table1).values(...);
 *     await tx.update(table2).set(...);
 *
 *     return result;
 *   },
 *   { logger: ctx.logger, operationName: 'create-user' }
 * );
 * ```
 */
export async function withTransaction<T>(
  operation: (ctx: TransactionContext) => Promise<T>,
  options: TransactionOptions = {}
): Promise<T> {
  const logger = options.logger || defaultLogger;
  const operationName = options.operationName || 'transaction';

  logger.info({ operationName }, '事务开始');

  try {
    const result = await db.transaction(async (tx) => {
      return await operation({ tx, logger });
    });

    logger.info({ operationName }, '事务提交成功');
    return result;
  } catch (error) {
    logger.error({ operationName, error }, '事务回滚');
    throw error;
  }
}
