import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import { appRouter } from './trpc/router';
import { createContextAsync } from './trpc/index';
import corsPlugin from './plugins/cors';
import { log } from './lib/logger';
import { auth } from './lib/auth';
import { headersFromRequest } from './lib/cookie-utils';
import { registerLoggingMiddleware } from './middlewares/logger';

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
fastify.register(corsPlugin, {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
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

fastify.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
}));

fastify.register(fastifyTRPCPlugin, {
  prefix: '/trpc',
  trpcOptions: {
    router: appRouter,
    createContext: createContextAsync,
  },
});

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
    const port = parseInt(process.env.PORT || '3001', 10);
    const host = process.env.HOST || '0.0.0.0';
    await fastify.listen({ port, host });
    fastify.log.info(`Server listening on http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

async function gracefulShutdown(signal: string) {
  fastify.log.info(`Received ${signal}, shutting down gracefully...`);
  await fastify.close();
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

start();
