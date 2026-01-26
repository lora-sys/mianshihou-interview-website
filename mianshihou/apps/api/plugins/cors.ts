import fastifyCors from '@fastify/cors';
interface CorsOptions {
  origin?: string;
  methods?: string[];
  credentials?: boolean;
}
export default async function corsPlugin(fastify : any, options: CorsOptions) {
  const corsOrigin = process.env.CORS_ORIGIN?.split(',') || (options.origin || '*');
  
  fastify.register(fastifyCors, {
    origin: corsOrigin,
    methods: options.methods || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    credentials: options.credentials ?? true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 86400,
  });
}