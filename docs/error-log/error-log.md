# 面试后项目开发错误记录

本文档记录了在面试后项目开发过程中遇到的所有错误、问题及其解决方案。

---

## 错误 1: tRPC 中间件错误 - "middleware is not a function"

### 错误描述

在测试 `users.list` 接口时，出现以下错误：

```
TypeError: middleware is not a function
```

### 错误原因

在 `trpc/middleware/permissions.ts` 文件中，中间件的组合方式不正确。代码直接调用了中间件函数，而不是使用工厂模式返回中间件。

**错误代码**：
```typescript
export const requireRole = (role: string) => {
  return publicProcedure.use(async ({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "未授权访问，请先登录",
      });
    }
    if (ctx.user.userRole !== role) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `需要 ${role} 权限`,
      });
    }
    return next();
  });
};

// 错误的使用方式
export const adminProcedure = publicProcedure.use(requireRole("admin"));
```

### 解决方案

将中间件改为工厂模式，确保返回的是一个中间件函数：

```typescript
export const requireRole = (role: string) => {
  return publicProcedure.use(async ({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "未授权访问，请先登录",
      });
    }
    if (ctx.user.userRole !== role) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `需要 ${role} 权限`,
      });
    }
    return next();
  });
};

// 正确的使用方式 - 直接使用 factory
export const adminProcedure = publicProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "未授权访问，请先登录",
    });
  }
  if (ctx.user.userRole !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "需要管理员权限",
    });
  }
  return next();
});
```

### 修改文件

- `mianshihou/apps/api/trpc/middleware/permissions.ts`

### 关键要点

- tRPC 中间件必须使用工厂模式
- 不能直接调用中间件函数，而是要返回一个新的中间件函数
- 每个中间件应该是一个独立的函数，接收 `ctx` 和 `next` 参数

---

## 错误 2: Better-Auth 注册错误 - userAccount 字段违反 NOT NULL 约束

### 错误描述

用户注册时出现以下错误：

```
null value in column "user_account" of relation "user" violates not-null constraint
```

### 错误原因

数据库 schema 中 `userAccount` 字段被设置为 `notNull()`，但 Better-Auth 不会自动填充自定义字段。Better-Auth 只会填充其标准字段（如 `id`, `email`, `name` 等），而不会填充我们在 schema 中定义的自定义字段。

**错误代码**：
```typescript
export const users = pgTable("user", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 256 }).notNull().unique(),
  userAccount: varchar("user_account", { length: 256 }).unique().notNull(), // 错误：设置为 notNull
  userPassword: varchar("user_password", { length: 64 }).notNull(), // 错误：设置为 notNull
  // ...
});
```

### 解决方案

将自定义字段设置为可空：

```typescript
export const users = pgTable("user", {
  id: text("id").primaryKey(), // 改为 text 类型
  email: varchar("email", { length: 256 }).notNull().unique(),
  userAccount: varchar("user_account", { length: 256 }).unique(), // 移除 notNull
  userPassword: varchar("user_password", { length: 64 }), // 移除 notNull
  // ...
});
```

### 修改文件

- `mianshihou/apps/api/db/schema.ts`

### 关键要点

- Better-Auth 只会填充其标准字段，不会填充自定义字段
- 自定义字段应该设置为可空，或者在应用层手动填充
- Better-Auth 的标准字段包括：`id`, `email`, `emailVerified`, `name`, `image`, `createdAt`, `updatedAt`

---

## 错误 3: Better-Auth 注册错误 - account.id 无默认值

### 错误描述

用户注册时出现以下错误：

```
null value in column "id" of relation "account" violates not-null constraint
```

### 错误原因

`account` 表的 `id` 字段没有默认值，而 Better-Auth 期望能够自动生成 ID。

**错误代码**：
```typescript
export const accounts = pgTable("account", {
  id: text("id").primaryKey(), // 没有默认值
  // ...
});
```

### 解决方案

在 Better-Auth 配置中启用自动生成 ID：

```typescript
export const auth = betterAuth({
  // ...
  generateId: true, // 启用自动生成 ID
  // ...
});
```

### 修改文件

- `mianshihou/apps/api/lib/auth.ts`

### 关键要点

- Better-Auth 的 `generateId: true` 选项会自动为所有表生成 ID
- 确保所有 ID 字段都是 `text` 类型
- Better-Auth 使用 UUID 或类似的字符串格式作为 ID

