import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import { appRouter } from './trpc/router';
import { createContextAsync } from './trpc/index';
import { log } from './lib/logger';
import { auth } from './lib/auth';
import { headersFromRequest } from './lib/cookie-utils';
import { registerLoggingMiddleware } from './middlewares/logger';
import { rateLimitMiddlewares } from './middlewares/rate-limit';
import { getRedisManager } from './lib/redis';
import { startCleanupTasks, stopCleanupTasks } from './tasks/cleanup-schedule';
import { performHealthCheck, performLivenessCheck } from './lib/health';

const fastify = Fastify({
  logger:
    process.env.NODE_ENV === 'development'
      ? {
          level: 'info',
          transport: { target: 'pino-pretty', options: { colorize: true, ignore: 'pid,hostname' } },
        }
      : { level: 'info' },
});

// 注册日志中间件
registerLoggingMiddleware(fastify);

fastify.register(fastifyCookie, {
  secret: process.env.COOKIE_SECRET || 'your-cookie-secret-change-this',
});

const isDev = process.env.NODE_ENV !== 'production';
const corsOriginRaw = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
      .map((o) => o.trim())
      .filter(Boolean)
  : isDev
    ? '*'
    : false;
const corsOrigin =
  corsOriginRaw === '*'
    ? true
    : Array.isArray(corsOriginRaw) && corsOriginRaw.includes('*')
      ? true
      : corsOriginRaw;

fastify.register(fastifyCors, {
  origin: corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['X-Request-Id', 'Content-Length', 'Content-Type'],
  maxAge: 86400,
});

// 注册限流中间件（仅在非健康检查路由和 OPTIONS 请求上生效）
fastify.addHook('onRequest', async (request, reply) => {
  // 跳过健康检查路由
  if (request.url.startsWith('/health')) {
    return;
  }

  // 跳过 OPTIONS 预检请求
  if (request.method === 'OPTIONS') {
    return;
  }

  // 应用全局限流
  await rateLimitMiddlewares.global(request, reply);
});

// Register authentication endpoint with catch-all route
// Better-Auth docs: https://www.better-auth.com/docs/integrations/fastify
// Fastify uses /:path* for catch-all routes (not just *)
fastify.all('/api/auth/*', async (request, reply) => {
  try {
    // Construct request URL
    const url = new URL(request.url, `http://${request.headers.host}`);

    // Convert Fastify headers to standard Headers object
    const headers = new Headers();
    Object.entries(request.headers).forEach(([key, value]) => {
      if (value) headers.append(key, value.toString());
    });

    // Create Fetch API-compatible request
    const req = new Request(url.toString(), {
      method: request.method,
      headers,
      ...(request.body ? { body: JSON.stringify(request.body) } : {}),
    });

    // Process authentication request
    const response = await auth.handler(req);

    // Forward response to client
    reply.status(response.status);
    response.headers.forEach((value, key) => reply.header(key, value));
    reply.send(response.body ? await response.text() : null);
  } catch (error) {
    log.error('Authentication Error:', error);
    reply.status(500).send({
      error: 'Internal authentication error',
      code: 'AUTH_FAILURE',
    });
  }
});

// 详细健康检查（包含所有组件状态）
fastify.get('/health', async () => {
  return performHealthCheck();
});

// 存活检查（快速检查，用于Kubernetes等编排系统）
fastify.get('/health/live', async () => {
  const result = await performLivenessCheck();
  return result;
});

// 就绪检查（检查服务是否准备好接收流量）
fastify.get('/health/ready', async () => {
  const health = await performHealthCheck();
  return {
    status: health.status,
    timestamp: health.timestamp,
  };
});

fastify.register(fastifyTRPCPlugin, {
  prefix: '/trpc',
  trpcOptions: {
    router: appRouter,
    createContext: createContextAsync,
  },
});

// 集成 tRPC Panel（仅在开发环境）
// TODO: 修复 tRPC Panel 版本兼容性问题
// if (process.env.NODE_ENV === 'development') {
//   const { handler } = createTRPCPanel({
//     url: `http://localhost:${process.env.PORT || 3001}`,
//     router: appRouter,
//     serveStatic: true,
//   });
//
//   fastify.register(async (fastify) => {
//     fastify.route({
//       method: ['GET', 'POST', 'PUT', 'DELETE'],
//       url: '/trpc-panel',
//       handler: async (request, reply) => {
//         return handler(request.raw, reply.raw);
//       },
//     });
//
//     fastify.log.info('🔧 tRPC Panel available at http://localhost:3001/trpc-panel');
//   });
// }

fastify.setErrorHandler((error: any, request, reply) => {
  // 判断是否为 Zod 验证错误
  const isZodError = error.name === 'ZodError' && error.errors;

  // 构建错误响应
  const errorResponse: any = {
    success: false,
    error: {
      message: error.message || '服务器内部错误',
      code: error.code || 'INTERNAL_SERVER_ERROR',
    },
  };

  // 处理 Zod 验证错误
  if (isZodError) {
    errorResponse.error.code = 'VALIDATION_ERROR';
    errorResponse.error.message = '参数验证失败';
    errorResponse.error.validationErrors = error.errors.map((e: any) => ({
      path: e.path.length > 0 ? e.path.join('.') : 'root',
      message: e.message,
    }));
    reply.status(400);
  } else {
    // 设置状态码
    const statusCode = error.statusCode || (error.code && getStatusCodeFromCode(error.code)) || 500;
    reply.status(statusCode);
  }

  // 开发环境添加堆栈信息
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = error.stack;
  }

  // 记录错误日志（已在中间件中记录，这里不再重复）
  reply.send(errorResponse);
});

// 根据 tRPC 错误代码获取 HTTP 状态码
function getStatusCodeFromCode(code: string): number {
  const codeMap: Record<string, number> = {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
  };
  return codeMap[code] || 500;
}

const start = async () => {
  try {
    // 检查Redis连接
    fastify.log.info('Checking Redis connection...');
    const redisManager = getRedisManager();
    const redisHealthy = await redisManager.healthCheck();

    if (!redisHealthy) {
      throw new Error('Redis is not available. Please check Redis configuration.');
    }

    fastify.log.info('✅ Redis connection is healthy');

    // 启动清理任务
    startCleanupTasks();

    const port = parseInt(process.env.PORT || '3001', 10);
    const host = process.env.HOST || '0.0.0.0';
    await fastify.listen({ port, host });
    fastify.log.info(`🚀 Server listening on http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

async function gracefulShutdown(signal: string) {
  fastify.log.info(`Received ${signal}, shutting down gracefully...`);
  // 停止清理任务
  stopCleanupTasks();
  await fastify.close();
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

start();
