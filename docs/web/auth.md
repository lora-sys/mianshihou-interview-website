# 认证与会话

## 前端路由保护

- middleware：对 `/dashboard`、`/questions`、`/question-banks`、`/me`、`/admin` 做“cookie 是否存在”的快速挡板。
- server guard：对关键 layout/page 使用 `requireUser/requireAdmin` 做最终判定（避免 cookie 存在但会话失效导致闪烁）。

相关实现：

- [middleware.ts](file:///Users/loralora/repos/mianshihou/apps/web/middleware.ts)
- [guards.ts](file:///Users/loralora/repos/mianshihou/apps/web/app/lib/auth/guards.ts)
- [DashboardLayout](<file:///Users/loralora/repos/mianshihou/apps/web/app/(dashboard)/layout.tsx>)
- [AdminLayout](<file:///Users/loralora/repos/mianshihou/apps/web/app/(admin)/admin/layout.tsx>)

## Cookie 会话（默认）

- Web tRPC：`credentials: include`，依赖浏览器 Cookie
- API：tRPC context 通过 Better-Auth `getSession` 解析 cookie

## 设备识别（并发登录）

- Web：自动生成 `mianshihou.device_id` cookie，并通过 `x-device-id` header 传给 API
- API：并发登录指纹优先使用 `deviceId`，避免 `ip+ua` 误判
- 设备踢下线：会删除 Postgres session token，确保被踢端真正下线

## Bearer（JWT）鉴权

- 目的：脚本/移动端/外部服务不方便携带 cookie 时使用
- 方式：`Authorization: Bearer <token>`
- 发放：`auth.getJwt`（需要已登录 cookie 会话）返回短期 JWT

相关实现：

- API JWT：[jwt.ts](file:///Users/loralora/repos/mianshihou/apps/api/lib/jwt.ts)
- tRPC context：[index.ts](file:///Users/loralora/repos/mianshihou/apps/api/trpc/index.ts)
- 发放接口：[auth.ts](file:///Users/loralora/repos/mianshihou/apps/api/trpc/router/auth.ts)

## 登出

- Web：`GET /logout` route 代理调用 `auth.signOut` 并把 `set-cookie` 回写到浏览器

相关实现：

- [logout route.ts](file:///Users/loralora/repos/mianshihou/apps/web/app/logout/route.ts)
