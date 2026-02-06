# 后端开发模板指南

本文档详细介绍了 `apps/api` 的架构模式、开发流程和最佳实践，旨在作为新功能开发的标准模板。

## 🏗 技术栈

- **Runtime**: Bun / Node.js
- **Framework**: Fastify
- **API Layer**: tRPC (主要), REST (部分 Webhook)
- **Database**: PostgreSQL (via Drizzle ORM)
- **Cache**: Redis
- **Auth**: Better Auth

## 📂 目录结构

```
apps/api/
├── src/
│   ├── db/                 # 数据库 Schema 和连接
│   │   ├── schema.ts       # Drizzle Schema 定义
│   │   └── index.ts        # DB 实例
│   ├── routers/            # tRPC 路由定义 (Controllers)
│   │   ├── _app.ts         # Root Router
│   │   └── [module].ts     # 模块路由
│   ├── services/           # 业务逻辑层 (Service Layer)
│   ├── middlewares/        # Fastify 和 tRPC 中间件
│   ├── lib/                # 通用工具函数
│   └── index.ts            # 入口文件
├── tests/                  # 测试文件
└── drizzle/                # 数据库迁移文件
```

## 🚀 开发流程模板

开发一个新功能（例如：`Post` 管理）的标准流程：

### 1. 定义数据模型 (Schema)

在 `src/db/schema.ts` 中定义表结构：

```typescript
// src/db/schema.ts
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

运行迁移命令：

```bash
bun run db:generate
bun run db:push
```

### 2. 编写业务服务 (Service)

在 `src/services/` 中封装复杂的业务逻辑。避免在 Router 中直接写大量逻辑。

```typescript
// src/services/post.service.ts
import { db } from "../db";
import { posts } from "../db/schema";
import { eq } from "drizzle-orm";

export const postService = {
  async create(data: typeof posts.$inferInsert) {
    return db.insert(posts).values(data).returning();
  },
  async list() {
    return db.select().from(posts);
  },
};
```

### 3. 定义 tRPC 路由 (Router)

在 `src/routers/` 中定义 API 接口，处理输入验证和权限控制。

```typescript
// src/routers/post.router.ts
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { z } from "zod";
import { postService } from "../services/post.service";

export const postRouter = router({
  list: publicProcedure.query(async () => {
    return postService.list();
  }),
  create: protectedProcedure
    .input(z.object({ title: z.string(), content: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      // ctx.user 包含了当前登录用户信息
      return postService.create(input);
    }),
});
```

### 4. 注册路由

在 `src/routers/_app.ts` 中注册新路由：

```typescript
import { postRouter } from "./post.router";

export const appRouter = router({
  // ... 其他路由
  posts: postRouter,
});
```

## 🛡️ 最佳实践

### 错误处理

不要抛出原始错误，使用 `TRPCError` 或自定义异常类。

```typescript
import { TRPCError } from "@trpc/server";

if (!post) {
  throw new TRPCError({
    code: "NOT_FOUND",
    message: "文章不存在",
  });
}
```

### 输入验证

始终使用 Zod 进行严格的输入验证。

```typescript
.input(z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  age: z.number().min(18, "必须年满18岁"),
}))
```

### 性能优化

- **N+1 问题**: 在列表查询中小心关联查询。
- **分页**: 所有列表接口必须支持分页（`page`, `pageSize`）。
- **缓存**: 对不经常变动的数据使用 Redis 缓存。

### 安全性

- **权限检查**: 优先使用 `protectedProcedure`。
- **数据过滤**: 即使在 Service 层返回了所有字段，Router 层也应确保不泄露敏感信息（如密码 hash）。