---

## 错误 4: Better-Auth 注册错误 - user.id 类型不匹配

### 错误描述

用户注册时出现以下错误：

```
invalid input syntax for type integer: "ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs"
```

### 错误原因

Better-Auth 生成的 ID 是字符串类型（如 `"ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs"`），但数据库 schema 中 `user.id` 字段被定义为 `serial`（整数）类型。

**错误代码**：
```typescript
export const users = pgTable("user", {
  id: serial("id").primaryKey(), // 错误：serial 是整数类型
  // ...
});
```

### 解决方案

将 `user.id` 字段从 `serial` 改为 `text` 类型：

```typescript
export const users = pgTable("user", {
  id: text("id").primaryKey(), // 改为 text 类型
  // ...
});
```

同时，需要更新所有使用 `user.id` 作为外键的字段：

```typescript
export const posts = pgTable("post", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }), // 改为 text 类型
  // ...
});
```

### 修改文件

- `mianshihou/apps/api/db/schema.ts`

### 关键要点

- Better-Auth 使用字符串类型的 ID，不是整数
- 所有引用 `user.id` 的外键也必须是 `text` 类型
- 使用 `serial` 会创建自增整数，与 Better-Auth 的字符串 ID 不兼容

---

## 错误 5: 外键类型不匹配

### 错误描述

在修改 `user.id` 为 `text` 类型后，所有外键引用都出现了类型不匹配的错误。

### 错误原因

外键字段仍然使用 `integer` 或 `bigint` 类型，而 `user.id` 已经改为 `text` 类型。

**错误代码**：
```typescript
export const posts = pgTable("post", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id), // 错误：integer 类型
  // ...
});
```

### 解决方案

将所有外键字段改为 `text` 类型：

```typescript
export const posts = pgTable("post", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id), // 改为 text 类型
  // ...
});

export const postThumbs = pgTable("post_thumb", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => posts.id),
  userId: text("user_id").references(() => users.id), // 改为 text 类型
  // ...
});

export const postFavours = pgTable("post_favour", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => posts.id),
  userId: text("user_id").references(() => users.id), // 改为 text 类型
  // ...
});

export const questions = pgTable("question", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id), // 改为 text 类型
  // ...
});

export const questionBanks = pgTable("question_bank", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id), // 改为 text 类型
  // ...
});
```

### 修改文件

- `mianshihou/apps/api/db/schema.ts`

### 关键要点

- 外键类型必须与被引用的字段类型一致
- 修改主键类型后，必须同步更新所有外键类型
- 使用 Drizzle ORM 的类型系统可以避免这类错误

---

## 错误 6: tRPC 路由中的类型不匹配 - userId

### 错误描述

在修改数据库 schema 后，tRPC 路由中的类型验证仍然使用 `z.number()`，导致类型不匹配。

### 错误原因

tRPC 路由的输入验证使用 `z.number()` 来验证 `userId`，但 `userId` 现在是字符串类型。

**错误代码**：
```typescript
export const postRouter = router({
  posts: router({
    create: publicProcedure
      .input(
        z.object({
          title: z.string().min(1, { message: "标题不能为空" }),
          content: z.string().min(1, { message: "内容不能为空" }),
          tags: z.string().optional(),
          userId: z.number(), // 错误：应该是 z.string()
        }),
      )
      .mutation(async ({ ctx, input }) => {
        // ...
        const [newPost] = await db
          .insert(posts)
          .values({
            title: input.title,
            content: input.content,
            tags: input.tags,
            userId: BigInt(input.userId), // 错误：不需要 BigInt 转换
            // ...
          })
          .returning();
        // ...
      }),
  }),
});
```

### 解决方案

将所有 `userId` 的类型验证从 `z.number()` 改为 `z.string()`，并移除 `BigInt()` 转换：

```typescript
export const postRouter = router({
  posts: router({
    create: publicProcedure
      .input(
        z.object({
          title: z.string().min(1, { message: "标题不能为空" }),
          content: z.string().min(1, { message: "内容不能为空" }),
          tags: z.string().optional(),
          userId: z.string(), // 改为 z.string()
        }),
      )
      .mutation(async ({ ctx, input }) => {
        // ...
        const [newPost] = await db
          .insert(posts)
          .values({
            title: input.title,
            content: input.content,
            tags: input.tags,
            userId: input.userId, // 直接使用，不需要转换
            // ...
          })
          .returning();
        // ...
      }),
  }),
});
```

