import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { createLogger } from '../lib/logger';

const logger = createLogger('LoggerMiddleware');

// 性能监控配置
interface PerformanceMetrics {
  startTime: number;
  endTime: number;
  duration: number;
}

// 请求上下文，用于存储性能数据
declare module 'fastify' {
  interface FastifyRequest {
    metrics?: PerformanceMetrics;
  }
}

// 敏感信息字段，需要脱敏处理
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'authorization',
  'cookie',
  'session',
  'secret',
  'apikey',
  'api_key',
];

// 脱敏处理函数
function sanitizeData(data: any, depth = 0): any {
  if (depth > 5) return '[深度嵌套]'; // 防止循环引用

  if (data === null || data === undefined) return data;

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeData(item, depth + 1));
  }

  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const key in data) {
      if (SENSITIVE_FIELDS.some((field) => key.toLowerCase().includes(field))) {
        sanitized[key] = '[已脱敏]';
      } else {
        sanitized[key] = sanitizeData(data[key], depth + 1);
      }
    }
    return sanitized;
  }

  return data;
}

// 提取请求信息
function extractRequestInfo(request: FastifyRequest) {
  return {
    method: request.method,
    url: request.url,
    path: request.routerPath,
    query: request.query,
    headers: {
      'user-agent': request.headers['user-agent'],
      'content-type': request.headers['content-type'],
      'x-forwarded-for': request.headers['x-forwarded-for'],
      'x-real-ip': request.headers['x-real-ip'],
      referer: request.headers['referer'],
    },
    body: request.method !== 'GET' ? sanitizeData(request.body) : undefined,
    ip: request.ip,
    hostname: request.hostname,
  };
}

// 提取响应信息
function extractResponseInfo(reply: FastifyReply, startTime: number) {
  return {
    statusCode: reply.statusCode,
    headers: {
      'content-type': reply.getHeader('content-type'),
      'content-length': reply.getHeader('content-length'),
    },
    responseTime: Date.now() - startTime,
  };
}

// 判断是否应该记录请求日志
function shouldLogRequest(request: FastifyRequest): boolean {
  // 不记录健康检查
  if (request.routerPath === '/health') return false;

  // 不记录静态资源
  if (request.routerPath?.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico)$/)) return false;

  return true;
}

// 判断是否应该记录响应日志
function shouldLogResponse(reply: FastifyReply): boolean {
  // 只记录错误响应或慢请求
  const isError = reply.statusCode >= 400;
  return isError;
}

// 请求日志中间件
export function requestLogger(fastify: FastifyInstance) {
  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    if (!shouldLogRequest(request)) return;

    // 记录请求开始时间
    request.metrics = {
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
    };

    // 记录请求日志
    logger.info('收到请求', {
      request: extractRequestInfo(request),
      timestamp: new Date().toISOString(),
    });
  });
}

// 响应日志中间件
export function responseLogger(fastify: FastifyInstance) {
  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!shouldLogRequest(request)) return;

    if (!request.metrics) {
      request.metrics = {
        startTime: Date.now(),
        endTime: Date.now(),
        duration: 0,
      };
    }

    // 记录响应结束时间
    request.metrics.endTime = Date.now();
    request.metrics.duration = request.metrics.endTime - request.metrics.startTime;

    const responseInfo = extractResponseInfo(reply, request.metrics.startTime);

    // 判断是否需要记录详细响应日志
    if (shouldLogResponse(reply)) {
      logger.warn('请求完成（错误）', {
        request: extractRequestInfo(request),
        response: responseInfo,
        timestamp: new Date().toISOString(),
      });
    } else {
      // 只记录性能指标
      logger.debug('请求完成', {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: responseInfo.responseTime,
        timestamp: new Date().toISOString(),
      });
    }
  });
}

// 性能监控中间件
export function performanceMonitor(fastify: FastifyInstance) {
  // 慢请求阈值（毫秒）
  const SLOW_REQUEST_THRESHOLD = 1000;

  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!shouldLogRequest(request)) return;

    if (!request.metrics) return;

    const duration = request.metrics.duration;

    // 慢请求警告
    if (duration > SLOW_REQUEST_THRESHOLD) {
      logger.warn('慢请求警告', {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        duration,
        threshold: SLOW_REQUEST_THRESHOLD,
        timestamp: new Date().toISOString(),
      });
    }

    // 性能统计（可以扩展为发送到监控系统）
    if (duration > 0) {
      logger.debug('性能指标', {
        method: request.method,
        path: request.routerPath,
        statusCode: reply.statusCode,
        duration,
        timestamp: new Date().toISOString(),
      });
    }
  });
}

// 判断是否为 Zod 验证错误
function isZodError(error: any): boolean {
  return error && error.name === 'ZodError' && error.errors;
}

// 格式化 Zod 错误信息
function formatZodError(error: any): Array<{ path: string; message: string }> {
  if (!error.errors || !Array.isArray(error.errors)) return [];

  return error.errors.map((e: any) => ({
    path: e.path.length > 0 ? e.path.join('.') : 'root',
    message: e.message,
  }));
}

// 错误日志中间件
export function errorLogger(fastify: FastifyInstance) {
  fastify.addHook('onError', async (request: FastifyRequest, reply: FastifyReply, error: Error) => {
    const errorInfo: any = {
      message: error.message,
      name: error.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    };

    // 处理 Zod 验证错误
    if (isZodError(error)) {
      errorInfo.validationErrors = formatZodError(error);
      errorInfo.formattedMessage = `参数验证失败: ${errorInfo.validationErrors.map((e: any) => `${e.path}: ${e.message}`).join(', ')}`;
    }

    logger.error('请求错误', {
      request: extractRequestInfo(request),
      error: errorInfo,
      response: {
        statusCode: reply.statusCode,
      },
      timestamp: new Date().toISOString(),
    });
  });
}

// 注册所有日志中间件
export function registerLoggingMiddleware(fastify: FastifyInstance) {
  requestLogger(fastify);
  responseLogger(fastify);
  performanceMonitor(fastify);
  errorLogger(fastify);

  logger.info('日志中间件已注册');
}
