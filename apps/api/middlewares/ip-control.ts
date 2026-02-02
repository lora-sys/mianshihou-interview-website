import { FastifyRequest, FastifyReply } from 'fastify';
import {
  checkIPAccess,
  addToWhitelist,
  removeFromWhitelist,
  addToBlacklist,
  removeFromBlacklist,
  getWhitelist,
  getBlacklist,
  clearWhitelist,
  clearBlacklist,
  getIPListStats,
} from '../lib/ip-list';
import { createLogger } from '../lib/logger';

const logger = createLogger('IPControlMiddleware');

/**
 * IP 控制中间件
 */
export async function ipControlMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const ip = request.ip;

  if (!ip) {
    logger.warn('无法获取客户端 IP 地址');
    return;
  }

  // 检查 IP 访问权限
  const result = await checkIPAccess(ip);

  if (!result.allowed) {
    logger.warn('IP 访问被拒绝', {
      ip,
      reason: result.reason,
      listType: result.listType,
      path: request.url,
      method: request.method,
    });

    reply.status(403).send({
      success: false,
      message: result.reason || '访问被拒绝',
      code: 'IP_BLOCKED',
    });

    return reply;
  }

  logger.debug('IP 访问被允许', { ip, path: request.url });
}

/**
 * 创建 IP 白名单中间件
 */
export function createIPWhitelistMiddleware(
  options: {
    // 如果为 true，则白名单为空时拒绝所有访问
    strict?: boolean;
    // 跳过检查的路径
    skipPaths?: string[];
  } = {}
) {
  const { strict = false, skipPaths = [] } = options;

  return async function (request: FastifyRequest, reply: FastifyReply) {
    const ip = request.ip;

    // 跳过指定路径
    if (skipPaths.some((path) => request.url.startsWith(path))) {
      return;
    }

    if (!ip) {
      logger.warn('无法获取客户端 IP 地址');
      return;
    }

    // 检查白名单
    const { whitelistCount } = await getIPListStats();

    // 如果是严格模式或白名单不为空，则检查白名单
    if (strict || whitelistCount > 0) {
      const result = await checkIPAccess(ip);

      if (!result.allowed && result.listType === 'whitelist') {
        logger.warn('IP 不在白名单中，拒绝访问', { ip, path: request.url });

        reply.status(403).send({
          success: false,
          message: '您的 IP 地址不在白名单中',
          code: 'IP_NOT_WHITELISTED',
        });

        return reply;
      }
    }
  };
}

/**
 * 创建 IP 黑名单中间件
 */
export function createIPBlacklistMiddleware(
  options: {
    // 跳过检查的路径
    skipPaths?: string[];
  } = {}
) {
  const { skipPaths = [] } = options;

  return async function (request: FastifyRequest, reply: FastifyReply) {
    const ip = request.ip;

    // 跳过指定路径
    if (skipPaths.some((path) => request.url.startsWith(path))) {
      return;
    }

    if (!ip) {
      logger.warn('无法获取客户端 IP 地址');
      return;
    }

    // 检查黑名单
    const isBlacklisted = await checkIPAccess(ip);

    if (!isBlacklisted.allowed && isBlacklisted.listType === 'blacklist') {
      logger.warn('IP 在黑名单中，拒绝访问', { ip, path: request.url });

      reply.status(403).send({
        success: false,
        message: '您的 IP 地址已被封禁',
        code: 'IP_BLOCKED',
      });

      return reply;
    }
  };
}

/**
 * IP 管理接口处理器
 */
