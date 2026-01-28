import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import { appRouter } from './trpc/router';
import { createContextAsync } from './trpc/index';
import corsPlugin from './plugins/cors';
import { log } from './lib/logger';
import { auth } from './lib/auth';
import { headersFromRequest } from './lib/cookie-utils';

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

// Register authentication endpoint with catch-all route
// Better-Auth docs: https://www.better-auth.com/docs/integrations/fastify
// Fastify uses /:path* for catch-all routes (not just *)
fastify.all("/api/auth/*", async (request, reply) => {
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
      log.error("Authentication Error:", error);
      reply.status(500).send({
        error: "Internal authentication error",
        code: "AUTH_FAILURE"
      });
    }
  }
);

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

fastify.setErrorHandler((error : any, request, reply) => {
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