### 修改文件

- `mianshihou/apps/api/trpc/router/post.ts`
- `mianshihou/apps/api/trpc/router/postFavour.ts`
- `mianshihou/apps/api/trpc/router/postThumb.ts`
- `mianshihou/apps/api/trpc/router/question.ts`
- `mianshihou/apps/api/trpc/router/questionBank.ts`

### 关键要点

- 修改数据库 schema 类型后，必须同步更新 tRPC 路由的类型验证
- 使用 TypeScript 的类型系统可以帮助捕获这类错误
- 字符串类型的 ID 不需要 `BigInt()` 转换

---

## 错误 7: TypeScript 类型定义文件缺失

### 错误描述

运行 TypeScript 类型检查时出现以下错误：

```
error TS2688: Cannot find type definition file for 'bcryptjs'.
```

### 错误原因

`bcryptjs` 包的类型定义文件 `@types/bcryptjs` 没有安装。

### 解决方案

安装 `@types/bcryptjs`：

```bash
bun add -d @types/bcryptjs
```

### 修改文件

- `mianshihou/apps/api/package.json`

### 关键要点

- 使用 TypeScript 时，需要为没有内置类型的包安装 `@types/*` 包
- 使用 `bun add -d` 安装开发依赖
- 确保 `tsconfig.json` 中的 `skipLibCheck` 设置正确

---

## 错误 8: Cookie 未正确设置

### 错误描述

用户登录后，session cookie 没有正确设置，导致无法维持登录状态。

### 错误原因

1. **Better-Auth 配置错误**：使用了 `cookieSecure` 而不是 `useSecureCookies`
2. **tRPC 路由调用方式不当**：通过 tRPC 调用 `auth.api.signUpEmail` 和 `auth.api.signInEmail` 时，cookies 没有被正确处理
3. **Better-Auth 的 API 方法设计**：`auth.api.*` 方法设计用于服务端调用，不会自动返回或设置 cookies

**错误代码**：
```typescript
// 错误的配置
advanced: {
  cookieSecure: process.env.NODE_ENV === "production", // 错误：应该是 useSecureCookies
}

// 错误的使用方式
export const authRouter = router({
  signIn: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const result = await auth.api.signInEmail({
        body: { email: input.email, password: input.password },
      });

      // 错误：result.session.cookies 可能为空或不存在
      if (result?.session && ctx.res) {
        Object.entries(result.session.cookies || {}).forEach(([name, value]) => {
          ctx.res.setCookie(name, value, { /* ... */ });
        });
      }
    }),
});
```

### 解决方案

**方案 1：修改 Better-Auth 配置**

将 `cookieSecure` 改为 `useSecureCookies`：

```typescript
export const auth = betterAuth({
  advanced: {
    cookiePrefix: "mianshihou",
    useSecureCookies: process.env.NODE_ENV === "production", // 改为 useSecureCookies
    defaultCookieAttributes: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    },
    // ...
  },
});
```

**方案 2：使用 Better-Auth Handler**

Better-Auth 提供了两种使用方式：

1. **Handler 方式（推荐）**：通过 `/api/auth/*` 路径直接调用，handler 会自动处理 cookies
2. **API 方式**：通过 `auth.api.*` 方法调用，但需要手动处理 cookies

**Handler 方式示例**：
```typescript
// 直接调用 Better-Auth 的 handler
POST /api/auth/sign-in/email
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```

**响应**：
```
HTTP/1.1 200 OK
set-cookie: mianshihou.session_token=...; Max-Age=2592000; Path=/; HttpOnly; SameSite=Lax
set-cookie: mianshihou.session_data=...; Max-Age=300; Path=/; HttpOnly; SameSite=Lax

{"token":"...","user":{...}}
```

**方案 3：修改 tRPC 路由，传递 headers**

如果必须通过 tRPC 调用，需要传递请求 headers：

```typescript
export const authRouter = router({
  signIn: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // 使用 headersFromRequest 获取请求 headers
      const headers = headersFromRequest(ctx.req);
      const result = await auth.api.signInEmail({
        body: { email: input.email, password: input.password },
        headers, // 传递 headers
      });

      return {
        user: result.user,
        message: "登录成功",
      };
    }),
});
```

### 测试结果

