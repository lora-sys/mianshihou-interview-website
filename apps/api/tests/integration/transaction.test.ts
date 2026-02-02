import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { db } from '../../index';
import {
  questionBanks,
  questionBankQuestions,
  questions,
  posts,
  postThumbs,
  postFavours,
  users,
} from '../../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { withTransaction } from '../../lib/transaction';
import { logger } from '../../lib/logger';

describe('Database Transaction Integration Tests', () => {
  let testUserId: string;
  let testPostId: number;

  beforeAll(async () => {
    // 创建测试用户
    testUserId = `integration-test-${Date.now()}`;
    await db.insert(users).values({
      id: testUserId,
      email: `integration-${Date.now()}@example.com`,
      userName: 'Integration Test User',
      userRole: 'admin',
      status: 'active',
    });
  });

  afterAll(async () => {
    // 清理测试数据
    await db.delete(postFavours).where(eq(postFavours.userId, testUserId));
    await db.delete(postThumbs).where(eq(postThumbs.userId, testUserId));
    await db.delete(posts).where(eq(posts.userId, testUserId));
    await db.delete(questionBankQuestions).where(eq(questionBankQuestions.userId, testUserId));
    await db.delete(questions).where(eq(questions.userId, testUserId));
    await db.delete(questionBanks).where(eq(questionBanks.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  beforeEach(async () => {
    // 每个测试前清理特定数据
    await db.delete(postFavours).where(eq(postFavours.userId, testUserId));
    await db.delete(postThumbs).where(eq(postThumbs.userId, testUserId));
    await db.delete(posts).where(eq(posts.userId, testUserId));
    await db.delete(questionBankQuestions).where(eq(questionBankQuestions.userId, testUserId));
    await db.delete(questions).where(eq(questions.userId, testUserId));
    await db.delete(questionBanks).where(eq(questionBanks.userId, testUserId));
  });

  describe('Question Bank Transaction', () => {
    describe('Add Question', () => {
      it('should atomically add question to bank and update count', async () => {
        // 创建题库
        const [bank] = await db
          .insert(questionBanks)
          .values({
            title: 'Test Bank',
            userId: testUserId,
          })
          .returning();

        // 创建题目
        const [question] = await db
          .insert(questions)
          .values({
            title: 'Test Question',
            content: 'Test content',
            userId: testUserId,
          })
          .returning();

        // 使用事务添加题目到题库
        const result = await withTransaction(
          async ({ tx }) => {
            // 检查题库是否存在
            const [existingBank] = await tx
              .select()
              .from(questionBanks)
              .where(and(eq(questionBanks.id, bank.id), eq(questionBanks.isDelete, false)))
              .limit(1);

            if (!existingBank) {
              throw new Error('Question bank not found');
            }

            // 检查题目是否存在
            const [existingQuestion] = await tx
              .select()
              .from(questions)
              .where(and(eq(questions.id, question.id), eq(questions.isDelete, false)))
              .limit(1);

            if (!existingQuestion) {
              throw new Error('Question not found');
            }

            // 检查是否已关联
            const [existingRelation] = await tx
              .select()
              .from(questionBankQuestions)
              .where(
                and(
                  eq(questionBankQuestions.questionBankId, bank.id),
                  eq(questionBankQuestions.questionId, question.id)
                )
              )
              .limit(1);

            if (existingRelation) {
              throw new Error('Question already in bank');
            }

            // 添加关联
            const [newRelation] = await tx
              .insert(questionBankQuestions)
              .values({
                questionBankId: bank.id,
                questionId: question.id,
                userId: testUserId,
              })
              .returning();

            // 更新题库计数
            await tx
              .update(questionBanks)
              .set({
                questionCount: sql`${questionBanks.questionCount} + 1`,
                updateTime: new Date(),
              })
              .where(eq(questionBanks.id, bank.id));

            return { bank, question, relation: newRelation };
          },
          { logger, operationName: 'integration-addQuestion' }
        );

        expect(result.relation).toBeDefined();
        expect(result.relation.questionBankId).toBe(bank.id);
        expect(result.relation.questionId).toBe(question.id);

        // 验证数据库中的数据
        const [updatedBank] = await db
          .select()
          .from(questionBanks)
          .where(eq(questionBanks.id, bank.id))
          .limit(1);

        expect(updatedBank.questionCount).toBe(1);

        const [relation] = await db
          .select()
          .from(questionBankQuestions)
          .where(
            and(
              eq(questionBankQuestions.questionBankId, bank.id),
              eq(questionBankQuestions.questionId, question.id)
            )
          )
          .limit(1);

        expect(relation).toBeDefined();
      });

      it('should rollback if question already in bank', async () => {
        // 创建题库和题目
        const [bank] = await db
          .insert(questionBanks)
          .values({
            title: 'Test Bank',
            userId: testUserId,
          })
          .returning();

        const [question] = await db
          .insert(questions)
          .values({
            title: 'Test Question',
            content: 'Test content',
            userId: testUserId,
          })
          .returning();

        // 先添加一次
        await db.insert(questionBankQuestions).values({
          questionBankId: bank.id,
          questionId: question.id,
          userId: testUserId,
        });

        await db
          .update(questionBanks)
          .set({
            questionCount: sql`${questionBanks.questionCount} + 1`,
            updateTime: new Date(),
          })
          .where(eq(questionBanks.id, bank.id));

        const beforeCount = await db
          .select({ count: questionBanks.questionCount })
          .from(questionBanks)
          .where(eq(questionBanks.id, bank.id))
          .limit(1);

        // 尝试再次添加（应该失败并回滚）
        try {
          await withTransaction(
            async ({ tx }) => {
              // 检查是否已关联
              const [existingRelation] = await tx
                .select()
                .from(questionBankQuestions)
                .where(
                  and(
                    eq(questionBankQuestions.questionBankId, bank.id),
                    eq(questionBankQuestions.questionId, question.id)
                  )
                )
                .limit(1);

              if (existingRelation) {
                throw new Error('Question already in bank');
              }

              // 尝试添加
              await tx.insert(questionBankQuestions).values({
                questionBankId: bank.id,
                questionId: question.id,
                userId: testUserId,
              });

              // 更新计数
              await tx
                .update(questionBanks)
                .set({
                  questionCount: sql`${questionBanks.questionCount} + 1`,
                  updateTime: new Date(),
                })
                .where(eq(questionBanks.id, bank.id));
            },
            { logger, operationName: 'integration-addQuestion-duplicate' }
          );

          expect(true).toBe(false); // 不应该到达这里
        } catch (error) {
          expect((error as Error).message).toBe('Question already in bank');
        }

        // 验证计数没有变化
        const afterCount = await db
          .select({ count: questionBanks.questionCount })
          .from(questionBanks)
          .where(eq(questionBanks.id, bank.id))
          .limit(1);

        expect(afterCount[0].count).toBe(beforeCount[0].count);
      });
    });

    describe('Remove Question', () => {
      it('should atomically remove question and update count', async () => {
        // 创建题库和题目
        const [bank] = await db
          .insert(questionBanks)
          .values({
            title: 'Test Bank',
            userId: testUserId,
          })
          .returning();

        const [question] = await db
          .insert(questions)
          .values({
            title: 'Test Question',
            content: 'Test content',
            userId: testUserId,
          })
          .returning();

        // 添加关联
        await db.insert(questionBankQuestions).values({
          questionBankId: bank.id,
          questionId: question.id,
          userId: testUserId,
        });

        // 更新计数
        await db
          .update(questionBanks)
          .set({
            questionCount: sql`${questionBanks.questionCount} + 1`,
            updateTime: new Date(),
          })
          .where(eq(questionBanks.id, bank.id));

        // 使用事务移除题目
        await withTransaction(
          async ({ tx }) => {
            // 检查关联是否存在
            const [relation] = await tx
              .select()
              .from(questionBankQuestions)
              .where(
                and(
                  eq(questionBankQuestions.questionBankId, bank.id),
                  eq(questionBankQuestions.questionId, question.id)
                )
              )
              .limit(1);

            if (!relation) {
              throw new Error('Relation not found');
            }

            // 删除关联
            await tx
              .delete(questionBankQuestions)
              .where(
                and(
                  eq(questionBankQuestions.questionBankId, bank.id),
                  eq(questionBankQuestions.questionId, question.id)
                )
              );

            // 更新计数
            await tx
              .update(questionBanks)
              .set({
                questionCount: sql`${questionBanks.questionCount} - 1`,
                updateTime: new Date(),
              })
              .where(eq(questionBanks.id, bank.id));
          },
          { logger, operationName: 'integration-removeQuestion' }
        );

        // 验证关联已删除
        const [relation] = await db
          .select()
          .from(questionBankQuestions)
          .where(
            and(
              eq(questionBankQuestions.questionBankId, bank.id),
              eq(questionBankQuestions.questionId, question.id)
            )
          )
          .limit(1);

        expect(relation).toBeUndefined();

        // 验证计数已更新
        const [updatedBank] = await db
          .select()
          .from(questionBanks)
          .where(eq(questionBanks.id, bank.id))
          .limit(1);

        expect(updatedBank.questionCount).toBe(0);
      });
    });
  });

  describe('Post Thumb Transaction', () => {
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

    describe('Create Thumb', () => {
      it('should atomically create thumb and update count', async () => {
        const initialPost = await db
          .select({ thumbNum: posts.thumbNum })
          .from(posts)
          .where(eq(posts.id, BigInt(testPostId)))
          .limit(1);

        expect(initialPost[0]?.thumbNum).toBe(0);

        // 使用事务点赞
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

            // 更新点赞数
            await tx
              .update(posts)
              .set({
                thumbNum: sql`${posts.thumbNum} + 1`,
                updateTime: new Date(),
              })
              .where(eq(posts.id, BigInt(testPostId)));
          },
          { logger, operationName: 'integration-createThumb' }
        );

        // 验证点赞记录
        const [thumb] = await db
          .select()
          .from(postThumbs)
          .where(and(eq(postThumbs.postId, BigInt(testPostId)), eq(postThumbs.userId, testUserId)))
          .limit(1);

        expect(thumb).toBeDefined();

        // 验证点赞数
        const [updatedPost] = await db
          .select({ thumbNum: posts.thumbNum })
          .from(posts)
          .where(eq(posts.id, BigInt(testPostId)))
          .limit(1);

        expect(updatedPost.thumbNum).toBe(1);
      });

      it('should rollback if already liked', async () => {
        // 先点赞一次
        await db.insert(postThumbs).values({
          postId: BigInt(testPostId),
          userId: testUserId,
        });

        await db
          .update(posts)
          .set({
            thumbNum: sql`${posts.thumbNum} + 1`,
            updateTime: new Date(),
          })
          .where(eq(posts.id, BigInt(testPostId)));

        const beforeCount = await db
          .select({ thumbNum: posts.thumbNum })
          .from(posts)
          .where(eq(posts.id, BigInt(testPostId)))
          .limit(1);

        // 尝试再次点赞（应该失败）
        try {
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

              // 尝试添加
              await tx.insert(postThumbs).values({
                postId: BigInt(testPostId),
                userId: testUserId,
              });

              // 更新计数
              await tx
                .update(posts)
                .set({
                  thumbNum: sql`${posts.thumbNum} + 1`,
                  updateTime: new Date(),
                })
                .where(eq(posts.id, BigInt(testPostId)));
            },
            { logger, operationName: 'integration-createThumb-duplicate' }
          );

          expect(true).toBe(false);
        } catch (error) {
          expect((error as Error).message).toBe('Already liked');
        }

        // 验证计数没有变化
        const afterCount = await db
          .select({ thumbNum: posts.thumbNum })
          .from(posts)
          .where(eq(posts.id, BigInt(testPostId)))
          .limit(1);

        expect(afterCount[0].thumbNum).toBe(beforeCount[0].thumbNum);
      });
    });

    describe('Delete Thumb', () => {
      it('should atomically delete thumb and update count', async () => {
        // 先点赞
        await db.insert(postThumbs).values({
          postId: BigInt(testPostId),
          userId: testUserId,
        });

        await db
          .update(posts)
          .set({
            thumbNum: sql`${posts.thumbNum} + 1`,
            updateTime: new Date(),
          })
          .where(eq(posts.id, BigInt(testPostId)));

        // 使用事务取消点赞
        await withTransaction(
          async ({ tx }) => {
            // 检查点赞记录是否存在
            const [thumb] = await tx
              .select()
              .from(postThumbs)
              .where(
                and(eq(postThumbs.postId, BigInt(testPostId)), eq(postThumbs.userId, testUserId))
              )
              .limit(1);

            if (!thumb) {
              throw new Error('Thumb not found');
            }

            // 删除点赞记录
            await tx
              .delete(postThumbs)
              .where(
                and(eq(postThumbs.postId, BigInt(testPostId)), eq(postThumbs.userId, testUserId))
              );

            // 更新点赞数
            await tx
              .update(posts)
              .set({
                thumbNum: sql`${posts.thumbNum} - 1`,
                updateTime: new Date(),
              })
              .where(eq(posts.id, BigInt(testPostId)));
          },
          { logger, operationName: 'integration-deleteThumb' }
        );

        // 验证点赞记录已删除
        const [thumb] = await db
          .select()
          .from(postThumbs)
          .where(and(eq(postThumbs.postId, BigInt(testPostId)), eq(postThumbs.userId, testUserId)))
          .limit(1);

        expect(thumb).toBeUndefined();

        // 验证点赞数
        const [post] = await db
          .select({ thumbNum: posts.thumbNum })
          .from(posts)
          .where(eq(posts.id, BigInt(testPostId)))
          .limit(1);

        expect(post.thumbNum).toBe(0);
      });
    });
  });

  describe('Post Favour Transaction', () => {
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

    describe('Create Favour', () => {
      it('should atomically create favour and update count', async () => {
        const initialPost = await db
          .select({ favourNum: posts.favourNum })
          .from(posts)
          .where(eq(posts.id, BigInt(testPostId)))
          .limit(1);

        expect(initialPost[0]?.favourNum).toBe(0);

        // 使用事务收藏
        await withTransaction(
          async ({ tx }) => {
            // 检查是否已收藏
            const [existing] = await tx
              .select()
              .from(postFavours)
              .where(
                and(eq(postFavours.postId, BigInt(testPostId)), eq(postFavours.userId, testUserId))
              )
              .limit(1);

            if (existing) {
              throw new Error('Already favoured');
            }

            // 添加收藏记录
            await tx.insert(postFavours).values({
              postId: BigInt(testPostId),
              userId: testUserId,
            });

            // 更新收藏数
            await tx
              .update(posts)
              .set({
                favourNum: sql`${posts.favourNum} + 1`,
                updateTime: new Date(),
              })
              .where(eq(posts.id, BigInt(testPostId)));
          },
          { logger, operationName: 'integration-createFavour' }
        );

        // 验证收藏记录
        const [favour] = await db
          .select()
          .from(postFavours)
          .where(
            and(eq(postFavours.postId, BigInt(testPostId)), eq(postFavours.userId, testUserId))
          )
          .limit(1);

        expect(favour).toBeDefined();

        // 验证收藏数
        const [updatedPost] = await db
          .select({ favourNum: posts.favourNum })
          .from(posts)
          .where(eq(posts.id, BigInt(testPostId)))
          .limit(1);

        expect(updatedPost.favourNum).toBe(1);
      });

      it('should rollback if already favoured', async () => {
        // 先收藏一次
        await db.insert(postFavours).values({
          postId: BigInt(testPostId),
          userId: testUserId,
        });

        await db
          .update(posts)
          .set({
            favourNum: sql`${posts.favourNum} + 1`,
            updateTime: new Date(),
          })
          .where(eq(posts.id, BigInt(testPostId)));

        const beforeCount = await db
          .select({ favourNum: posts.favourNum })
          .from(posts)
          .where(eq(posts.id, BigInt(testPostId)))
          .limit(1);

        // 尝试再次收藏（应该失败）
        try {
          await withTransaction(
            async ({ tx }) => {
              // 检查是否已收藏
              const [existing] = await tx
                .select()
                .from(postFavours)
                .where(
                  and(
                    eq(postFavours.postId, BigInt(testPostId)),
                    eq(postFavours.userId, testUserId)
                  )
                )
                .limit(1);

              if (existing) {
                throw new Error('Already favoured');
              }

              // 尝试添加
              await tx.insert(postFavours).values({
                postId: BigInt(testPostId),
                userId: testUserId,
              });

              // 更新计数
              await tx
                .update(posts)
                .set({
                  favourNum: sql`${posts.favourNum} + 1`,
                  updateTime: new Date(),
                })
                .where(eq(posts.id, BigInt(testPostId)));
            },
            { logger, operationName: 'integration-createFavour-duplicate' }
          );

          expect(true).toBe(false);
        } catch (error) {
          expect((error as Error).message).toBe('Already favoured');
        }

        // 验证计数没有变化
        const afterCount = await db
          .select({ favourNum: posts.favourNum })
          .from(posts)
          .where(eq(posts.id, BigInt(testPostId)))
          .limit(1);

        expect(afterCount[0].favourNum).toBe(beforeCount[0].favourNum);
      });
    });

    describe('Delete Favour', () => {
      it('should atomically delete favour and update count', async () => {
        // 先收藏
        await db.insert(postFavours).values({
          postId: BigInt(testPostId),
          userId: testUserId,
        });

        await db
          .update(posts)
          .set({
            favourNum: sql`${posts.favourNum} + 1`,
            updateTime: new Date(),
          })
          .where(eq(posts.id, BigInt(testPostId)));

        // 使用事务取消收藏
        await withTransaction(
          async ({ tx }) => {
            // 检查收藏记录是否存在
            const [favour] = await tx
              .select()
              .from(postFavours)
              .where(
                and(eq(postFavours.postId, BigInt(testPostId)), eq(postFavours.userId, testUserId))
              )
              .limit(1);

            if (!favour) {
              throw new Error('Favour not found');
            }

            // 删除收藏记录
            await tx
              .delete(postFavours)
              .where(
                and(eq(postFavours.postId, BigInt(testPostId)), eq(postFavours.userId, testUserId))
              );

            // 更新收藏数
            await tx
              .update(posts)
              .set({
                favourNum: sql`${posts.favourNum} - 1`,
                updateTime: new Date(),
              })
              .where(eq(posts.id, BigInt(testPostId)));
          },
          { logger, operationName: 'integration-deleteFavour' }
        );

        // 验证收藏记录已删除
        const [favour] = await db
          .select()
          .from(postFavours)
          .where(
            and(eq(postFavours.postId, BigInt(testPostId)), eq(postFavours.userId, testUserId))
          )
          .limit(1);

        expect(favour).toBeUndefined();

        // 验证收藏数
        const [post] = await db
          .select({ favourNum: posts.favourNum })
          .from(posts)
          .where(eq(posts.id, BigInt(testPostId)))
          .limit(1);

        expect(post.favourNum).toBe(0);
      });
    });
  });

  describe('Concurrent Transactions', () => {
    it('should handle concurrent thumb operations correctly', async () => {
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

      // 创建多个用户
      const userIds = Array(5)
        .fill(0)
        .map((_, i) => `concurrent-user-${Date.now()}-${i}`);

      // 批量创建用户
      const userRecords = userIds.map((userId) => ({
        id: userId,
        email: `test-${userId}@example.com`,
        userName: `User ${userId}`,
        userRole: 'user' as const,
        status: 'active' as const,
      }));

      await db.insert(users).values(userRecords);

      // 并发点赞
      const promises = userIds.map((userId) =>
        withTransaction(
          async ({ tx }) => {
            // 检查是否已点赞
            const [existing] = await tx
              .select()
              .from(postThumbs)
              .where(and(eq(postThumbs.postId, BigInt(testPostId)), eq(postThumbs.userId, userId)))
              .limit(1);

            if (existing) {
              throw new Error('Already liked');
            }

            // 添加点赞记录
            await tx.insert(postThumbs).values({
              postId: BigInt(testPostId),
              userId,
            });

            // 更新点赞数
            await tx
              .update(posts)
              .set({
                thumbNum: sql`${posts.thumbNum} + 1`,
                updateTime: new Date(),
              })
              .where(eq(posts.id, BigInt(testPostId)));
          },
          { logger, operationName: `concurrent-thumb-${userId}` }
        ).catch((error) => {
          // 可能因为并发冲突而失败
          return null;
        })
      );

      await Promise.all(promises);

      // 验证最终状态
      const [updatedPost] = await db
        .select({ thumbNum: posts.thumbNum })
        .from(posts)
        .where(eq(posts.id, BigInt(testPostId)))
        .limit(1);

      // 点赞数应该等于成功添加的点赞记录数
      const thumbs = await db
        .select()
        .from(postThumbs)
        .where(eq(postThumbs.postId, BigInt(testPostId)));

      expect(updatedPost.thumbNum).toBe(thumbs.length);
      expect(thumbs.length).toBeGreaterThan(0);

      // 清理
      await db.delete(postThumbs).where(eq(postThumbs.postId, BigInt(testPostId)));
      for (const userId of userIds) {
        await db.delete(users).where(eq(users.id, userId));
      }
    });
  });
});
