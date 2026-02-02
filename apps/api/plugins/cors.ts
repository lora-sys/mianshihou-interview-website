import fastifyCors from '@fastify/cors';
import { log } from '../lib/logger';

interface CorsOptions {
  origin?: string;
  methods?: string[];
  credentials?: boolean;
}

export default async function corsPlugin(fastify: any, options: CorsOptions) {
  const corsOrigin = process.env.CORS_ORIGIN?.split(',') || options.origin || '*';

  await fastify.register(fastifyCors, {
    origin: corsOrigin,
    methods: options.methods || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    credentials: options.credentials ?? true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['X-Request-Id', 'Content-Length', 'Content-Type'],
    maxAge: 86400,
  });

  log.info('CORS plugin registered', { origin: corsOrigin });
}
