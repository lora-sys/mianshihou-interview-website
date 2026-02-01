import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  isValidIP,
  isValidCIDR,
  addToWhitelist,
  removeFromWhitelist,
  addToBlacklist,
  removeFromBlacklist,
  isInWhitelist,
  isInBlacklist,
  checkIPAccess,
  getWhitelist,
  getBlacklist,
  clearWhitelist,
  clearBlacklist,
  getIPListStats,
} from '../../lib/ip-list';
import { redis } from '../../lib/redis';

describe('IP List Management', () => {
  beforeEach(async () => {
    // 清理测试数据
    await clearWhitelist();
    await clearBlacklist();
  });

  afterEach(async () => {
    // 清理测试数据
    await clearWhitelist();
    await clearBlacklist();
  });

  describe('IP Validation', () => {
    it('应该验证有效的 IPv4 地址', () => {
      expect(isValidIP('192.168.1.1')).toBe(true);
      expect(isValidIP('10.0.0.1')).toBe(true);
      expect(isValidIP('172.16.0.1')).toBe(true);
      expect(isValidIP('0.0.0.0')).toBe(true);
      expect(isValidIP('255.255.255.255')).toBe(true);
    });

    it('应该拒绝无效的 IPv4 地址', () => {
      expect(isValidIP('256.1.1.1')).toBe(false);
      expect(isValidIP('192.168.1')).toBe(false);
      expect(isValidIP('192.168.1.1.1')).toBe(false);
      expect(isValidIP('192.168.1.abc')).toBe(false);
      expect(isValidIP('')).toBe(false);
    });

    it('应该验证有效的 CIDR 格式', () => {
      expect(isValidCIDR('192.168.1.0/24')).toBe(true);
      expect(isValidCIDR('10.0.0.0/8')).toBe(true);
      expect(isValidCIDR('172.16.0.0/12')).toBe(true);
      expect(isValidCIDR('192.168.1.1/32')).toBe(true);
      expect(isValidCIDR('0.0.0.0/0')).toBe(true);
    });

    it('应该拒绝无效的 CIDR 格式', () => {
      expect(isValidCIDR('192.168.1.0/33')).toBe(false);
      expect(isValidCIDR('192.168.1.0/-1')).toBe(false);
      expect(isValidCIDR('192.168.1.0')).toBe(false);
      expect(isValidCIDR('192.168.1.0/24/16')).toBe(false);
      expect(isValidCIDR('')).toBe(false);
    });
  });

  describe('Whitelist Management', () => {
    it('应该能够添加 IP 到白名单', async () => {
      const result = await addToWhitelist('192.168.1.100', 'test-user', 'Test IP');
      expect(result).toBe(true);

      const isInList = await isInWhitelist('192.168.1.100');
      expect(isInList).toBe(true);
    });

    it('应该能够添加 CIDR 到白名单', async () => {
      const result = await addToWhitelist('192.168.1.0/24', 'test-user', 'Test CIDR');
      expect(result).toBe(true);

      // 检查范围内的 IP
      const ip1 = await isInWhitelist('192.168.1.1');
      const ip2 = await isInWhitelist('192.168.1.100');
      const ip3 = await isInWhitelist('192.168.1.255');
      const ip4 = await isInWhitelist('192.168.2.1'); // 不在范围内

      expect(ip1).toBe(true);
      expect(ip2).toBe(true);
      expect(ip3).toBe(true);
      expect(ip4).toBe(false);
    });

    it('应该能够从白名单移除 IP', async () => {
      await addToWhitelist('192.168.1.100', 'test-user');
      const result = await removeFromWhitelist('192.168.1.100');
      expect(result).toBe(true);

      const isInList = await isInWhitelist('192.168.1.100');
      expect(isInList).toBe(false);
    });

    it('应该能够获取白名单', async () => {
      await addToWhitelist('192.168.1.100', 'user1', 'Note 1');
      await addToWhitelist('192.168.1.101', 'user2', 'Note 2');

      const whitelist = await getWhitelist();
      expect(whitelist).toHaveLength(2);
      expect(whitelist[0].ip).toBe('192.168.1.100');
      expect(whitelist[1].ip).toBe('192.168.1.101');
    });

    it('应该能够清空白名单', async () => {
      await addToWhitelist('192.168.1.100', 'test-user');
      await addToWhitelist('192.168.1.101', 'test-user');

      const result = await clearWhitelist();
      expect(result).toBe(true);

      const whitelist = await getWhitelist();
      expect(whitelist).toHaveLength(0);
    });
  });

  describe('Blacklist Management', () => {
    it('应该能够添加 IP 到黑名单', async () => {
      const result = await addToBlacklist('192.168.1.100', 'test-user', 'Malicious IP');
      expect(result).toBe(true);

      const isInList = await isInBlacklist('192.168.1.100');
      expect(isInList).toBe(true);
    });

    it('应该能够添加 CIDR 到黑名单', async () => {
      const result = await addToBlacklist('192.168.1.0/24', 'test-user', 'Blocked CIDR');
      expect(result).toBe(true);

      // 检查范围内的 IP
      const ip1 = await isInBlacklist('192.168.1.1');
      const ip2 = await isInBlacklist('192.168.1.100');
      const ip3 = await isInBlacklist('192.168.2.1'); // 不在范围内

      expect(ip1).toBe(true);
      expect(ip2).toBe(true);
      expect(ip3).toBe(false);
    });

    it('应该能够从黑名单移除 IP', async () => {
      await addToBlacklist('192.168.1.100', 'test-user');
      const result = await removeFromBlacklist('192.168.1.100');
      expect(result).toBe(true);

      const isInList = await isInBlacklist('192.168.1.100');
      expect(isInList).toBe(false);
    });

    it('应该能够获取黑名单', async () => {
      await addToBlacklist('192.168.1.100', 'user1', 'Note 1');
      await addToBlacklist('192.168.1.101', 'user2', 'Note 2');

      const blacklist = await getBlacklist();
      expect(blacklist).toHaveLength(2);
      expect(blacklist[0].ip).toBe('192.168.1.100');
      expect(blacklist[1].ip).toBe('192.168.1.101');
    });

    it('应该能够清空黑名单', async () => {
      await addToBlacklist('192.168.1.100', 'test-user');
      await addToBlacklist('192.168.1.101', 'test-user');

      const result = await clearBlacklist();
      expect(result).toBe(true);

      const blacklist = await getBlacklist();
      expect(blacklist).toHaveLength(0);
    });
  });

  describe('IP Access Check', () => {
    it('应该允许不在任何列表中的 IP', async () => {
      const result = await checkIPAccess('192.168.1.100');
      expect(result.allowed).toBe(true);
    });

    it('应该拒绝在黑名单中的 IP', async () => {
      await addToBlacklist('192.168.1.100', 'test-user');

      const result = await checkIPAccess('192.168.1.100');
      expect(result.allowed).toBe(false);
      expect(result.listType).toBe('blacklist');
      expect(result.reason).toBe('IP is blacklisted');
    });

    it('应该拒绝在黑名单 CIDR 范围内的 IP', async () => {
      await addToBlacklist('192.168.1.0/24', 'test-user');

      const result = await checkIPAccess('192.168.1.100');
      expect(result.allowed).toBe(false);
      expect(result.listType).toBe('blacklist');
    });

    it('当白名单不为空时，应该拒绝不在白名单中的 IP', async () => {
      await addToWhitelist('192.168.1.100', 'test-user');

      const result1 = await checkIPAccess('192.168.1.100');
      expect(result1.allowed).toBe(true);

      const result2 = await checkIPAccess('192.168.1.101');
      expect(result2.allowed).toBe(false);
      expect(result2.listType).toBe('whitelist');
      expect(result2.reason).toBe('IP is not whitelisted');
    });

    it('应该允许在白名单 CIDR 范围内的 IP', async () => {
      await addToWhitelist('192.168.1.0/24', 'test-user');

      const result1 = await checkIPAccess('192.168.1.100');
      expect(result1.allowed).toBe(true);

      const result2 = await checkIPAccess('192.168.2.100');
      expect(result2.allowed).toBe(false);
    });

    it('黑名单优先级应该高于白名单', async () => {
      await addToWhitelist('192.168.1.0/24', 'test-user');
      await addToBlacklist('192.168.1.100', 'test-user');

      const result = await checkIPAccess('192.168.1.100');
      expect(result.allowed).toBe(false);
      expect(result.listType).toBe('blacklist');
    });
  });

  describe('Statistics', () => {
    it('应该能够获取 IP 列表统计', async () => {
      await addToWhitelist('192.168.1.100', 'test-user');
      await addToWhitelist('192.168.1.101', 'test-user');
      await addToBlacklist('192.168.1.200', 'test-user');

      const stats = await getIPListStats();
      expect(stats.whitelistCount).toBe(2);
      expect(stats.blacklistCount).toBe(1);
    });

    it('空列表应该返回 0', async () => {
      const stats = await getIPListStats();
      expect(stats.whitelistCount).toBe(0);
      expect(stats.blacklistCount).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('应该拒绝无效的 IP 格式', async () => {
      const result = await addToWhitelist('invalid-ip', 'test-user');
      expect(result).toBe(false);
    });

    it('应该拒绝无效的 CIDR 格式', async () => {
      const result = await addToWhitelist('192.168.1.0/33', 'test-user');
      expect(result).toBe(false);
    });

    it('应该处理移除不存在的 IP', async () => {
      const result = await removeFromWhitelist('192.168.1.999');
      expect(result).toBe(true); // 移除操作应该总是成功
    });
  });
});