**直接调用 Better-Auth Handler**：
```bash
# 注册
curl -X POST http://localhost:3001/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456","name":"测试用户"}'

# 登录
curl -X POST http://localhost:3001/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456"}' \
  -c /tmp/auth-cookies.txt

# 获取会话
curl -X GET http://localhost:3001/api/auth/get-session \
  -b /tmp/auth-cookies.txt

# 登出
curl -X POST http://localhost:3001/api/auth/sign-out \
  -H "Origin: http://localhost:3001" \
  -b /tmp/auth-cookies.txt
```

**结果**：
- ✅ 注册成功，cookies 正确设置
- ✅ 登录成功，cookies 正确设置
- ✅ 获取会话成功，返回完整用户信息
- ✅ 登出成功，cookies 被清除（Max-Age=0）

### 修改文件

- `mianshihou/apps/api/lib/auth.ts`
- `mianshihou/apps/api/trpc/router/auth.ts`

### 关键要点

- Better-Auth 使用 `useSecureCookies` 而不是 `cookieSecure`
- Better-Auth Handler 会自动处理 cookies，推荐直接使用
- 如果通过 tRPC 调用，需要传递请求 headers
- Cookie 前缀默认为 `better-auth`，可以自定义
- 登出操作需要 Origin 头进行 CSRF 保护
- Cookie 缓存默认 5 分钟，可以配置 `session.cookieCache.maxAge`

---

## 错误 9: Better-Auth Hooks 配置错误

### 错误描述

在 Better-Auth 配置中使用了不正确的 hooks 配置，导致认证流程异常。

### 错误原因

Better-Auth v1.4+ 的 hooks API 发生了变化，旧的 hooks 配置方式不再适用。

**错误代码**：
```typescript
export const auth = betterAuth({
  // ...
  hooks: {
    before: [
      {
        matcher(context) {
          return context.path === "/sign-in/email";
        },
        handler: async (ctx) => {
          // 自定义逻辑
        },
      },
    ],
  },
  // ...
});
```

### 解决方案

简化 Better-Auth 配置，移除不必要的 hooks：

```typescript
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3001',
  basePath: '/api/auth',
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user: users, session: sessions, account: accounts, verification: verifications },
  }),
  emailAndPassword: { enabled: true, minPasswordLength: 6 },
  generateId: true,
  // 移除 hooks 配置
});
```

### 修改文件

- `mianshihou/apps/api/lib/auth.ts`

### 关键要点

- Better-Auth 的 API 在不同版本之间可能发生变化
- 使用官方文档作为参考，避免使用过时的 API
- 简化配置，只使用必要的选项

---

## 错误 10: Me 接口返回空对象

### 错误描述

`me` 接口在用户未登录时返回空对象 `{}`，而不是 null 或错误信息。

### 错误原因

`me` 接口依赖 `ctx.user`，而 `ctx.user` 来自 tRPC 的 context。如果 cookies 没有正确设置或用户未登录，`ctx.user` 就是 `null`。

**错误代码**：
```typescript
export const authRouter = router({
  me: publicProcedure.query(async ({ ctx }) => {
    log.debug('获取用户资料', { userId: ctx.user?.id });

    return {
      id: ctx.user?.id,
      email: ctx.user?.email,
      userName: ctx.user?.userName,
      userAvatar: ctx.user?.userAvatar,
      userRole: ctx.user?.userRole,
      status: ctx.user?.status,
    };
  }),
});
```

### 解决方案

**方案 1：保持当前行为（推荐）**

当前行为是合理的：
- 如果用户已登录，返回用户信息
- 如果用户未登录，返回空对象

**方案 2：返回 null 或抛出错误**

如果需要明确区分登录和未登录状态：

```typescript
export const authRouter = router({
  me: publicProcedure.query(async ({ ctx }) => {
    log.debug('获取用户资料', { userId: ctx.user?.id });

    if (!ctx.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "未登录",
      });
    }

    return {
      id: ctx.user.id,
      email: ctx.user.email,
      userName: ctx.user.userName,
      userAvatar: ctx.user.userAvatar,
      userRole: ctx.user.userRole,
      status: ctx.user.status,
    };
  }),
});
```

### 测试结果

**未登录状态**：
```bash
curl -X GET http://localhost:3001/trpc/auth.me
```

**响应**：
```json
{
  "result": {
    "data": {}
  }
}
```

**已登录状态**：
```bash
curl -X GET http://localhost:3001/trpc/auth.me \
  -b /tmp/auth-cookies.txt
```

