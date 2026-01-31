import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { db } from '../../index';
import {
  questionBanks,
  questionBankQuestions,
  questions,
  posts,
  postThumbs,
  users,
} from '../../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { withTransaction } from '../../lib/transaction';
import { logger } from '../../lib/logger';

// 在CI环境中跳过事务测试，因为CI环境没有配置PostgreSQL数据库
const describeFn = process.env.CI === 'true' ? describe.skip : describe;

describeFn('Transaction Utils', () => {
  let testUserId: string;
  let testQuestionBankId: number;
  let testPostId: number;

  beforeEach(async () => {
    // 创建测试用户
    testUserId = `test-transaction-${Date.now()}`;
    await db.insert(users).values({
      id: testUserId,
      email: `test-${Date.now()}@example.com`,
      userName: 'Transaction Test User',
      userRole: 'admin',
      status: 'active',
    });
  });

  afterEach(async () => {
    // 清理测试数据
    try {
      await db.delete(questionBankQuestions).where(eq(questionBankQuestions.userId, testUserId));
      await db.delete(questions).where(eq(questions.userId, testUserId));
      await db.delete(questionBanks).where(eq(questionBanks.userId, testUserId));
      await db.delete(postThumbs).where(eq(postThumbs.userId, testUserId));
      await db.delete(posts).where(eq(posts.userId, testUserId));
      await db.delete(users).where(eq(users.id, testUserId));
    } catch (error) {
      console.error('Error cleaning up test data:', error);
    }
  });

  describe('Basic Transaction', () => {
    it('should commit transaction on success', async () => {
      // 创建题库
      const result = await withTransaction(
        async ({ tx }) => {
          const [newBank] = await tx
            .insert(questionBanks)
            .values({
              title: 'Test Bank',
              userId: testUserId,
            })
            .returning();

          testQuestionBankId = newBank.id;

          // 在同一事务中查询，应该能找到
          const [found] = await tx
            .select()
            .from(questionBanks)
            .where(eq(questionBanks.id, newBank.id))
            .limit(1);

          expect(found).toBeDefined();
          expect(found.title).toBe('Test Bank');

          return newBank;
        },
        { logger, operationName: 'commit-test' }
      );

      expect(result).toBeDefined();
      expect(result.title).toBe('Test Bank');

      // 事务提交后，数据库中应该存在
      const [bank] = await db
        .select()
        .from(questionBanks)
        .where(eq(questionBanks.id, testQuestionBankId))
        .limit(1);

      expect(bank).toBeDefined();
      expect(bank.title).toBe('Test Bank');
    });

    it('should rollback transaction on error', async () => {
      const testId = Date.now();

      try {
        await withTransaction(
          async ({ tx }) => {
            // 插入一条记录
            const [bank] = await tx
              .insert(questionBanks)
              .values({
                title: `Should Rollback ${testId}`,
                userId: testUserId,
              })
              .returning();

            testQuestionBankId = bank.id;

            // 查询确认存在
            const [found] = await tx
              .select()
              .from(questionBanks)
              .where(eq(questionBanks.id, bank.id))
              .limit(1);

            expect(found).toBeDefined();

            // 抛出异常，触发回滚
            throw new Error('Intentional rollback');
          },
          { logger, operationName: 'rollback-test' }
        );

        // 不应该到达这里
        expect(true).toBe(false);
      } catch (error) {
        expect((error as Error).message).toBe('Intentional rollback');
      }

      // 事务回滚后，数据库中不应该存在
      const [bank] = await db
        .select()
        .from(questionBanks)
        .where(eq(questionBanks.title, `Should Rollback ${testId}`))
        .limit(1);

      expect(bank).toBeUndefined();
    });

    it('should handle multiple operations in single transaction', async () => {
      await withTransaction(
        async ({ tx }) => {
          // 创建题库
          const [bank] = await tx
            .insert(questionBanks)
            .values({
              title: 'Multi-op Bank',
              userId: testUserId,
            })
            .returning();

          testQuestionBankId = bank.id;

          // 创建题目
          const [question] = await tx
            .insert(questions)
            .values({
              title: 'Test Question',
              content: 'Test content',
              userId: testUserId,
            })
            .returning();

          // 在同一事务中添加关联
          await tx.insert(questionBankQuestions).values({
            questionBankId: bank.id,
            questionId: question.id,
            userId: testUserId,
          });

          // 更新题库计数
          await tx
            .update(questionBanks)
            .set({
              questionCount: sql`${questionBanks.questionCount} + 1`,
              updateTime: new Date(),
            })
            .where(eq(questionBanks.id, bank.id));

          return { bank, question };
        },
        { logger, operationName: 'multi-op-test' }
      );

      // 验证所有操作都已提交
      const [bank] = await db
        .select()
        .from(questionBanks)
        .where(eq(questionBanks.id, testQuestionBankId))
        .limit(1);

      expect(bank).toBeDefined();
      expect(bank.title).toBe('Multi-op Bank');
      expect(bank.questionCount).toBe(1);

      const [relation] = await db
        .select()
        .from(questionBankQuestions)
        .where(eq(questionBankQuestions.questionBankId, testQuestionBankId))
        .limit(1);

      expect(relation).toBeDefined();
    });
  });

  describe('Transaction with Post Operations', () => {
    beforeEach(async () => {
      // 创建测试帖子
      const [post] = await db
        .insert(posts)
        .values({
          title: 'Test Post',
          content: 'Test content',
          userId: testUserId,
        })
        .returning();

      testPostId = Number(post.id);
    });

    it('should atomically update post and create thumb', async () => {
      const initialPost = await db
        .select()
        .from(posts)
        .where(eq(posts.id, BigInt(testPostId)))
        .limit(1);

      expect(initialPost[0]?.thumbNum).toBe(0);

      await withTransaction(
        async ({ tx }) => {
          // 检查是否已点赞
          const [existing] = await tx
            .select()
            .from(postThumbs)
            .where(
              and(eq(postThumbs.postId, BigInt(testPostId)), eq(postThumbs.userId, testUserId))
            )
            .limit(1);

          if (existing) {
            throw new Error('Already liked');
          }

          // 添加点赞记录
          await tx.insert(postThumbs).values({
            postId: BigInt(testPostId),
            userId: testUserId,
          });

          // 更新帖子点赞数
          await tx
            .update(posts)
            .set({
              thumbNum: sql`${posts.thumbNum} + 1`,
              updateTime: new Date(),
            })
            .where(eq(posts.id, BigInt(testPostId)));
        },
        { logger, operationName: 'like-post-test' }
      );

      // 验证点赞记录已创建
      const [thumb] = await db
        .select()
        .from(postThumbs)
        .where(and(eq(postThumbs.postId, BigInt(testPostId)), eq(postThumbs.userId, testUserId)))
        .limit(1);

      expect(thumb).toBeDefined();

      // 验证点赞数已更新
      const [updatedPost] = await db
        .select()
        .from(posts)
        .where(eq(posts.id, BigInt(testPostId)))
        .limit(1);

      expect(updatedPost?.thumbNum).toBe(1);
    });

    it('should rollback if thumb creation fails', async () => {
      const initialPost = await db
        .select()
        .from(posts)
        .where(eq(posts.id, BigInt(testPostId)))
        .limit(1);

      const initialThumbNum = initialPost[0]?.thumbNum || 0;

      try {
        await withTransaction(
          async ({ tx }) => {
            // 更新帖子点赞数
            await tx
              .update(posts)
              .set({
                thumbNum: sql`${posts.thumbNum} + 1`,
                updateTime: new Date(),
              })
              .where(eq(posts.id, BigInt(testPostId)));

            // 模拟失败
            throw new Error('Simulated failure');
          },
          { logger, operationName: 'like-post-fail-test' }
        );

        expect(true).toBe(false);
      } catch (error) {
        expect((error as Error).message).toBe('Simulated failure');
      }

      // 验证点赞数没有变化
      const [post] = await db
        .select()
        .from(posts)
        .where(eq(posts.id, BigInt(testPostId)))
        .limit(1);

      expect(post?.thumbNum).toBe(initialThumbNum);
    });
  });

  describe('Transaction Context', () => {
    it('should provide transaction context with tx and logger', async () => {
      let capturedTx: any;
      let capturedLogger: any;

      await withTransaction(
        async ({ tx, logger: ctxLogger }) => {
          capturedTx = tx;
          capturedLogger = ctxLogger;

          expect(tx).toBeDefined();
          expect(ctxLogger).toBeDefined();
        },
        { logger, operationName: 'context-test' }
      );

      expect(capturedTx).toBeDefined();
      expect(capturedLogger).toBeDefined();
    });

    it('should use custom logger if provided', async () => {
      const customLogger = {
        info: (msg: string) => {},
        error: (msg: string) => {},
      };

      await withTransaction(
        async ({ logger: ctxLogger }) => {
          expect(ctxLogger).toBe(customLogger);
        },
        { logger: customLogger, operationName: 'custom-logger-test' }
      );
    });
  });

  describe('Error Handling', () => {
    it('should preserve original error message', async () => {
      const errorMessage = 'Custom error message';

      try {
        await withTransaction(
          async () => {
            throw new Error(errorMessage);
          },
          { logger, operationName: 'error-preserve-test' }
        );

        expect(true).toBe(false);
      } catch (error) {
        expect((error as Error).message).toBe(errorMessage);
      }
    });

    it('should handle database errors', async () => {
      try {
        await withTransaction(
          async ({ tx }) => {
            // 尝试插入重复的ID（违反唯一约束）
            await tx.insert(users).values({
              id: testUserId, // 重复的ID
              email: 'test@example.com',
              userName: 'Test',
              userRole: 'user',
              status: 'active',
            });
          },
          { logger, operationName: 'db-error-test' }
        );

        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Transaction Isolation', () => {
    it('should handle multiple concurrent transactions', async () => {
      // 测试多个事务并发执行
      const createBank = (title: string) =>
        withTransaction(
          async ({ tx }) => {
            const [bank] = await tx
              .insert(questionBanks)
              .values({
                title,
                userId: testUserId,
              })
              .returning();
            return bank;
          },
          { logger, operationName: `concurrent-${title}` }
        );

      // 并发创建3个题库
      const results = await Promise.all([
        createBank('Concurrent Bank 1'),
        createBank('Concurrent Bank 2'),
        createBank('Concurrent Bank 3'),
      ]);

      // 所有事务都应该成功
      expect(results.length).toBe(3);
      expect(results.every((r) => r.title !== undefined)).toBe(true);

      // 验证数据库中有3条记录
      const banks = await db
        .select()
        .from(questionBanks)
        .where(
          and(
            eq(questionBanks.userId, testUserId),
            sql`${questionBanks.title} IN ('Concurrent Bank 1', 'Concurrent Bank 2', 'Concurrent Bank 3')`
          )
        );

      expect(banks.length).toBe(3);
    });
  });
});
