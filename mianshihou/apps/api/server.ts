import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import { appRouter } from './trpc/router';
import { createContextAsync } from './trpc/index';
import corsPlugin from './plugins/cors';
import { log } from './lib/logger';

const fastify = Fastify({
  logger: process.env.NODE_ENV === 'development' ? {
    level: 'info',
    transport: { target: 'pino-pretty', options: { colorize: true, ignore: 'pid,hostname' } },
  } : { level: 'info' },
});

fastify.register(fastifyCookie, {
  secret: process.env.COOKIE_SECRET || 'your-cookie-secret-change-this',
});
fastify.register(corsPlugin, {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
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

fastify.setErrorHandler((error, request, reply) => {
  log.error('请求错误', { error: error.message, stack: error.stack, url: request.url });
  reply.status(error.statusCode || 500).send({
    success: false,
    error: {
      message: error.message,
      code: error.code || 'INTERNAL_SERVER_ERROR',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    },
  });
});

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000', 10);
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
