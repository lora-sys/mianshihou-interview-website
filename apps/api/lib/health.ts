import { db } from '../index';
import { getRedisManager } from './redis';
import { logger } from './logger';

/**
 * 健康检查结果接口
 */
export interface HealthCheckResult {
  /** 整体状态 */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** 时间戳 */
  timestamp: string;
  /** 服务运行时间（秒） */
  uptime: number;
  /** 各组件状态 */
  components: {
    /** 数据库状态 */
    database: ComponentHealth;
    /** Redis状态 */
    redis: ComponentHealth;
    /** 定时任务状态 */
    scheduler: ComponentHealth;
  };
  /** 系统信息 */
  system: {
    /** Node版本 */
    nodeVersion: string;
    /** 平台 */
    platform: string;
    /** 架构 */
    arch: string;
    /** 内存使用 */
    memory: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
    };
  };
}

/**
 * 组件健康状态
 */
export interface ComponentHealth {
  /** 组件名称 */
  name: string;
  /** 是否健康 */
  healthy: boolean;
  /** 响应时间（毫秒） */
  responseTime: number;
  /** 错误信息 */
  error?: string;
  /** 额外信息 */
  details?: Record<string, any>;
}

/**
 * 执行数据库健康检查
 */
async function checkDatabaseHealth(): Promise<ComponentHealth> {
  const startTime = Date.now();

  try {
    // 执行简单的查询检查数据库连接
    await db.execute('SELECT 1');

    return {
      name: 'database',
      healthy: true,
      responseTime: Date.now() - startTime,
      details: {
        type: 'postgresql',
      },
    };
  } catch (error) {
    logger.error('Database health check failed:', error);

    return {
      name: 'database',
      healthy: false,
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 执行Redis健康检查
 */
async function checkRedisHealth(): Promise<ComponentHealth> {
  const startTime = Date.now();

  try {
    const redisManager = getRedisManager();
    const healthy = await redisManager.healthCheck();

    if (!healthy) {
      throw new Error('Redis connection failed');
    }

    return {
      name: 'redis',
      healthy: true,
      responseTime: Date.now() - startTime,
      details: {
        type: 'redis',
      },
    };
  } catch (error) {
    logger.error('Redis health check failed:', error);

    return {
      name: 'redis',
      healthy: false,
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 执行定时任务健康检查
 */
async function checkSchedulerHealth(): Promise<ComponentHealth> {
  const startTime = Date.now();

  try {
    // 这里可以检查定时任务是否正在运行
    // 目前只返回健康状态
    return {
      name: 'scheduler',
      healthy: true,
      responseTime: Date.now() - startTime,
      details: {
        status: 'running',
      },
    };
  } catch (error) {
    logger.error('Scheduler health check failed:', error);

    return {
      name: 'scheduler',
      healthy: false,
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 获取系统信息
 */
function getSystemInfo() {
  const memoryUsage = process.memoryUsage();

  return {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    memory: {
      rss: memoryUsage.rss,
      heapTotal: memoryUsage.heapTotal,
      heapUsed: memoryUsage.heapUsed,
      external: memoryUsage.external,
    },
  };
}

/**
 * 执行完整的健康检查
 */
export async function performHealthCheck(): Promise<HealthCheckResult> {
  const timestamp = new Date().toISOString();
  const uptime = process.uptime();

  // 并行检查所有组件
  const [database, redis, scheduler] = await Promise.all([
    checkDatabaseHealth(),
    checkRedisHealth(),
    checkSchedulerHealth(),
  ]);

  // 确定整体状态
  const allHealthy = database.healthy && redis.healthy && scheduler.healthy;
  const anyHealthy = database.healthy || redis.healthy || scheduler.healthy;

  let status: 'healthy' | 'degraded' | 'unhealthy';
  if (allHealthy) {
    status = 'healthy';
  } else if (anyHealthy) {
    status = 'degraded';
  } else {
    status = 'unhealthy';
  }

  return {
    status,
    timestamp,
    uptime,
    components: {
      database,
      redis,
      scheduler,
    },
    system: getSystemInfo(),
  };
}

/**
 * 快速健康检查（只检查关键组件）
 */
export async function performLivenessCheck(): Promise<{ status: 'ok' | 'error' }> {
  try {
    const redisManager = getRedisManager();
    const redisHealthy = await redisManager.healthCheck();

    if (!redisHealthy) {
      return { status: 'error' };
    }

    return { status: 'ok' };
  } catch (error) {
    logger.error('Liveness check failed:', error);
    return { status: 'error' };
  }
}
