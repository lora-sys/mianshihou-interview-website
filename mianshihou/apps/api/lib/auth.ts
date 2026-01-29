import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../index';
import { users, sessions, accounts, verifications } from '../db/schema';

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3001',
  basePath: '/api/auth',
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
  },
  user: {
    fields: {
      id: 'id',
      email: 'email',
      emailVerified: 'emailVerified',
      name: 'userName',
      image: 'userAvatar',
      createdAt: 'createTime',
      updatedAt: 'updateTime',
      role: 'userRole',
      status: 'status',
    },
  },
  advanced: {
    cookiePrefix: 'mianshihou',
    useSecureCookies: process.env.NODE_ENV === 'production',
    defaultCookieAttributes: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    },
    database: {
      generateId: true,
    },
    jwt: {
      expiresIn: '7d',
      refreshExpiresIn: '30d',
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
});
