import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import { redis } from '../../lib/redis';
import {
  handleConcurrentLogin,
  getUserActiveDevices,
  revokeDevice,
  revokeAllDevices,
  cleanupUserSessions,
} from '../../lib/concurrent-login';

const TEST_USER_ID = 'test-user-concurrent-login-123';

describe('Concurrent Login', () => {
  beforeAll(async () => {
    // 确保 Redis 连接就绪，最多等待3秒
    if (redis.status !== 'ready') {
      await Promise.race([
        new Promise<void>((resolve) => {
          redis.on('ready', () => {
            console.log('Redis ready for concurrent-login tests');
            resolve();
          });
        }),
        new Promise<void>((resolve) =>
          setTimeout(() => {
            if (redis.status === 'ready') {
              resolve();
            } else {
              console.log('Redis connection timeout, checking status:', redis.status);
              resolve();
            }
          }, 3000)
        ),
      ]);
    }

    // 清理测试数据
    await cleanupUserSessions(TEST_USER_ID, []);
  });

  afterAll(async () => {
    // 清理测试数据
    await cleanupUserSessions(TEST_USER_ID, []);
  });

  test('应该允许第一个设备登录', async () => {
    const result = await handleConcurrentLogin(
      TEST_USER_ID,
      '192.168.1.1',
      'Mozilla/5.0 Chrome',
      'session-1',
      { maxDevices: 3, onNewLogin: 'kick_oldest' }
    );

    expect(result.allowed).toBe(true);
    expect(result.message).toBeUndefined();
  });

  test('应该允许在限制内的多个设备登录', async () => {
    // 添加第2个设备
    const result2 = await handleConcurrentLogin(
      TEST_USER_ID,
      '192.168.1.2',
      'Mozilla/5.0 Firefox',
      'session-2',
      { maxDevices: 3, onNewLogin: 'deny' }
    );
    expect(result2.allowed).toBe(true);

    // 添加第3个设备
    const result3 = await handleConcurrentLogin(
      TEST_USER_ID,
      '192.168.1.3',
      'Mozilla/5.0 Safari',
      'session-3',
      { maxDevices: 3, onNewLogin: 'deny' }
    );
    expect(result3.allowed).toBe(true);
  });

  test('deny 模式下第4个设备应该被拒绝', async () => {
    const result = await handleConcurrentLogin(
      TEST_USER_ID,
      '192.168.1.4',
      'Mozilla/5.0 Edge',
      'session-4',
      { maxDevices: 3, onNewLogin: 'deny' }
    );

    expect(result.allowed).toBe(false);
    expect(result.message).toContain('达到上限');
    expect(result.message).toContain('3');
  });

  test('应该允许已知设备重复登录', async () => {
    const result = await handleConcurrentLogin(
      TEST_USER_ID,
      '192.168.1.1',
      'Mozilla/5.0 Chrome',
      'session-1-2',
      { maxDevices: 3, onNewLogin: 'deny' }
    );

    expect(result.allowed).toBe(true);
  });

  test('kick_oldest 模式下应该踢出最旧的设备', async () => {
    // 先清理，确保从零开始
    await cleanupUserSessions(TEST_USER_ID, []);

    // 添加3个设备
    await handleConcurrentLogin(TEST_USER_ID, '192.168.1.1', 'Chrome', 's1', {
      maxDevices: 3,
      onNewLogin: 'kick_oldest',
    });
    await handleConcurrentLogin(TEST_USER_ID, '192.168.1.2', 'Firefox', 's2', {
      maxDevices: 3,
      onNewLogin: 'kick_oldest',
    });
    await handleConcurrentLogin(TEST_USER_ID, '192.168.1.3', 'Safari', 's3', {
      maxDevices: 3,
      onNewLogin: 'kick_oldest',
    });

    // 添加第4个设备，应该踢出最旧的
    const result = await handleConcurrentLogin(TEST_USER_ID, '192.168.1.4', 'Edge', 's4', {
      maxDevices: 3,
      onNewLogin: 'kick_oldest',
    });

    expect(result.allowed).toBe(true);

    // 验证设备数量
    const devices = await getUserActiveDevices(TEST_USER_ID);
    expect(devices.length).toBe(3);
  });

  test('应该正确获取用户活跃设备列表', async () => {
    const devices = await getUserActiveDevices(TEST_USER_ID);

    expect(devices.length).toBeGreaterThan(0);
    expect(devices.every((d) => d.fingerprint)).toBe(true);
    expect(devices.every((d) => d.deviceName)).toBe(true);
    expect(devices.every((d) => d.platform)).toBe(true);
    expect(devices.every((d) => d.browser)).toBe(true);
    expect(devices.every((d) => typeof d.firstSeen === 'number')).toBe(true);
    expect(devices.every((d) => typeof d.lastSeen === 'number')).toBe(true);
    expect(devices.every((d) => typeof d.sessionCount === 'number')).toBe(true);
  });

  test('应该能够踢出指定设备', async () => {
    const devicesBefore = await getUserActiveDevices(TEST_USER_ID);
    if (devicesBefore.length === 0) {
      // 添加一个设备用于测试
      await handleConcurrentLogin(
        TEST_USER_ID,
        '192.168.1.99',
        'TestBrowser',
        'session-revoke-test',
        { maxDevices: 3, onNewLogin: 'allow' }
      );
    }

    const devices = await getUserActiveDevices(TEST_USER_ID);
    const deviceToRemove = devices[0];

    await revokeDevice(TEST_USER_ID, deviceToRemove.fingerprint);

    const devicesAfter = await getUserActiveDevices(TEST_USER_ID);
    expect(devicesAfter.length).toBeLessThanOrEqual(devices.length);
    expect(devicesAfter.find((d) => d.fingerprint === deviceToRemove.fingerprint)).toBeUndefined();
  });

  test('应该能够踢出所有设备', async () => {
    // 添加一些设备
    await handleConcurrentLogin(TEST_USER_ID, '10.0.0.1', 'Chrome', 's10', {
      maxDevices: 3,
      onNewLogin: 'allow',
    });
    await handleConcurrentLogin(TEST_USER_ID, '10.0.0.2', 'Firefox', 's11', {
      maxDevices: 3,
      onNewLogin: 'allow',
    });

    // 踢出所有设备
    await revokeAllDevices(TEST_USER_ID);

    // 验证所有设备都被移除
    const devices = await getUserActiveDevices(TEST_USER_ID);
    expect(devices.length).toBe(0);
  });

  test('cleanupUserSessions 应该移除过期会话', async () => {
    // 添加一些设备
    await handleConcurrentLogin(TEST_USER_ID, '20.0.0.1', 'Chrome', 'active-session-1', {
      maxDevices: 3,
      onNewLogin: 'allow',
    });
    await handleConcurrentLogin(TEST_USER_ID, '20.0.0.2', 'Firefox', 'expired-session-1', {
      maxDevices: 3,
      onNewLogin: 'allow',
    });

    // 清理，只保留 active-session-1
    await cleanupUserSessions(TEST_USER_ID, ['active-session-1']);

    const devices = await getUserActiveDevices(TEST_USER_ID);
    // 第二个设备应该被移除，因为没有活跃会话
    expect(devices.length).toBe(1);
  });

  test('allow 模式下应该允许超过限制的设备登录', async () => {
    // 清理
    await cleanupUserSessions(TEST_USER_ID, []);

    // 添加5个设备，超过限制3
    const results = [];
    for (let i = 1; i <= 5; i++) {
      const result = await handleConcurrentLogin(
        TEST_USER_ID,
        `30.0.0.${i}`,
        `Browser${i}`,
        `session-allow-${i}`,
        { maxDevices: 3, onNewLogin: 'allow' }
      );
      results.push(result);
    }

    // 所有都应该被允许
    results.forEach((result, index) => {
      expect(result.allowed).toBe(true);
    });

    // 验证所有设备都被注册
    const devices = await getUserActiveDevices(TEST_USER_ID);
    expect(devices.length).toBe(5);
  });

  test('应该正确处理并发锁', async () => {
    // 清理
    await cleanupUserSessions(TEST_USER_ID, []);

    // 模拟并发登录
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        handleConcurrentLogin(
          TEST_USER_ID,
          `40.0.0.${i}`,
          `Concurrent${i}`,
          `session-concurrent-${i}`,
          { maxDevices: 3, onNewLogin: 'deny' }
        )
      );
    }

    const results = await Promise.all(promises);

    // 验证结果
    const allowedCount = results.filter((r) => r.allowed).length;
    expect(allowedCount).toBe(3); // 只有3个应该被允许
  });
});
