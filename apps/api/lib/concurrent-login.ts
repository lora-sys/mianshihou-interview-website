import { redis } from './redis';
import { logger } from './logger';
import { AppError } from './errors';
import { generateDeviceInfo } from './device-fingerprint';
import { db } from '../index';
import { sessions } from '../db/schema';
import { inArray } from 'drizzle-orm';

export interface ConcurrentConfig {
  maxDevices: number;
  onNewLogin: 'kick_oldest' | 'deny' | 'allow';
}

const DEFAULT_CONFIG: ConcurrentConfig = {
  maxDevices: 3,
  onNewLogin: 'kick_oldest',
};

/**
 * 检查并处理并发登录
 */
export async function handleConcurrentLogin(
  userId: string,
  ip: string,
  userAgent: string,
  deviceId: string | null,
  sessionId: string,
  config: ConcurrentConfig = DEFAULT_CONFIG
): Promise<{ allowed: boolean; message?: string; meta?: Record<string, any> }> {
  const deviceInfo = generateDeviceInfo(ip, userAgent, deviceId);

  try {
    // 获取分布式锁，防止并发问题
    const lockKey = `login_lock:${userId}`;
    const lockAcquired = await redis.set(lockKey, '1', 'EX', 5, 'NX');

    if (!lockAcquired) {
      // 获取锁失败，等待后重试
      await new Promise((resolve) => setTimeout(resolve, 100));
      return handleConcurrentLogin(userId, ip, userAgent, sessionId, config);
    }

    try {
      // 获取用户当前活跃设备列表
      const devicesKey = `devices:${userId}`;
      const devices = await redis.lrange(devicesKey, 0, -1);

      // 检查是否是新设备
      const isExistingDevice = devices.includes(deviceInfo.fingerprint);
      const uniqueDevices = devices.length;

      // 如果设备已存在，直接允许
      if (isExistingDevice) {
        await updateDeviceSession(userId, deviceInfo.fingerprint, sessionId);
        await updateLastSeen(userId, deviceInfo.fingerprint);
        return { allowed: true };
      }

      // 新设备登录
      if (uniqueDevices >= config.maxDevices) {
        switch (config.onNewLogin) {
          case 'deny':
            return {
              allowed: false,
              message: `登录失败：您已在${uniqueDevices}个设备上登录，达到上限`,
              meta: {
                maxDevices: config.maxDevices,
                currentDevices: uniqueDevices,
                strategy: config.onNewLogin,
              },
            };
          case 'kick_oldest':
            await removeOldestDevice(userId);
            await registerNewDevice(userId, deviceInfo, sessionId);
            logger.info({
              context: 'ConcurrentLogin',
              userId,
              deviceFingerprint: deviceInfo.fingerprint,
              message: '踢出最旧的设备以允许新设备登录',
            });
            return { allowed: true };
          case 'allow':
            await registerNewDevice(userId, deviceInfo, sessionId);
            return { allowed: true };
        }
      }

      // 注册新设备
      await registerNewDevice(userId, deviceInfo, sessionId);

      logger.info({
        context: 'ConcurrentLogin',
        userId,
        deviceFingerprint: deviceInfo.fingerprint,
        deviceName: deviceInfo.deviceName,
        message: '新设备登录',
      });

      return { allowed: true };
    } finally {
      // 释放锁
      await redis.del(lockKey);
    }
  } catch (error) {
    logger.error({
      context: 'ConcurrentLogin',
      userId,
      error,
      message: '处理并发登录时发生错误',
    });
    // 出错时允许登录，避免阻塞用户
    return { allowed: true };
  }
}

async function revokeTokens(tokens: string[]) {
  const valid = tokens.filter(Boolean);
  if (valid.length === 0) return;
  await db.delete(sessions).where(inArray(sessions.token, valid));
}

/**
 * 注册新设备
 */
async function registerNewDevice(
  userId: string,
  deviceInfo: ReturnType<typeof generateDeviceInfo>,
  sessionId: string
): Promise<void> {
  const devicesKey = `devices:${userId}`;
  const deviceKey = `device:${userId}:${deviceInfo.fingerprint}`;
  const sessionsKey = `device_sessions:${userId}:${deviceInfo.fingerprint}`;

  // 添加到设备列表
  await redis.rpush(devicesKey, deviceInfo.fingerprint);
  await redis.expire(devicesKey, 7 * 24 * 60 * 60); // 7天

  // 设置设备信息
  await redis.hset(deviceKey, {
    deviceName: deviceInfo.deviceName,
    platform: deviceInfo.platform,
    browser: deviceInfo.browser,
    firstSeen: Date.now(),
    lastSeen: Date.now(),
    sessionCount: 1,
  });
  await redis.expire(deviceKey, 7 * 24 * 60 * 60);

  // 添加会话
  await redis.sadd(sessionsKey, sessionId);
}

/**
 * 更新设备的会话
 */
