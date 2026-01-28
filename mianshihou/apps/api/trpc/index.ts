import { initTRPC } from "@trpc/server";
import { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { createLogger, log } from "../lib/logger";
import { db } from "../index";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { auth } from "../lib/auth";
import { headersFromRequest } from "../lib/cookie-utils";

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

  let user = null;
  let session = null;

  try {
    // 使用解耦的工具函数获取 Better-Auth Headers
    const headers = headersFromRequest(opts.req);

    // 使用 Better-Auth 获取会话，传入 headers
    session = await auth.api.getSession({
      headers,
    });

    if (session?.user) {
      user = {
        id: session.user.id,
        email: session.user.email,
        userName: session.user.name,
        userAvatar: session.user.image,
        userRole: session.user.role || 'user',
        status: session.user.status || 'active',
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
