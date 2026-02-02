import fastifyCors from '@fastify/cors';
import { log } from '../lib/logger';

interface CorsOptions {
  origin?: string;
  methods?: string[];
  credentials?: boolean;
}

export default async function corsPlugin(fastify: any, options: CorsOptions) {
  const rawOrigin =
    process.env.CORS_ORIGIN?.split(',')
      .map((o) => o.trim())
      .filter(Boolean) ??
    options.origin ??
    '*';
  const isCredentialsEnabled = options.credentials ?? true;

  const corsOrigin =
    rawOrigin === '*'
      ? isCredentialsEnabled
        ? true
        : '*'
      : Array.isArray(rawOrigin)
        ? rawOrigin.includes('*') && isCredentialsEnabled
          ? true
          : rawOrigin
        : rawOrigin;

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
