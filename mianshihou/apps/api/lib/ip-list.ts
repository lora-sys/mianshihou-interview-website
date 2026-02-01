import { redis } from './redis';
import { createLogger } from './logger';

const logger = createLogger('IPList');

// IP 检查结果接口
export interface IPCheckResult {
  allowed: boolean;
  reason?: string;
  listType?: 'whitelist' | 'blacklist';
}

// IP 列表项接口
export interface IPListItem {
  ip: string;
  addedAt: number;
  addedBy: string;
  note?: string;
}

// CIDR 解析结果
interface CIDRInfo {
  network: string;
  prefixLength: number;
  startIP: number;
  endIP: number;
}

// Redis 键前缀
const WHITELIST_KEY = 'ip:whitelist';
const BLACKLIST_KEY = 'ip:blacklist';

/**
 * 将 IP 地址转换为数字
 */
function ipToNumber(ip: string): number {
  const parts = ip.split('.');
  if (parts.length !== 4) {
    throw new Error(`Invalid IP address: ${ip}`);
  }

  return (
    (parseInt(parts[0], 10) << 24) |
    (parseInt(parts[1], 10) << 16) |
    (parseInt(parts[2], 10) << 8) |
    parseInt(parts[3], 10)
  );
}

/**
 * 将数字转换为 IP 地址
 */
function numberToIP(num: number): string {
  return [
    (num >>> 24) & 255,
    (num >>> 16) & 255,
    (num >>> 8) & 255,
    num & 255,
  ].join('.');
}

/**
 * 解析 CIDR 格式
 */
function parseCIDR(cidr: string): CIDRInfo {
  const [network, prefixLengthStr] = cidr.split('/');
  const prefixLength = parseInt(prefixLengthStr, 10);

  if (isNaN(prefixLength) || prefixLength < 0 || prefixLength > 32) {
    throw new Error(`Invalid prefix length: ${prefixLengthStr}`);
  }

  const networkIP = ipToNumber(network);
  const mask = 0xffffffff << (32 - prefixLength);
  const startIP = networkIP & mask;
  const endIP = startIP | (~mask >>> 0);

  return {
    network,
    prefixLength,
    startIP,
    endIP,
  };
}

/**
 * 检查 IP 是否在 CIDR 范围内
 */
function isIPInCIDR(ip: string, cidr: string): boolean {
  try {
    const ipNum = ipToNumber(ip);
    const cidrInfo = parseCIDR(cidr);

    return ipNum >= cidrInfo.startIP && ipNum <= cidrInfo.endIP;
  } catch (error) {
    logger.warn('CIDR 解析失败', { cidr, error });
    return false;
  }
}

/**
 * 验证 IP 地址格式
 */
export function isValidIP(ip: string): boolean {
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipRegex.test(ip);
}

/**
 * 验证 CIDR 格式
 */
export function isValidCIDR(cidr: string): boolean {
  const cidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[1-2][0-9]|3[0-2])$/;
  return cidrRegex.test(cidr);
}

/**
 * 添加 IP 到白名单
 */
export async function addToWhitelist(
  ipOrCIDR: string,
  addedBy: string = 'system',
  note?: string
): Promise<boolean> {
  try {
    // 验证格式
    if (!isValidIP(ipOrCIDR) && !isValidCIDR(ipOrCIDR)) {
      throw new Error(`Invalid IP or CIDR: ${ipOrCIDR}`);
    }

    const item: IPListItem = {
      ip: ipOrCIDR,
      addedAt: Date.now(),
      addedBy,
      note,
    };

    // 添加到 Redis
    await redis.hset(WHITELIST_KEY, ipOrCIDR, JSON.stringify(item));
    await redis.expire(WHITELIST_KEY, 86400 * 30); // 30 天过期

    logger.info('IP 添加到白名单', { ip: ipOrCIDR, addedBy, note });

    return true;
  } catch (error) {
    logger.error('添加 IP 到白名单失败', { ip: ipOrCIDR, error });
    return false;
  }
}

/**
 * 从白名单移除 IP
 */
export async function removeFromWhitelist(ipOrCIDR: string): Promise<boolean> {
  try {
    await redis.hdel(WHITELIST_KEY, ipOrCIDR);
    logger.info('IP 从白名单移除', { ip: ipOrCIDR });
    return true;
  } catch (error) {
    logger.error('从白名单移除 IP 失败', { ip: ipOrCIDR, error });
    return false;
  }
}

/**
 * 添加 IP 到黑名单
 */
export async function addToBlacklist(
  ipOrCIDR: string,
  addedBy: string = 'system',
  note?: string
): Promise<boolean> {
  try {
    // 验证格式
    if (!isValidIP(ipOrCIDR) && !isValidCIDR(ipOrCIDR)) {
      throw new Error(`Invalid IP or CIDR: ${ipOrCIDR}`);
    }

    const item: IPListItem = {
      ip: ipOrCIDR,
      addedAt: Date.now(),
      addedBy,
      note,
    };

    // 添加到 Redis
    await redis.hset(BLACKLIST_KEY, ipOrCIDR, JSON.stringify(item));
    await redis.expire(BLACKLIST_KEY, 86400 * 30); // 30 天过期

    logger.info('IP 添加到黑名单', { ip: ipOrCIDR, addedBy, note });

    return true;
  } catch (error) {
    logger.error('添加 IP 到黑名单失败', { ip: ipOrCIDR, error });
    return false;
  }
}

