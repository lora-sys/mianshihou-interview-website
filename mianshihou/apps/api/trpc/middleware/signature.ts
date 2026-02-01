import { TRPCError } from '@trpc/server';
import { middleware } from '../index';
import {
  verifySignature,
  extractSignatureFromHeaders,
  SignatureConfig,
  SignatureData
} from '../../lib/api-signature';
import { createLogger } from '../../lib/logger';

const logger = createLogger('SignatureMiddleware');

// 从环境变量获取 API 密钥
const API_SECRET = process.env.API_SECRET || 'your-api-secret-change-this';

// 默认签名配置
const defaultSignatureConfig: SignatureConfig = {
  secret: API_SECRET,
  timestampTolerance: 300000, // 5 分钟
  nonceExpireTime: 300 // 5 分钟
};

/**
 * 创建签名验证中间件
 */
export function createSignatureMiddleware(
  config?: Partial<SignatureConfig>
) {
  const finalConfig: SignatureConfig = {
    ...defaultSignatureConfig,
    ...config
  };

  return middleware(async ({ ctx, next, type }) => {
    // 只对 mutations 和 queries 进行签名验证
    if (type !== 'mutation' && type !== 'query') {
      return next();
    }

    const { req } = ctx as any;
    
    if (!req) {
      logger.warn('缺少请求对象');
      return next();
    }

    // 提取签名数据
    const signatureData = extractSignatureFromHeaders(req.headers);

    if (!signatureData) {
      logger.warn('缺少签名头', { path: ctx._def?.path });
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Missing signature headers'
      });
    }

    // 获取请求体
    let body = '';
    if (type === 'mutation' && req.body) {
      try {
        body = JSON.stringify(req.body);
      } catch (error) {
        logger.warn('序列化请求体失败', { error });
      }
    }

    // 添加 body 到签名数据
    const fullSignatureData: SignatureData = {
      ...signatureData,
      body
    };

    // 验证签名
    const result = await verifySignature(fullSignatureData, finalConfig);

    if (!result.valid) {
      logger.warn('签名验证失败', {
        reason: result.reason,
        path: ctx._def?.path,
        nonce: signatureData.nonce
      });
      
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: result.reason || 'Invalid signature'
      });
    }

    logger.debug('签名验证成功', { path: ctx._def?.path });

    return next();
  });
}

/**
 * 预定义的签名验证中间件
 */
export const signatureMiddleware = createSignatureMiddleware();

/**
 * 严格签名验证中间件（更短的时间容差）
 */
export const strictSignatureMiddleware = createSignatureMiddleware({
  timestampTolerance: 60000, // 1 分钟
  nonceExpireTime: 60 // 1 分钟
});

/**
 * 宽松签名验证中间件（更长的时间容差）
 */
export const looseSignatureMiddleware = createSignatureMiddleware({
  timestampTolerance: 600000, // 10 分钟
  nonceExpireTime: 600 // 10 分钟
});

/**
 * 签名信息接口（用于响应）
 */
export interface SignatureInfo {
  timestamp: number;
  nonce: string;
  signature: string;
}

/**
 * 生成签名信息供客户端使用
 */
export function generateSignatureInfo(
  body: any,
  config?: Partial<SignatureConfig>
): SignatureInfo {
  const finalConfig: SignatureConfig = {
    ...defaultSignatureConfig,
    ...config
  };

  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
  const timestamp = Date.now();
  const nonce = Math.random().toString(36).substring(2, 15);
  
  const message = `${timestamp}${nonce}${bodyStr}`;
  const hmac = require('crypto').createHmac('sha256', finalConfig.secret);
  hmac.update(message);
  const signature = hmac.digest('hex');

  return {
    timestamp,
    nonce,
    signature
  };
}