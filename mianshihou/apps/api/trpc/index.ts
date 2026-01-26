import { initTRPC } from "@trpc/server";
import { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { createLogger, log } from "../lib/logger";
import { db } from "../index";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

type FastifyRequestWithCookies = CreateFastifyContextOptions['req'] & {
  cookies?: Record<string, string>;
};

export function createContext(opts: CreateFastifyContextOptions) {
  const requestId = (opts.req.headers['x-request-id'] as string) 
    || `req_${Date.now()}_${Math.random().toString(36).substring(3, 6)}`;
  
  const logger = createLogger('request').child({ requestId });
  
  log.info('请求开始', { method: opts.req.method, url: opts.req.url });
  
  return { opts, logger, requestId };
}

export async function createContextAsync(opts: CreateFastifyContextOptions) {
  const ctx = createContext(opts);
  
  // 从 cookie 获取 user_id
  const userId = (opts.req as FastifyRequestWithCookies).cookies?.user_id;
  
  let dbUser = null;
  if (userId) {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, parseInt(userId))).limit(1);
      dbUser = user;
      log.info('用户已登录', { userId: dbUser.id, email: dbUser.email });
    } catch (error) {
      log.error('从数据库获取用户信息失败', error as Error);
    }
  }
  
  return { 
    ...ctx, 
    user: dbUser, 
    req: opts.req as FastifyRequestWithCookies,
    res: opts.res,
  };
}

export type Context = {
  opts: CreateFastifyContextOptions;
  logger: ReturnType<typeof createLogger>;
  requestId: string;
  user: typeof users.$inferSelect | null;
  req: FastifyRequestWithCookies;
  res: CreateFastifyContextOptions['res'];
};

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      success: false,
      data: {
        ...shape.data,
        zodError: error.cause instanceof Error ? error.cause.message : null,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