/**
 * 从黑名单移除 IP
 */
export async function removeFromBlacklist(ipOrCIDR: string): Promise<boolean> {
  try {
    await redis.hdel(BLACKLIST_KEY, ipOrCIDR);
    logger.info('IP 从黑名单移除', { ip: ipOrCIDR });
    return true;
  } catch (error) {
    logger.error('从黑名单移除 IP 失败', { ip: ipOrCIDR, error });
    return false;
  }
}

/**
 * 检查 IP 是否在白名单中
 */
export async function isInWhitelist(ip: string): Promise<boolean> {
  try {
    // 检查精确匹配
    const exactMatch = await redis.hexists(WHITELIST_KEY, ip);
    if (exactMatch) {
      return true;
    }

    // 检查 CIDR 匹配
    const allWhitelistItems = await redis.hgetall(WHITELIST_KEY);
    for (const [key] of Object.entries(allWhitelistItems)) {
      if (isValidCIDR(key) && isIPInCIDR(ip, key)) {
        return true;
      }
    }

    return false;
  } catch (error) {
    logger.error('检查白名单失败', { ip, error });
    return false;
  }
}

/**
 * 检查 IP 是否在黑名单中
 */
export async function isInBlacklist(ip: string): Promise<boolean> {
  try {
    // 检查精确匹配
    const exactMatch = await redis.hexists(BLACKLIST_KEY, ip);
    if (exactMatch) {
      return true;
    }

    // 检查 CIDR 匹配
    const allBlacklistItems = await redis.hgetall(BLACKLIST_KEY);
    for (const [key] of Object.entries(allBlacklistItems)) {
      if (isValidCIDR(key) && isIPInCIDR(ip, key)) {
        return true;
      }
    }

    return false;
  } catch (error) {
    logger.error('检查黑名单失败', { ip, error });
    return false;
  }
}

/**
 * 检查 IP 是否被允许访问
 */
export async function checkIPAccess(ip: string): Promise<IPCheckResult> {
  try {
    // 首先检查黑名单
    if (await isInBlacklist(ip)) {
      logger.warn('IP 在黑名单中，拒绝访问', { ip });
      return {
        allowed: false,
        reason: 'IP is blacklisted',
        listType: 'blacklist',
      };
    }

    // 如果白名单不为空，检查白名单
    const whitelistCount = await redis.hlen(WHITELIST_KEY);
    if (whitelistCount > 0) {
      if (!(await isInWhitelist(ip))) {
        logger.warn('IP 不在白名单中，拒绝访问', { ip });
        return {
          allowed: false,
          reason: 'IP is not whitelisted',
          listType: 'whitelist',
        };
      }
    }

    return {
      allowed: true,
    };
  } catch (error) {
    logger.error('检查 IP 访问失败', { ip, error });
    // 出错时默认允许访问
    return {
      allowed: true,
    };
  }
}

/**
 * 获取白名单列表
 */
export async function getWhitelist(): Promise<IPListItem[]> {
  try {
    const items = await redis.hgetall(WHITELIST_KEY);
    return Object.values(items).map(item => JSON.parse(item));
  } catch (error) {
    logger.error('获取白名单失败', { error });
    return [];
  }
}

/**
 * 获取黑名单列表
 */
export async function getBlacklist(): Promise<IPListItem[]> {
  try {
    const items = await redis.hgetall(BLACKLIST_KEY);
    return Object.values(items).map(item => JSON.parse(item));
  } catch (error) {
    logger.error('获取黑名单失败', { error });
    return [];
  }
}

/**
 * 清空白名单
 */
export async function clearWhitelist(): Promise<boolean> {
  try {
    await redis.del(WHITELIST_KEY);
    logger.info('白名单已清空');
    return true;
  } catch (error) {
    logger.error('清空白名单失败', { error });
    return false;
  }
}

/**
 * 清空黑名单
 */
export async function clearBlacklist(): Promise<boolean> {
  try {
    await redis.del(BLACKLIST_KEY);
    logger.info('黑名单已清空');
    return true;
  } catch (error) {
    logger.error('清空黑名单失败', { error });
    return false;
  }
}

/**
 * 获取 IP 列表统计
 */
export async function getIPListStats(): Promise<{
  whitelistCount: number;
  blacklistCount: number;
}> {
  try {
    const whitelistCount = await redis.hlen(WHITELIST_KEY);
    const blacklistCount = await redis.hlen(BLACKLIST_KEY);

    return {
      whitelistCount,
      blacklistCount,
    };
  } catch (error) {
    logger.error('获取 IP 列表统计失败', { error });
    return {
      whitelistCount: 0,
      blacklistCount: 0,
    };
  }
}