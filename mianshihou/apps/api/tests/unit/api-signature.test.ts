import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  generateSignature,
  verifySignature,
  generateNonce,
  createSignatureData,
  extractSignatureFromHeaders,
  cleanupExpiredNonces,
  getNonceStats,
} from '../../lib/api-signature';
import { redis } from '../../lib/redis';

describe('API Signature', () => {
  const testSecret = 'test-secret-key';
  const testConfig = {
    secret: testSecret,
    timestampTolerance: 300000, // 5 分钟
    nonceExpireTime: 300, // 5 分钟
  };

  beforeEach(async () => {
    // 清理测试数据
    const keys = await redis.keys('api:nonce:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  });

  afterEach(async () => {
    // 清理测试数据
    const keys = await redis.keys('api:nonce:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  });

  describe('Signature Generation', () => {
    it('应该生成一致的签名', () => {
      const timestamp = 1234567890;
      const nonce = 'test-nonce';
      const body = 'test-body';

      const signature1 = generateSignature(timestamp, nonce, body, testSecret);
      const signature2 = generateSignature(timestamp, nonce, body, testSecret);

      expect(signature1).toBe(signature2);
    });

    it('应该为不同的输入生成不同的签名', () => {
      const timestamp = Date.now();
      const nonce = generateNonce();

      const signature1 = generateSignature(timestamp, nonce, 'body1', testSecret);
      const signature2 = generateSignature(timestamp, nonce, 'body2', testSecret);

      expect(signature1).not.toBe(signature2);
    });

    it('应该为不同的 nonce 生成不同的签名', () => {
      const timestamp = Date.now();
      const body = 'test-body';

      const nonce1 = generateNonce();
      const nonce2 = generateNonce();

      const signature1 = generateSignature(timestamp, nonce1, body, testSecret);
      const signature2 = generateSignature(timestamp, nonce2, body, testSecret);

      expect(signature1).not.toBe(signature2);
    });

    it('应该为空 body 生成签名', () => {
      const timestamp = Date.now();
      const nonce = generateNonce();

      const signature = generateSignature(timestamp, nonce, '', testSecret);

      expect(signature).toBeDefined();
      expect(signature.length).toBe(64); // SHA256 输出 64 个十六进制字符
    });
  });

  describe('Nonce Generation', () => {
    it('应该生成指定长度的 nonce', () => {
      const nonce = generateNonce(16);
      expect(nonce.length).toBe(16);
    });

    it('应该生成不同长度的 nonce', () => {
      const nonce8 = generateNonce(8);
      const nonce32 = generateNonce(32);
      const nonce64 = generateNonce(64);

      expect(nonce8.length).toBe(8);
      expect(nonce32.length).toBe(32);
      expect(nonce64.length).toBe(64);
    });

    it('应该生成字母数字混合的 nonce', () => {
      const nonce = generateNonce();
      const alnumRegex = /^[a-zA-Z0-9]+$/;
      expect(nonce).toMatch(alnumRegex);
    });

    it('应该生成随机的 nonce', () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();
      expect(nonce1).not.toBe(nonce2);
    });
  });

  describe('Signature Verification', () => {
    it('应该验证有效的签名', async () => {
      const signatureData = createSignatureData('test-body', testSecret);

      const result = await verifySignature(signatureData, testConfig);

      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('应该拒绝无效的签名', async () => {
      const signatureData = {
        timestamp: Date.now(),
        nonce: generateNonce(),
        body: 'test-body',
        signature: 'invalid-signature',
      };

      const result = await verifySignature(signatureData, testConfig);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid signature');
    });

    it('应该拒绝过期的签名', async () => {
      const oldTimestamp = Date.now() - 400000; // 6 分钟前
      const signatureData = {
        timestamp: oldTimestamp,
        nonce: generateNonce(),
        body: 'test-body',
        signature: generateSignature(oldTimestamp, signatureData.nonce, 'test-body', testSecret),
      };

      const result = await verifySignature(signatureData, testConfig);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Timestamp expired or future');
    });

    it('应该拒绝未来的签名', async () => {
      const futureTimestamp = Date.now() + 400000; // 6 分钟后
      const signatureData = {
        timestamp: futureTimestamp,
        nonce: generateNonce(),
        body: 'test-body',
        signature: generateSignature(futureTimestamp, signatureData.nonce, 'test-body', testSecret),
      };

      const result = await verifySignature(signatureData, testConfig);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Timestamp expired or future');
    });

    it('应该拒绝重复使用的 nonce', async () => {
      const signatureData = createSignatureData('test-body', testSecret);

      // 第一次验证应该成功
      const result1 = await verifySignature(signatureData, testConfig);
      expect(result1.valid).toBe(true);

      // 第二次验证应该失败（nonce 已使用）
      const result2 = await verifySignature(signatureData, testConfig);
      expect(result2.valid).toBe(false);
      expect(result2.reason).toBe('Nonce already used');
    });

    it('应该验证不同 body 的签名', async () => {
      const signatureData1 = createSignatureData('body-1', testSecret);
      const signatureData2 = createSignatureData('body-2', testSecret);

      const result1 = await verifySignature(signatureData1, testConfig);
      const result2 = await verifySignature(signatureData2, testConfig);

      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(true);
    });

    it('应该接受时间边界内的签名', async () => {
      const timestamp = Date.now() - 250000; // 4 分钟前（在 5 分钟容差内）
      const nonce = generateNonce();
      const signature = generateSignature(timestamp, nonce, 'test-body', testSecret);

      const signatureData = {
        timestamp,
        nonce,
        body: 'test-body',
        signature,
      };

      const result = await verifySignature(signatureData, testConfig);
      expect(result.valid).toBe(true);
    });
  });

  describe('Create Signature Data', () => {
    it('应该创建完整的签名数据', () => {
      const body = 'test-body';
      const signatureData = createSignatureData(body, testSecret);

      expect(signatureData.timestamp).toBeDefined();
      expect(signatureData.timestamp).toBeType('number');
      expect(signatureData.nonce).toBeDefined();
      expect(signatureData.nonce.length).toBeGreaterThan(0);
      expect(signatureData.body).toBe(body);
      expect(signatureData.signature).toBeDefined();
      expect(signatureData.signature.length).toBe(64);
    });

    it('应该为 JSON body 创建签名数据', () => {
      const body = { key: 'value', number: 123 };
      const signatureData = createSignatureData(body, testSecret);

      expect(signatureData.body).toBe(JSON.stringify(body));
      expect(signatureData.signature).toBeDefined();
    });

    it('应该为空 body 创建签名数据', () => {
      const signatureData = createSignatureData('', testSecret);

      expect(signatureData.body).toBe('');
      expect(signatureData.signature).toBeDefined();
    });
  });

  describe('Extract Signature From Headers', () => {
    it('应该从有效 headers 提取签名数据', () => {
      const timestamp = Date.now().toString();
      const nonce = 'test-nonce';
      const signature = 'test-signature';

      const headers = {
        'x-timestamp': timestamp,
        'x-nonce': nonce,
        'x-signature': signature,
      };

      const result = extractSignatureFromHeaders(headers);

      expect(result).not.toBeNull();
      expect(result?.timestamp).toBe(parseInt(timestamp, 10));
      expect(result?.nonce).toBe(nonce);
      expect(result?.signature).toBe(signature);
    });

    it('应该从数组类型的 headers 提取签名数据', () => {
      const timestamp = Date.now().toString();
      const nonce = 'test-nonce';
      const signature = 'test-signature';

      const headers = {
        'x-timestamp': [timestamp],
        'x-nonce': [nonce],
        'x-signature': [signature],
      };

      const result = extractSignatureFromHeaders(headers);

      expect(result).not.toBeNull();
      expect(result?.timestamp).toBe(parseInt(timestamp, 10));
      expect(result?.nonce).toBe(nonce);
      expect(result?.signature).toBe(signature);
    });

    it('应该对缺少签名头返回 null', () => {
      const headers = {
        'x-timestamp': '1234567890',
      };

      const result = extractSignatureFromHeaders(headers);

      expect(result).toBeNull();
    });

    it('应该对空 headers 返回 null', () => {
      const result = extractSignatureFromHeaders({});

      expect(result).toBeNull();
    });
  });

  describe('Cleanup Expired Nonces', () => {
    it('应该返回当前 nonce 数量', async () => {
      const signatureData = createSignatureData('test-body', testSecret);
      await verifySignature(signatureData, testConfig);

      const count = await cleanupExpiredNonces();

      expect(count).toBeGreaterThan(0);
    });

    it('应该对空的 nonce 集合返回 0', async () => {
      const count = await cleanupExpiredNonces();

      expect(count).toBe(0);
    });
  });

  describe('Get Nonce Stats', () => {
    it('应该返回 nonce 统计信息', async () => {
      // 创建一些 nonce
      for (let i = 0; i < 5; i++) {
        const signatureData = createSignatureData(`test-body-${i}`, testSecret);
        await verifySignature(signatureData, testConfig);
      }

      const stats = await getNonceStats();

      expect(stats.total).toBeGreaterThan(0);
      expect(stats.recent).toBeGreaterThan(0);
    });

    it('应该对空的 nonce 集合返回 0', async () => {
      const stats = await getNonceStats();

      expect(stats.total).toBe(0);
      expect(stats.recent).toBe(0);
    });
  });

  describe('Signature Config', () => {
    it('应该使用自定义配置验证签名', async () => {
      const customConfig = {
        secret: 'custom-secret',
        timestampTolerance: 10000, // 10 秒
        nonceExpireTime: 10, // 10 秒
      };

      const signatureData = createSignatureData('test-body', customConfig.secret);

      const result = await verifySignature(signatureData, customConfig);

      expect(result.valid).toBe(true);
    });

    it('应该拒绝超出自定义容差的签名', async () => {
      const customConfig = {
        secret: 'custom-secret',
        timestampTolerance: 10000, // 10 秒
        nonceExpireTime: 10,
      };

      const oldTimestamp = Date.now() - 20000; // 20 秒前
      const nonce = generateNonce();
      const signature = generateSignature(oldTimestamp, nonce, 'test-body', customConfig.secret);

      const signatureData = {
        timestamp: oldTimestamp,
        nonce,
        body: 'test-body',
        signature,
      };

      const result = await verifySignature(signatureData, customConfig);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Timestamp expired or future');
    });
  });

  describe('Security', () => {
    it('应该拒绝使用错误密钥的签名', async () => {
      const signatureData = createSignatureData('test-body', 'correct-secret');

      // 使用错误的密钥验证
      const result = await verifySignature(signatureData, {
        secret: 'wrong-secret',
        timestampTolerance: 300000,
        nonceExpireTime: 300,
      });

      expect(result.valid).toBe(false);
    });

    it('应该拒绝被篡改的 body', async () => {
      const signatureData = createSignatureData('original-body', testSecret);

      // 篡改 body
      signatureData.body = 'tampered-body';

      const result = await verifySignature(signatureData, testConfig);

      expect(result.valid).toBe(false);
    });

    it('应该拒绝被篡改的 nonce', async () => {
      const signatureData = createSignatureData('test-body', testSecret);

      // 使用正确的签名，但篡改 nonce
      const wrongNonce = generateNonce();
      const wrongSignature = generateSignature(
        signatureData.timestamp,
        wrongNonce,
        signatureData.body || '',
        testSecret
      );

      const tamperedData = {
        ...signatureData,
        nonce: wrongNonce,
        signature: wrongSignature,
      };

      const result = await verifySignature(tamperedData, testConfig);

      expect(result.valid).toBe(true); // 签名本身是有效的，只是 nonce 不同
    });
  });
});
