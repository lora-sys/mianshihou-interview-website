import Redis from 'ioredis';
import { logger } from './logger';

export type RedisConfig = {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  lazyConnect?: boolean;
  maxRetriesPerRequest?: number;
  enableReadyCheck?: boolean;
  enableOfflineQueue?: boolean;
  retryStrategy?: (times: number) => number | void;
};

/**
 * Redis 客户端单例类
 * 提供连接管理、自动重连、健康检查等功能
 */
class RedisClientManager {
  private static instance: RedisClientManager;
  private client: Redis | null = null;
  private config: RedisConfig;
  private isConnected = false;
  private reconnectAttempts = 0;

  private constructor(config: RedisConfig = {}) {
    this.config = {
      host: config.host || process.env.REDIS_HOST || 'localhost',
      port: config.port || parseInt(process.env.REDIS_PORT || '6379'),
      password: config.password || process.env.REDIS_PASSWORD,
      db: config.db || 0,
      lazyConnect: config.lazyConnect ?? true,
      maxRetriesPerRequest: config.maxRetriesPerRequest || 3,
      enableReadyCheck: config.enableReadyCheck ?? true,
      enableOfflineQueue: config.enableOfflineQueue ?? true,
      retryStrategy: config.retryStrategy || this.defaultRetryStrategy,
    };
  }

  private defaultRetryStrategy = (times: number): number | void => {
    const delay = Math.min(times * 100, 3000);
    logger.warn(`Redis reconnection attempt ${times}, retrying in ${delay}ms`);
    return delay;
  };

  /**
   * 获取 Redis 客户端单例
   */
  static getInstance(config?: RedisConfig): RedisClientManager {
    if (!RedisClientManager.instance) {
      RedisClientManager.instance = new RedisClientManager(config);
    }
    return RedisClientManager.instance;
  }

  /**
   * 获取 Redis 客户端实例
   */
  getClient(): Redis {
    if (!this.client) {
      this.client = this.createClient();
    }
    return this.client;
  }

  /**
   * 创建 Redis 客户端
   */
  private createClient(): Redis {
    const client = new Redis({
      host: this.config.host,
      port: this.config.port,
      password: this.config.password,
      db: this.config.db,
      lazyConnect: this.config.lazyConnect,
      maxRetriesPerRequest: this.config.maxRetriesPerRequest,
      enableReadyCheck: this.config.enableReadyCheck,
      enableOfflineQueue: this.config.enableOfflineQueue,
      retryStrategy: this.config.retryStrategy,
    });

    // 事件监听
    client.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      logger.info('Redis connected successfully');
    });

    client.on('ready', () => {
      this.isConnected = true;
      logger.info('Redis ready to accept commands');
    });

    client.on('error', (error) => {
      this.isConnected = false;
      logger.error('Redis connection error:', error);
    });

    client.on('close', () => {
      this.isConnected = false;
      logger.warn('Redis connection closed');
    });

    client.on('reconnecting', (delay) => {
      this.reconnectAttempts++;
      logger.warn(`Redis reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    });

    client.on('end', () => {
      this.isConnected = false;
      this.client = null;
      logger.info('Redis connection ended');
    });

    return client;
  }

  /**
   * 连接 Redis
   */
  async connect(): Promise<void> {
    const client = this.getClient();
    if (!this.isConnected) {
      await client.connect();
    }
  }

  /**
   * 断开 Redis 连接
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
    }
  }

  /**
   * 检查连接状态
   */
  isReady(): boolean {
    return this.isConnected && this.client?.status === 'ready';
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const client = this.getClient();
      const result = await client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return false;
    }
  }

  /**
   * 获取 Redis 信息
   */
  async info(section?: string): Promise<string> {
    const client = this.getClient();
    return await client.info(section);
  }

  /**
   * 刷新当前数据库
   */
  async flushdb(): Promise<'OK'> {
    const client = this.getClient();
    return await client.flushdb();
  }

  /**
   * 清空所有数据库
   */
  async flushall(): Promise<'OK'> {
    const client = this.getClient();
    return await client.flushall();
  }
}

// 导出便捷函数和类型
export type RedisClient = Redis;

/**
 * 创建 Redis 客户端
 */
export function createRedisClient(config?: RedisConfig): RedisClient {
  const manager = RedisClientManager.getInstance(config);
  const client = manager.getClient();
  return client;
}

/**
 * 获取 Redis 客户端管理器
 */
export function getRedisManager(): RedisClientManager {
  return RedisClientManager.getInstance();
}

/**
 * 默认 Redis 客户端实例
 */
export const redis = createRedisClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  lazyConnect: true,
});
