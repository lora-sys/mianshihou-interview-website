import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { db } from '../../index';
import {
  sessions,
  verifications,
  accounts,
  posts,
  questions,
  questionBanks,
  users,
} from '../../db/schema';
import { eq, lt, and } from 'drizzle-orm';
import { cleanupExpiredSessions } from '../../tasks/cleanup/sessions';
import { cleanupSoftDeletedData as cleanupSoftDeleted } from '../../tasks/cleanup/soft-delete';
import { cleanupExpiredVerifications as cleanupExpiredVerif } from '../../tasks/cleanup/verification';
import { cleanupExpiredTokens as cleanupExpiredTok } from '../../tasks/cleanup/tokens';

describe('Cleanup Tasks', () => {
  describe('cleanupExpiredSessions', () => {
    let testUserId: string;
    let expiredSessionId: string;
    let validSessionId: string;

    beforeEach(async () => {
      testUserId = `test-cleanup-${Date.now()}`;

      // 先创建用户
      await db.insert(users).values({
        id: testUserId,
        userAccount: `test-${Date.now()}`,
        userName: 'Test User',
        userRole: 'user',
        status: 'active',
      });

      // 创建已过期的会话
      expiredSessionId = `expired-${Date.now()}`;
      const expiredDate = new Date(Date.now() - 1000 * 60 * 60); // 1小时前过期
      await db.insert(sessions).values({
        id: expiredSessionId,
        userId: testUserId,
        expiresAt: expiredDate,
        token: `token-expired-${Date.now()}`,
      });

      // 创建有效的会话
      validSessionId = `valid-${Date.now()}`;
      const validDate = new Date(Date.now() + 1000 * 60 * 60); // 1小时后过期
      await db.insert(sessions).values({
        id: validSessionId,
        userId: testUserId,
        expiresAt: validDate,
        token: `token-valid-${Date.now()}`,
      });
    });

    afterEach(async () => {
      // 清理测试数据
      await db.delete(sessions).where(eq(sessions.userId, testUserId));
      await db.delete(users).where(eq(users.id, testUserId));
    });

    it('should cleanup expired sessions', async () => {
      const result = await cleanupExpiredSessions();

      expect(result.deletedCount).toBe(1);
      expect(result.taskName).toBe('cleanupExpiredSessions');
      expect(result.details?.sessionsDeleted).toBe(1);

      // 验证过期会话已被删除
      const expiredSession = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, expiredSessionId))
        .limit(1);

      expect(expiredSession.length).toBe(0);

      // 验证有效会话仍存在
      const validSession = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, validSessionId))
        .limit(1);

      expect(validSession.length).toBe(1);
    });

    it('should handle no expired sessions', async () => {
      // 先清理所有测试会话
      await db.delete(sessions).where(eq(sessions.userId, testUserId));

      // 创建有效会话
      const validSessionId = `valid-${Date.now()}`;
      const validDate = new Date(Date.now() + 1000 * 60 * 60);
      await db.insert(sessions).values({
        id: validSessionId,
        userId: testUserId,
        expiresAt: validDate,
        token: `token-valid-${Date.now()}`,
      });

      const result = await cleanupExpiredSessions();

      expect(result.deletedCount).toBe(0);
      expect(result.details?.sessionsDeleted).toBe(0);
    });
  });

  describe('cleanupExpiredVerifications', () => {
    let testIdentifier: string;
    let expiredVerificationId: string;
    let validVerificationId: string;

    beforeEach(async () => {
      testIdentifier = `test@example.com`;

      // 创建已过期的验证码
      expiredVerificationId = `expired-${Date.now()}`;
      const expiredDate = new Date(Date.now() - 1000 * 60 * 5); // 5分钟前过期
      await db.insert(verifications).values({
        id: expiredVerificationId,
        identifier: testIdentifier,
        value: '123456',
        expiresAt: expiredDate,
      });

      // 创建有效的验证码
      validVerificationId = `valid-${Date.now()}`;
      const validDate = new Date(Date.now() + 1000 * 60 * 5); // 5分钟后过期
      await db.insert(verifications).values({
        id: validVerificationId,
        identifier: testIdentifier,
        value: '654321',
        expiresAt: validDate,
      });
    });

    afterEach(async () => {
      // 清理测试数据
      await db.delete(verifications).where(eq(verifications.identifier, testIdentifier));
    });

    it('should cleanup expired verifications', async () => {
      const result = await cleanupExpiredVerif();

      expect(result.deletedCount).toBe(1);
      expect(result.taskName).toBe('cleanupExpiredVerifications');
      expect(result.details?.verificationsDeleted).toBe(1);

      // 验证过期验证码已被删除
      const expiredVerification = await db
        .select()
        .from(verifications)
        .where(eq(verifications.id, expiredVerificationId))
        .limit(1);

      expect(expiredVerification.length).toBe(0);

      // 验证有效验证码仍存在
      const validVerification = await db
        .select()
        .from(verifications)
        .where(eq(verifications.id, validVerificationId))
        .limit(1);

      expect(validVerification.length).toBe(1);
    });

    it('should handle no expired verifications', async () => {
      // 先清理所有测试验证码
      await db.delete(verifications).where(eq(verifications.identifier, testIdentifier));

      // 创建有效验证码
      const validVerificationId = `valid-${Date.now()}`;
      const validDate = new Date(Date.now() + 1000 * 60 * 5);
      await db.insert(verifications).values({
        id: validVerificationId,
        identifier: testIdentifier,
        value: '654321',
        expiresAt: validDate,
      });

      const result = await cleanupExpiredVerif();

      expect(result.deletedCount).toBe(0);
      expect(result.details?.verificationsDeleted).toBe(0);
    });
  });

  describe('cleanupExpiredTokens', () => {
    let testUserId: string;
    let expiredAccountId: string;
    let validAccountId: string;

    beforeEach(async () => {
      testUserId = `test-cleanup-${Date.now()}`;

      // 先创建用户
      await db.insert(users).values({
        id: testUserId,
        userAccount: `test-${Date.now()}`,
        userName: 'Test User',
        userRole: 'user',
        status: 'active',
      });

      // 创建已过期的Token账户
      expiredAccountId = `expired-${Date.now()}`;
      const expiredDate = new Date(Date.now() - 1000 * 60 * 60); // 1小时前过期
      await db.insert(accounts).values({
        id: expiredAccountId,
        userId: testUserId,
        accountId: '123456789',
        providerId: 'test-provider',
        accessTokenExpiresAt: expiredDate,
        refreshTokenExpiresAt: expiredDate,
      });

      // 创建有效的Token账户（访问令牌未过期）
      validAccountId = `valid-${Date.now()}`;
      const validDate = new Date(Date.now() + 1000 * 60 * 60); // 1小时后过期
      await db.insert(accounts).values({
        id: validAccountId,
        userId: testUserId,
        accountId: '987654321',
        providerId: 'test-provider',
        accessTokenExpiresAt: validDate,
        refreshTokenExpiresAt: validDate,
      });
    });

    afterEach(async () => {
      // 清理测试数据
      await db.delete(accounts).where(eq(accounts.userId, testUserId));
      await db.delete(users).where(eq(users.id, testUserId));
    });

    it('should cleanup expired tokens', async () => {
      const result = await cleanupExpiredTok();

      expect(result.deletedCount).toBe(1);
      expect(result.taskName).toBe('cleanupExpiredTokens');
      expect(result.details?.accountsDeleted).toBe(1);

      // 验证过期账户已被删除
      const expiredAccount = await db
        .select()
        .from(accounts)
        .where(eq(accounts.id, expiredAccountId))
        .limit(1);

      expect(expiredAccount.length).toBe(0);

      // 验证有效账户仍存在
      const validAccount = await db
        .select()
        .from(accounts)
        .where(eq(accounts.id, validAccountId))
        .limit(1);

      expect(validAccount.length).toBe(1);
    });

    it('should not cleanup if only one token expired', async () => {
      // 创建只有访问令牌过期的账户
      const partialExpiredId = `partial-${Date.now()}`;
      const expiredDate = new Date(Date.now() - 1000 * 60 * 60);
      const validDate = new Date(Date.now() + 1000 * 60 * 60);
      await db.insert(accounts).values({
        id: partialExpiredId,
        userId: testUserId,
        accountId: '111111111',
        providerId: 'test-provider',
        accessTokenExpiresAt: expiredDate,
        refreshTokenExpiresAt: validDate,
      });

      const result = await cleanupExpiredTok();

      // 只有完全过期的账户被删除
      expect(result.deletedCount).toBe(1);

      // 验证部分过期的账户仍存在
      const partialExpiredAccount = await db
        .select()
        .from(accounts)
        .where(eq(accounts.id, partialExpiredId))
        .limit(1);

      expect(partialExpiredAccount.length).toBe(1);

      // 清理
      await db.delete(accounts).where(eq(accounts.id, partialExpiredId));
    });
  });

  describe('cleanupSoftDeletedData', () => {
    let testUserId: string;
    let expiredPostId: number;
    let recentPostId: number;
    let expiredQuestionId: number;
    let recentQuestionId: number;
    let expiredBankId: number;
    let recentBankId: number;

    beforeEach(async () => {
      testUserId = `test-cleanup-${Date.now()}`;

      // 先创建用户
      await db.insert(users).values({
        id: testUserId,
        userAccount: `test-${Date.now()}`,
        userName: 'Test User',
        userRole: 'user',
        status: 'active',
      });

      const ninetyOneDaysAgo = new Date();
      ninetyOneDaysAgo.setDate(ninetyOneDaysAgo.getDate() - 91);

      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

      // 创建91天前的软删除帖子
      const [expiredPost] = await db
        .insert(posts)
        .values({
          title: 'Expired Post',
          content: 'Test content',
          userId: testUserId,
          isDelete: true,
          updateTime: ninetyOneDaysAgo,
        })
        .returning();
      expiredPostId = Number(expiredPost.id);

      // 创建8天前的软删除帖子
      const [recentPost] = await db
        .insert(posts)
        .values({
          title: 'Recent Post',
          content: 'Test content',
          userId: testUserId,
          isDelete: true,
          updateTime: eightDaysAgo,
        })
        .returning();
      recentPostId = Number(recentPost.id);

      // 创建91天前的软删除题目
      const [expiredQuestion] = await db
        .insert(questions)
        .values({
          title: 'Expired Question',
          content: 'Test content',
          userId: testUserId,
          isDelete: true,
          updateTime: ninetyOneDaysAgo,
        })
        .returning();
      expiredQuestionId = expiredQuestion.id;

      // 创建8天前的软删除题目
      const [recentQuestion] = await db
        .insert(questions)
        .values({
          title: 'Recent Question',
          content: 'Test content',
          userId: testUserId,
          isDelete: true,
          updateTime: eightDaysAgo,
        })
        .returning();
      recentQuestionId = recentQuestion.id;

      // 创建91天前的软删除题库
      const [expiredBank] = await db
        .insert(questionBanks)
        .values({
          title: 'Expired Bank',
          description: 'Test description',
          userId: testUserId,
          isDelete: true,
          updateTime: ninetyOneDaysAgo,
        })
        .returning();
      expiredBankId = expiredBank.id;

      // 创建8天前的软删除题库
      const [recentBank] = await db
        .insert(questionBanks)
        .values({
          title: 'Recent Bank',
          description: 'Test description',
          userId: testUserId,
          isDelete: true,
          updateTime: eightDaysAgo,
        })
        .returning();
      recentBankId = recentBank.id;
    });

    afterEach(async () => {
      // 清理测试数据
      await db.delete(posts).where(eq(posts.userId, testUserId));
      await db.delete(questions).where(eq(questions.userId, testUserId));
      await db.delete(questionBanks).where(eq(questionBanks.userId, testUserId));
      await db.delete(users).where(eq(users.id, testUserId));
    });

    it('should cleanup soft deleted data older than 90 days', async () => {
      const result = await cleanupSoftDeleted();

      expect(result.deletedCount).toBe(3);
      expect(result.taskName).toBe('cleanupSoftDeletedData');
      expect(result.details?.postsDeleted).toBe(1);
      expect(result.details?.questionsDeleted).toBe(1);
      expect(result.details?.banksDeleted).toBe(1);

      // 验证过期的软删除数据已被删除
      const expiredPost = await db
        .select()
        .from(posts)
        .where(eq(posts.id, BigInt(expiredPostId)))
        .limit(1);

      expect(expiredPost.length).toBe(0);

      const expiredQuestion = await db
        .select()
        .from(questions)
        .where(eq(questions.id, expiredQuestionId))
        .limit(1);

      expect(expiredQuestion.length).toBe(0);

      const expiredBank = await db
        .select()
        .from(questionBanks)
        .where(eq(questionBanks.id, expiredBankId))
        .limit(1);

      expect(expiredBank.length).toBe(0);

      // 验证最近的软删除数据仍存在
      const recentPost = await db
        .select()
        .from(posts)
        .where(eq(posts.id, BigInt(recentPostId)))
        .limit(1);

      expect(recentPost.length).toBe(1);

      const recentQuestion = await db
        .select()
        .from(questions)
        .where(eq(questions.id, recentQuestionId))
        .limit(1);

      expect(recentQuestion.length).toBe(1);

      const recentBank = await db
        .select()
        .from(questionBanks)
        .where(eq(questionBanks.id, recentBankId))
        .limit(1);

      expect(recentBank.length).toBe(1);
    });

    it('should not cleanup non-deleted data', async () => {
      // 创建未删除的帖子
      const [nonDeletedPost] = await db
        .insert(posts)
        .values({
          title: 'Non Deleted Post',
          content: 'Test content',
          userId: testUserId,
          isDelete: false,
        })
        .returning();

      const result = await cleanupSoftDeleted();

      // 只有软删除的过期数据被删除
      expect(result.deletedCount).toBe(3);

      // 验证未删除的数据仍存在
      const nonDeleted = await db
        .select()
        .from(posts)
        .where(eq(posts.id, nonDeletedPost.id))
        .limit(1);

      expect(nonDeleted.length).toBe(1);

      // 清理
      await db.delete(posts).where(eq(posts.id, nonDeletedPost.id));
    });
  });
});
