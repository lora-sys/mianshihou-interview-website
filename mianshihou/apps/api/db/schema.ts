import {
  pgTable,
  serial,
  bigserial,
  text,
  varchar,
  integer,
  bigint,
  boolean,
  timestamp,
  vector,
  index,
  uniqueIndex,
  foreignKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 用户表
export const users = pgTable(
  "user",
  {
    id: serial("id").primaryKey(),
    userAccount: varchar("user_account", { length: 256 }).notNull().unique(),
    userPassword: varchar("user_password", { length: 64 }).notNull(),
    email: varchar("email", { length: 256 }).unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    phone: varchar("phone", { length: 20 }).unique(),
    unionId: varchar("union_id", { length: 256 }),
    mpOpenId: varchar("mp_open_id", { length: 256 }),
    userName: varchar("user_name", { length: 256 }),
    userAvatar: varchar("user_avatar", { length: 1024 }),
    userProfile: varchar("user_profile", { length: 512 }),
    userRole: varchar("user_role", { length: 256 }).default("user").notNull(),
    status: varchar("status", { length: 32 }).default("active").notNull(),
    lastLoginIp: varchar("last_login_ip", { length: 64 }),
    lastLoginTime: timestamp("last_login_time"),
    createTime: timestamp("create_time").defaultNow().notNull(),
    updateTime: timestamp("update_time").defaultNow().notNull(),
    isDelete: boolean("is_delete").default(false).notNull(),
  },
  (table) => [
    index("idx_user_account").on(table.userAccount),
    index("idx_user_email").on(table.email),
    index("idx_user_phone").on(table.phone),
    index("idx_user_role").on(table.userRole),
    index("idx_user_status").on(table.status),
  ],
);

// Better-Auth Session 表
export const sessions = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("session_userId_idx").on(table.userId),
  ],
);

// Better-Auth Account 表（用于 OAuth 等）
export const accounts = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("account_userId_idx").on(table.userId),
  ],
);

// Better-Auth Verification 表（用于邮箱验证等）
export const verifications = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("verification_identifier_idx").on(table.identifier),
  ],
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

// 题目表
export const questions = pgTable(
  "question",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    tags: text("tags"),
    answer: text("answer"),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questionBankId: integer("question_bank_id").references(
      () => questionBanks.id,
      {
        onDelete: "set null",
      },
    ),
    editTime: timestamp("edit_time"),
    createTime: timestamp("create_time").defaultNow().notNull(),
    updateTime: timestamp("update_time").defaultNow().notNull(),
    isDelete: boolean("is_delete").default(false).notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
  },
  (table) => [
    index("idx_question_user_id").on(table.userId),
    index("idx_question_bank_id").on(table.questionBankId),
  ],
);

// 题库表
export const questionBanks = pgTable(
  "question_bank",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    picture: text("picture"),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questionCount: integer("question_count").default(0),
    editTime: timestamp("edit_time"),
    createTime: timestamp("create_time").defaultNow().notNull(),
    updateTime: timestamp("update_time").defaultNow().notNull(),
    isDelete: boolean("is_delete").default(false).notNull(),
  },
  (table) => [index("idx_question_bank_user_id").on(table.userId)],
);

// 题库题目关联表
export const questionBankQuestions = pgTable(
  "question_bank_question",
  {
    id: serial("id").primaryKey(),
    questionBankId: integer("question_bank_id")
      .notNull()
      .references(() => questionBanks.id, { onDelete: "cascade" }),
    questionId: integer("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createTime: timestamp("create_time").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uk_qb_question").on(table.questionBankId, table.questionId),
  ],
);

// 帖子表
export const posts = pgTable(
  "post",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    title: text("title"),
    content: text("content"),
    tags: text("tags"),
    thumbNum: integer("thumb_num").default(0).notNull(),
    favourNum: integer("favour_num").default(0).notNull(),
    userId: bigint("user_id", { mode: "bigint" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createTime: timestamp("create_time").defaultNow().notNull(),
    updateTime: timestamp("update_time").defaultNow().notNull(),
    isDelete: boolean("is_delete").default(false).notNull(),
  },
  (table) => [
    index("idx_post_user_id").on(table.userId),
    index("idx_post_create_time").on(table.createTime),
  ],
);

// 帖子点赞表
export const postThumbs = pgTable(
  "post_thumb",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    postId: bigint("post_id", { mode: "bigint" })
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: bigint("user_id", { mode: "bigint" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createTime: timestamp("create_time").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("uk_post_thumb").on(table.postId, table.userId)],
);

// 帖子收藏表
export const postFavours = pgTable(
  "post_favour",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    postId: bigint("post_id", { mode: "bigint" })
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: bigint("user_id", { mode: "bigint" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createTime: timestamp("create_time").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("uk_post_favour").on(table.postId, table.userId)],
);