**响应**：
```json
{
  "result": {
    "data": {
      "id": "ozNAnk0mTsIom9mY3IBMRws3bZKEqBhs",
      "email": "test@example.com",
      "userName": "测试用户",
      "userAvatar": null,
      "userRole": "user",
      "status": "active"
    }
  }
}
```

### 关键要点

- `me` 接口依赖 tRPC context 中的 `user` 信息
- `user` 信息来自 Better-Auth 的 session 验证
- 如果 cookies 正确设置，`me` 接口会返回完整的用户信息
- 可以根据业务需求选择返回空对象、null 或抛出错误

---

## 错误 11: tRPC Context 类型定义错误

### 错误描述

在修改 `user.id` 类型后，tRPC Context 中的类型定义也需要更新。

### 错误原因

Context 类型定义中 `user.id` 仍然是 `number` 类型。

**错误代码**：
```typescript
export type Context = {
  user: {
    id: number; // 错误：应该是 string
    email: string;
    userName: string;
    userAvatar: string;
    userRole: string;
    status: string;
  } | null;
  session: any;
  req: FastifyRequest;
  res: FastifyReply;
  logger: Logger;
};
```

### 解决方案

更新 Context 类型定义：

```typescript
export type Context = {
  user: {
    id: string; // 改为 string
    email: string;
    userName: string;
    userAvatar: string;
    userRole: string;
    status: string;
  } | null;
  session: any;
  req: FastifyRequest;
  res: FastifyReply;
  logger: Logger;
};
```

### 修改文件

- `mianshihou/apps/api/trpc/index.ts`

### 关键要点

- TypeScript 类型定义必须与实际的数据库 schema 一致
- 修改数据库类型后，必须同步更新所有相关的类型定义
- 使用 TypeScript 的类型推断可以减少手动维护类型的工作量

---

## 总结

### 主要问题类别

1. **类型系统问题**：Better-Auth 使用字符串 ID，与原有的整数 ID 不兼容
2. **中间件配置问题**：tRPC 中间件需要使用工厂模式
3. **数据库 Schema 问题**：自定义字段需要设置为可空
4. **类型定义问题**：TypeScript 类型定义需要与数据库 schema 保持一致
5. **依赖问题**：缺少必要的类型定义文件
6. **Cookie 配置问题**：Better-Auth 的 cookie 配置和使用方式
7. **认证流程问题**：Better-Auth Handler 和 API 方式的区别

### 最佳实践

1. **使用字符串 ID**：Better-Auth 推荐使用字符串类型的 ID
2. **自定义字段设为可空**：Better-Auth 不会自动填充自定义字段
3. **启用自动生成 ID**：在 Better-Auth 配置中设置 `generateId: true`
4. **保持类型一致性**：数据库 schema、TypeScript 类型定义、tRPC 验证必须保持一致
5. **使用官方文档**：参考 Better-Auth 和 tRPC 的官方文档，避免使用过时的 API
6. **直接使用 Better-Auth Handler**：推荐直接调用 `/api/auth/*` 路径，handler 会自动处理 cookies
7. **正确配置 Cookie**：使用 `useSecureCookies` 而不是 `cookieSecure`
8. **传递 Request Headers**：如果通过 tRPC 调用 Better-Auth API，需要传递请求 headers

### 经验教训

1. **先理解框架的约定**：在使用 Better-Auth 之前，先了解其数据模型和约定
2. **逐步集成**：不要一次性集成所有功能，逐步测试每个功能
3. **类型安全优先**：使用 TypeScript 的类型系统来避免运行时错误
4. **详细记录**：记录每个错误的解决方案，方便后续参考
5. **测试 Cookie 流程**：确保登录、获取会话、登出等流程中 cookies 正确设置和清除
6. **使用 Handler 方式**：Better-Auth Handler 方式比 API 方式更简单可靠

### 后续改进

1. **添加单元测试**：为每个接口添加单元测试，确保功能正常
2. **添加集成测试**：测试完整的认证流程
3. **完善错误处理**：提供更友好的错误信息
4. **添加日志**：记录关键操作，方便调试
5. **文档更新**：及时更新接口文档和开发文档
6. **Cookie 配置优化**：根据生产环境需求优化 cookie 配置
7. **CSRF 保护**：确保所有需要认证的接口都有 CSRF 保护