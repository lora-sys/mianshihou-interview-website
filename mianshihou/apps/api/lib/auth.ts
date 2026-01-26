import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../index";
import { users, sessions, accounts, verifications } from "../db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
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
      id: "id",
      name: "userName",  // better-auth 的 name 映射到 userName
      email: "email",
      emailVerified: "emailVerified",
      image: "userAvatar",
      createdAt: "createTime",
      updatedAt: "updateTime",
    },
  },
  advanced: {
    cookiePrefix: "mianshihou",
    cookieSecure: process.env.NODE_ENV === "production",
    database: {
      generateId: false,
    },
  },
});