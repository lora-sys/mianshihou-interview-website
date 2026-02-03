import { initTRPC } from '@trpc/server';
import { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { createLogger, log } from '../lib/logger';
import { db } from '../index';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '../lib/auth';
import { headersFromRequest } from '../lib/cookie-utils';
import { redis } from '../lib/redis';
import { verifyAccessToken } from '../lib/jwt';

type FastifyRequestWithCookies = CreateFastifyContextOptions['req'] & {
  cookies?: Record<string, string>;
};

export function createContext(opts: CreateFastifyContextOptions) {
  const requestId =
    (opts.req.headers['x-request-id'] as string) ||
    `req_${Date.now()}_${Math.random().toString(36).substring(3, 6)}`;

  const logger = createLogger('request').child({ requestId });

  log.info('请求开始', { method: opts.req.method, url: opts.req.url });

  return { opts, logger, requestId };
}

export async function createContextAsync(opts: CreateFastifyContextOptions) {
  const ctx = createContext(opts);

  let user = null;
  let session = null;
  let tokenUserId: string | null = null;

  try {
    // 使用解耦的工具函数获取 Better-Auth Headers
    const headers = headersFromRequest(opts.req);

    // 使用 Better-Auth 获取会话，传入 headers
    session = await auth.api.getSession({
      headers,
    });

    const authHeader = String(opts.req.headers['authorization'] ?? '');
    if (!session?.user && authHeader.toLowerCase().startsWith('bearer ')) {
      const token = authHeader.slice(7).trim();
      const verified = await verifyAccessToken(token);
      tokenUserId = verified?.userId ?? null;
    }

    if (session?.user || tokenUserId) {
      let dbUser: {
        id: string;
        email: string | null;
        userName: string | null;
        userAvatar: string | null;
        userRole: string;
        status: string;
      } | null = null;

      const userId = session?.user?.id ?? tokenUserId!;
      const cacheKey = `ctx_user:${userId}`;
      try {
        const cached = await redis.get(cacheKey);
        if (cached) dbUser = JSON.parse(cached);
      } catch {}

      if (!dbUser) {
        const [row] = await db
          .select({
            id: users.id,
            email: users.email,
            userName: users.userName,
            userAvatar: users.userAvatar,
            userRole: users.userRole,
            status: users.status,
          })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);
        dbUser = row ?? null;
        try {
          if (dbUser) {
            await redis.set(cacheKey, JSON.stringify(dbUser), 'EX', 60);
          }
        } catch {}
      }

      user = {
        id: userId,
        email: dbUser?.email ?? session?.user?.email ?? null,
        userName: dbUser?.userName ?? session?.user?.name ?? null,
        userAvatar: dbUser?.userAvatar ?? session?.user?.image ?? null,
        userRole: dbUser?.userRole ?? 'user',
        status: dbUser?.status ?? 'active',
      };
      log.info('用户已登录', { userId: user.id, email: user.email });
    }
  } catch (error) {
    log.error('获取 Better-Auth 会话失败', error as Error);
  }

  return {
    ...ctx,
    user,
    session,
    req: opts.req as FastifyRequestWithCookies,
    res: opts.res,
  };
}

export type Context = {
  opts: CreateFastifyContextOptions;
  logger: ReturnType<typeof createLogger>;
  requestId: string;
  user: {
    id: string;
    email: string;
    userName: string;
    userAvatar: string | null;
    userRole: string;
    status: string;
  } | null;
  session: any | null;
  req: FastifyRequestWithCookies;
  res: CreateFastifyContextOptions['res'];
};

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    const cause = error.cause as any;
    const biz = cause && typeof cause === 'object' ? (cause.biz ?? null) : null;
    return {
      ...shape,
      success: false,
      data: {
        ...shape.data,
        zodError: error.cause instanceof Error ? error.cause.message : null,
        ...(biz ? { biz } : {}),
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;
export { t };

// 导出重试中间件
export {
  retryMiddleware,
  circuitBreakerMiddleware,
  dbRetryMiddleware,
  apiRetryMiddleware,
  createRetryMiddleware,
  createCircuitBreakerMiddleware,
} from './middleware/retry';
