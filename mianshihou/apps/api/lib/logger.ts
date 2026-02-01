import pino from 'pino';
import pinoLoki from 'pino-loki';

// Loki 配置接口
interface LokiConfig {
  enabled: boolean;
  host?: string;
  basicAuth?: string;
  labels?: Record<string, string>;
  timeout?: number;
}

// 获取 Loki 配置
function getLokiConfig(): LokiConfig {
  return {
    enabled: process.env.LOKI_ENABLED === 'true',
    host: process.env.LOKI_URL || 'http://localhost:3100',
    basicAuth: process.env.LOKI_BASIC_AUTH,
    labels: {
      service: 'mianshihou-api',
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '1.0.0',
    },
    timeout: 30000,
  };
}

// 创建日志配置
const logConfig: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || 'info',
  // 添加基础字段
  base: {
    hostname: process.env.HOSTNAME || 'unknown',
    pid: process.pid,
  },
  // 序列化器
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
  // 开发环境使用 pino-pretty 美化
  ...(process.env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
        singleLine: false,
      },
    },
  }),
  // 生产环境添加 Loki transport
  ...(process.env.NODE_ENV === 'production' && (() => {
    const lokiConfig = getLokiConfig();
    if (lokiConfig.enabled && lokiConfig.host) {
      return {
        transports: {
          loki: pinoLoki({
            host: lokiConfig.host,
            basicAuth: lokiConfig.basicAuth,
            labels: lokiConfig.labels,
            timeout: lokiConfig.timeout,
            batching: true,
            interval: 5,
          }),
        },
      };
    }
    return {};
  })()),
};

// 创建日志实例
export const logger = pino(logConfig);

// 创建带上下文的日志记录器
export function createLogger(context: string, additionalFields?: Record<string, any>) {
  return logger.child({
    context,
    ...additionalFields,
  });
}

// 创建带追踪信息的日志记录器
export function createLoggerWithTrace(
  context: string,
  traceId?: string,
  userId?: string,
  requestId?: string
) {
  const fields: Record<string, any> = { context };
  if (traceId) fields.traceId = traceId;
  if (userId) fields.userId = userId;
  if (requestId) fields.requestId = requestId;
  return logger.child(fields);
}

// 常用日志方法
export const log = {
  info: (message: string, data?: any) => logger.info(data, message),
  error: (message: string, error?: any, data?: any) => {
    logger.error({ ...data, error }, message);
  },
  warn: (message: string, data?: any) => logger.warn(data, message),
  debug: (message: string, data?: any) => logger.debug(data, message),
};

// 结构化日志记录器
export const structuredLog = {
  // 用户操作日志
  userAction: (userId: string, action: string, data?: any) => {
    logger.info({
      userId,
      action,
      type: 'user_action',
      timestamp: new Date().toISOString(),
      ...data,
    }, `User action: ${action}`);
  },

  // API 请求日志
  apiRequest: (requestId: string, method: string, path: string, userId?: string, data?: any) => {
    logger.info({
      requestId,
      method,
      path,
      userId,
      type: 'api_request',
      timestamp: new Date().toISOString(),
      ...data,
    }, `API request: ${method} ${path}`);
  },

  // 数据库操作日志
  dbOperation: (operation: string, table: string, duration?: number, data?: any) => {
    logger.info({
      operation,
      table,
      duration,
      type: 'db_operation',
      timestamp: new Date().toISOString(),
      ...data,
    }, `DB operation: ${operation} on ${table}`);
  },

  // 缓存操作日志
  cacheOperation: (operation: string, key: string, hit?: boolean, data?: any) => {
    logger.info({
      operation,
      key,
      hit,
      type: 'cache_operation',
      timestamp: new Date().toISOString(),
      ...data,
    }, `Cache operation: ${operation} ${key}`);
  },

  // 错误日志
  errorWithContext: (error: Error, context: string, userId?: string, requestId?: string) => {
    logger.error({
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      context,
      userId,
      requestId,
      type: 'error',
      timestamp: new Date().toISOString(),
    }, `Error in ${context}`);
  },

  // 性能日志
  performance: (operation: string, duration: number, data?: any) => {
    logger.info({
      operation,
      duration,
      type: 'performance',
      timestamp: new Date().toISOString(),
      ...data,
    }, `Performance: ${operation} took ${duration}ms`);
  },
};
