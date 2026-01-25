import { initTRPC } from "@trpc/server";
import { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { z } from "zod";
import { db } from "../index";
import { createLogger } from "../lib/logger";

export function createContext({ req, res }: CreateFastifyContextOptions) {
  const requestId = (req.headers['x-request-id'] as string) || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const logger = createLogger('request').child({ requestId });
  
  logger.info('请求开始', {
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
  });
  
  const user = { name: req.headers.username ?? 'anonymous' };
  return { req, res, user, requestId, logger };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof Error ? error.cause.message : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
