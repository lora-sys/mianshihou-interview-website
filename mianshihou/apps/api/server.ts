import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import { appRouter } from './trpc/router';
import { createContext } from './trpc/index';

// 创建 Fastify 实例
const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

// 注册 CORS
fastify.register(fastifyCors, {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
});

// 注册 JWT（预留，后续用于认证）
fastify.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
});

// 健康检查端点
fastify.get('/health', async (request, reply) => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
});

// 注册 tRPC
fastify.register(fastifyTRPCPlugin, {
  prefix: '/trpc',
  trpcOptions: {
    router: appRouter,
    createContext,
  },
});

// 全局错误处理
fastify.setErrorHandler((error: any, request: any, reply: any) => {
  fastify.log.error(error);

  reply.status(error.statusCode || 500).send({
    error: {
      message: error.message,
      code: error.code || 'INTERNAL_SERVER_ERROR',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    },
  });
});

// 启动服务器
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000', 10);
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    fastify.log.info(`🚀 Server listening on http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// 优雅关闭
const gracefulShutdown = async (signal: string) => {
  fastify.log.info(`Received ${signal}, shutting down gracefully...`);
  await fastify.close();
  fastify.log.info('Server closed');
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', ()   => gracefulShutdown('SIGINT'));

// 启动服务器
start();