async function updateDeviceSession(
  userId: string,
  deviceFingerprint: string,
  sessionId: string
): Promise<void> {
  const sessionsKey = `device_sessions:${userId}:${deviceFingerprint}`;

  // 添加会话
  await redis.sadd(sessionsKey, sessionId);

  // 更新会话计数
  const deviceKey = `device:${userId}:${deviceFingerprint}`;
  await redis.hincrby(deviceKey, 'sessionCount', 1);
}

/**
 * 更新设备最后活跃时间
 */
async function updateLastSeen(userId: string, deviceFingerprint: string): Promise<void> {
  const deviceKey = `device:${userId}:${deviceFingerprint}`;
  await redis.hset(deviceKey, 'lastSeen', Date.now());
}

/**
 * 移除最旧的设备
 */
async function removeOldestDevice(userId: string): Promise<void> {
  const devicesKey = `devices:${userId}`;

  // 获取最旧的设备指纹
  const oldestFingerprint = await redis.lindex(devicesKey, 0);
  if (!oldestFingerprint) return;

  // 从设备列表中移除
  await redis.lrem(devicesKey, 1, oldestFingerprint);

  // 获取该设备的所有会话
  const sessionsKey = `device_sessions:${userId}:${oldestFingerprint}`;
  const sessions = await redis.smembers(sessionsKey);

  // 清除所有会话的缓存
  for (const sessionId of sessions) {
    await redis.del(`session:${sessionId}`);
  }
  await revokeTokens(sessions);

  // 删除设备相关数据
  await redis.del(sessionsKey);
  await redis.del(`device:${userId}:${oldestFingerprint}`);

  logger.info({
    context: 'ConcurrentLogin',
    userId,
    deviceFingerprint: oldestFingerprint,
    message: '移除最旧的设备',
  });
}

/**
 * 获取用户的所有活跃设备
 */
export async function getUserActiveDevices(userId: string) {
  const devicesKey = `devices:${userId}`;
  const devices = await redis.lrange(devicesKey, 0, -1);

  const deviceInfos = [];
  for (const fingerprint of devices) {
    const deviceKey = `device:${userId}:${fingerprint}`;
    const info = await redis.hgetall(deviceKey);

    if (Object.keys(info).length > 0) {
      deviceInfos.push({
        fingerprint,
        deviceName: info.deviceName || 'Unknown Device',
        platform: info.platform || 'Unknown',
        browser: info.browser || 'Unknown',
        firstSeen: parseInt(info.firstSeen || '0'),
        lastSeen: parseInt(info.lastSeen || '0'),
        sessionCount: parseInt(info.sessionCount || '0'),
      });
    }
  }

  return deviceInfos;
}

/**
 * 踢出指定设备
 */
export async function revokeDevice(userId: string, deviceFingerprint: string): Promise<void> {
  const devicesKey = `devices:${userId}`;

  // 从设备列表中移除
  await redis.lrem(devicesKey, 1, deviceFingerprint);

  // 获取该设备的所有会话
  const sessionsKey = `device_sessions:${userId}:${deviceFingerprint}`;
  const sessions = await redis.smembers(sessionsKey);

  // 清除所有会话的缓存
  for (const sessionId of sessions) {
    await redis.del(`session:${sessionId}`);
  }
  await revokeTokens(sessions);

  // 删除设备相关数据
  await redis.del(sessionsKey);
  await redis.del(`device:${userId}:${deviceFingerprint}`);

  logger.info({
    context: 'ConcurrentLogin',
    userId,
    deviceFingerprint,
    message: '用户踢出设备',
  });
}

/**
 * 清理用户的过期会话
 */
export async function cleanupUserSessions(
  userId: string,
  activeSessionIds: string[]
): Promise<void> {
  const devicesKey = `devices:${userId}`;
  const devices = await redis.lrange(devicesKey, 0, -1);

  for (const fingerprint of devices) {
    const sessionsKey = `device_sessions:${userId}:${fingerprint}`;
    const sessions = await redis.smembers(sessionsKey);

    // 移除已失效的会话
    for (const sessionId of sessions) {
      if (!activeSessionIds.includes(sessionId)) {
        await redis.srem(sessionsKey, sessionId);
      }
    }

    // 如果设备没有活跃会话，移除设备
    const remainingSessions = await redis.smembers(sessionsKey);
    if (remainingSessions.length === 0) {
      await redis.lrem(devicesKey, 1, fingerprint);
      await redis.del(sessionsKey);
      await redis.del(`device:${userId}:${fingerprint}`);
    }
  }
}

/**
 * 踢出用户的所有设备
 */
export async function revokeAllDevices(
  userId: string,
  excludeFingerprint?: string | null
): Promise<void> {
  const devicesKey = `devices:${userId}`;

  // 获取所有设备
  const devices = await redis.lrange(devicesKey, 0, -1);

  // 移除每个设备
  for (const fingerprint of devices) {
    if (excludeFingerprint && fingerprint === excludeFingerprint) continue;
    await revokeDevice(userId, fingerprint);
  }

  logger.info({
    context: 'ConcurrentLogin',
    userId,
    message: '踢出所有设备',
  });
}