export const ipManagementHandlers = {
  /**
   * 获取白名单
   */
  async getWhitelist(request: FastifyRequest, reply: FastifyReply) {
    try {
      const whitelist = await getWhitelist();
      reply.send({
        success: true,
        data: whitelist,
      });
    } catch (error) {
      logger.error('获取白名单失败', { error });
      reply.status(500).send({
        success: false,
        message: '获取白名单失败',
        code: 'GET_WHITELIST_FAILED',
      });
    }
  },

  /**
   * 添加到白名单
   */
  async addToWhitelist(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { ip, note } = request.body as { ip: string; note?: string };
      const userId = (request as any).user?.id || 'system';

      if (!ip) {
        reply.status(400).send({
          success: false,
          message: 'IP 地址不能为空',
          code: 'IP_REQUIRED',
        });
        return;
      }

      const result = await addToWhitelist(ip, userId, note);

      if (result) {
        reply.send({
          success: true,
          message: 'IP 已添加到白名单',
        });
      } else {
        reply.status(500).send({
          success: false,
          message: '添加 IP 到白名单失败',
          code: 'ADD_WHITELIST_FAILED',
        });
      }
    } catch (error) {
      logger.error('添加到白名单失败', { error });
      reply.status(500).send({
        success: false,
        message: '添加 IP 到白名单失败',
        code: 'ADD_WHITELIST_FAILED',
      });
    }
  },

  /**
   * 从白名单移除
   */
  async removeFromWhitelist(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { ip } = request.body as { ip: string };

      if (!ip) {
        reply.status(400).send({
          success: false,
          message: 'IP 地址不能为空',
          code: 'IP_REQUIRED',
        });
        return;
      }

      const result = await removeFromWhitelist(ip);

      if (result) {
        reply.send({
          success: true,
          message: 'IP 已从白名单移除',
        });
      } else {
        reply.status(500).send({
          success: false,
          message: '从白名单移除 IP 失败',
          code: 'REMOVE_WHITELIST_FAILED',
        });
      }
    } catch (error) {
      logger.error('从白名单移除失败', { error });
      reply.status(500).send({
        success: false,
        message: '从白名单移除 IP 失败',
        code: 'REMOVE_WHITELIST_FAILED',
      });
    }
  },

  /**
   * 获取黑名单
   */
  async getBlacklist(request: FastifyRequest, reply: FastifyReply) {
    try {
      const blacklist = await getBlacklist();
      reply.send({
        success: true,
        data: blacklist,
      });
    } catch (error) {
      logger.error('获取黑名单失败', { error });
      reply.status(500).send({
        success: false,
        message: '获取黑名单失败',
        code: 'GET_BLACKLIST_FAILED',
      });
    }
  },

  /**
   * 添加到黑名单
   */
  async addToBlacklist(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { ip, note } = request.body as { ip: string; note?: string };
      const userId = (request as any).user?.id || 'system';

      if (!ip) {
        reply.status(400).send({
          success: false,
          message: 'IP 地址不能为空',
          code: 'IP_REQUIRED',
        });
        return;
      }

      const result = await addToBlacklist(ip, userId, note);

      if (result) {
        reply.send({
          success: true,
          message: 'IP 已添加到黑名单',
        });
      } else {
        reply.status(500).send({
          success: false,
          message: '添加 IP 到黑名单失败',
          code: 'ADD_BLACKLIST_FAILED',
        });
      }
    } catch (error) {
      logger.error('添加到黑名单失败', { error });
      reply.status(500).send({
        success: false,
        message: '添加 IP 到黑名单失败',
        code: 'ADD_BLACKLIST_FAILED',
      });
    }
  },

  /**
   * 从黑名单移除
   */
  async removeFromBlacklist(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { ip } = request.body as { ip: string };

      if (!ip) {
        reply.status(400).send({
          success: false,
          message: 'IP 地址不能为空',
          code: 'IP_REQUIRED',
        });
        return;
      }

      const result = await removeFromBlacklist(ip);

      if (result) {
        reply.send({
          success: true,
          message: 'IP 已从黑名单移除',
        });
      } else {
        reply.status(500).send({
          success: false,
          message: '从黑名单移除 IP 失败',
          code: 'REMOVE_BLACKLIST_FAILED',
        });
      }
    } catch (error) {
      logger.error('从黑名单移除失败', { error });
      reply.status(500).send({
        success: false,
        message: '从黑名单移除 IP 失败',
        code: 'REMOVE_BLACKLIST_FAILED',
      });
    }
  },

  /**
   * 清空白名单
   */
  async clearWhitelist(request: FastifyRequest, reply: FastifyReply) {
    try {
      const result = await clearWhitelist();

      if (result) {
        reply.send({
          success: true,
          message: '白名单已清空',
        });
      } else {
        reply.status(500).send({
          success: false,
          message: '清空白名单失败',
          code: 'CLEAR_WHITELIST_FAILED',
        });
      }
    } catch (error) {
      logger.error('清空白名单失败', { error });
      reply.status(500).send({
        success: false,
        message: '清空白名单失败',
        code: 'CLEAR_WHITELIST_FAILED',
      });
    }
  },

  /**
   * 清空黑名单
   */
  async clearBlacklist(request: FastifyRequest, reply: FastifyReply) {
    try {
      const result = await clearBlacklist();

      if (result) {
        reply.send({
          success: true,
          message: '黑名单已清空',
        });
      } else {
        reply.status(500).send({
          success: false,
          message: '清空黑名单失败',
          code: 'CLEAR_BLACKLIST_FAILED',
        });
      }
    } catch (error) {
      logger.error('清空黑名单失败', { error });
      reply.status(500).send({
        success: false,
        message: '清空黑名单失败',
        code: 'CLEAR_BLACKLIST_FAILED',
      });
    }
  },

  /**
   * 获取 IP 列表统计
   */
  async getStats(request: FastifyRequest, reply: FastifyReply) {
    try {
      const stats = await getIPListStats();
      reply.send({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('获取 IP 列表统计失败', { error });
      reply.status(500).send({
        success: false,
        message: '获取 IP 列表统计失败',
        code: 'GET_STATS_FAILED',
      });
    }
  },
};
