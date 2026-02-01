import { createHmac, timingSafeEqual } from 'crypto';
import { redis } from './redis';
import { createLogger } from './logger';

const logger = createLogger('APISignature');

// 签名结果接口
export interface SignatureResult {
  valid: boolean;
  reason?: string;
}

// 签名配置接口
export interface SignatureConfig {
  secret: string;
  timestampTolerance?: number; // 时间戳容差（毫秒）
  nonceExpireTime?: number;     // nonce 过期时间（秒）
}

// 签名数据接口
export interface SignatureData {
  timestamp: number;
  nonce: string;
  body?: string;
  signature: string;
}

// Redis 键前缀
const NONCE_KEY_PREFIX = 'api:nonce:';

/**
 * 生成 API 签名
 */
export function generateSignature(
  timestamp: number,
  nonce: string,
  body: string,
  secret: string
): string {
  // 按照固定顺序拼接字符串
  const message = `${timestamp}${nonce}${body}`;
  
  // 使用 HMAC-SHA256 生成签名
  const hmac = createHmac('sha256', secret);
  hmac.update(message);
  return hmac.digest('hex');
}

/**
 * 验证 API 签名
 */
export async function verifySignature(
  signatureData: SignatureData,
  config: SignatureConfig
): Promise<SignatureResult> {
  const {
    secret,
    timestampTolerance = 300000, // 默认 5 分钟
    nonceExpireTime = 300 // 默认 5 分钟
  } = config;

  const { timestamp, nonce, body = '', signature } = signatureData;

  // 1. 验证时间戳
  const now = Date.now();
  if (Math.abs(now - timestamp) > timestampTolerance) {
    logger.warn('时间戳验证失败', {
      timestamp,
      now,
      difference: Math.abs(now - timestamp),
      tolerance: timestampTolerance
    });
    return {
      valid: false,
      reason: 'Timestamp expired or future'
    };
  }

  // 2. 检查 nonce 是否已使用（防重放攻击）
  const nonceKey = `${NONCE_KEY_PREFIX}${nonce}`;
  const nonceExists = await redis.exists(nonceKey);
  
  if (nonceExists) {
    logger.warn('Nonce 已使用', { nonce });
    return {
      valid: false,
      reason: 'Nonce already used'
    };
  }

  // 3. 生成期望的签名
  const expectedSignature = generateSignature(timestamp, nonce, body, secret);

  // 4. 使用 timing-safe 比较签名
  try {
    const isValid = timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );

    if (!isValid) {
      logger.warn('签名验证失败', {
        provided: signature,
        expected: expectedSignature
      });
      return {
        valid: false,
        reason: 'Invalid signature'
      };
    }

    // 5. 将 nonce 标记为已使用
    await redis.setex(nonceKey, nonceExpireTime, '1');

    logger.debug('签名验证成功', { nonce, timestamp });

    return {
      valid: true
    };
  } catch (error) {
    logger.error('签名验证过程出错', { error });
    return {
      valid: false,
      reason: 'Signature verification failed'
    };
  }
}

/**
 * 生成随机 nonce
 */
export function generateNonce(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 创建签名数据
 */
export function createSignatureData(
  body: string,
  secret: string
): SignatureData {
  const timestamp = Date.now();
  const nonce = generateNonce();
  const signature = generateSignature(timestamp, nonce, body, secret);

  return {
    timestamp,
    nonce,
    body,
    signature
  };
}

/**
 * 从请求头提取签名数据
 */
export function extractSignatureFromHeaders(
  headers: Record<string, string | string[] | undefined>
): SignatureData | null {
  const timestamp = headers['x-timestamp'];
  const nonce = headers['x-nonce'];
  const signature = headers['x-signature'];

  if (!timestamp || !nonce || !signature) {
    logger.warn('缺少签名头', {
      hasTimestamp: !!timestamp,
      hasNonce: !!nonce,
      hasSignature: !!signature
    });
    return null;
  }

  return {
    timestamp: parseInt(timestamp as string, 10),
    nonce: nonce as string,
    signature: signature as string
  };
}

/**
 * 清理过期的 nonce
 */
export async function cleanupExpiredNonces(): Promise<number> {
  try {
    // Redis 会自动清理过期的键
    // 这里只是为了记录日志
    const keys = await redis.keys(`${NONCE_KEY_PREFIX}*`);
    logger.info('当前 nonce 数量', { count: keys.length });
    return keys.length;
  } catch (error) {
    logger.error('清理 nonce 失败', { error });
    return 0;
  }
}

/**
 * 获取 nonce 使用统计
 */
export async function getNonceStats(): Promise<{
  total: number;
  recent: number;
}> {
  try {
    const allKeys = await redis.keys(`${NONCE_KEY_PREFIX}*`);
    
    // 获取最近 5 分钟的 nonce
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const recentKeys = await redis.keys(`${NONCE_KEY_PREFIX}*`);
    
    let recentCount = 0;
    for (const key of recentKeys) {
      const ttl = await redis.ttl(key);
      if (ttl > 240) { // 5 分钟 = 300 秒，剩余 > 240 秒说明是最近 5 分钟内的
        recentCount++;
      }
    }

    return {
      total: allKeys.length,
      recent: recentCount
    };
  } catch (error) {
    logger.error('获取 nonce 统计失败', { error });
    return {
      total: 0,
      recent: 0
    };
  }
}