# 架构总览

## 运行时组件

- Web（apps/web）
  - Next.js App Router
  - Server Components：通过服务端 tRPC fetch 访问 API
  - Client（tRPC React Query）：`credentials: include` 走 Cookie 会话
  - 设备识别：写入 `mianshihou.device_id` cookie，并通过 `x-device-id` 透传到 API
- API（apps/api）
  - Fastify + tRPC
  - Better-Auth（`/api/auth/*`）
  - 业务路由（questions / questionBank / explore / practice / favours / users）
- 数据
  - Postgres：主数据与 Better-Auth session
  - Redis：并发登录设备列表、用户短 TTL 缓存、其他缓存

## 数据流（核心链路）

- 登录
  - Web：`trpc.auth.signIn` → API：`auth.api.signInEmail` → 生成 session cookie
  - API：并发登录检查（设备指纹）→ 需要时踢旧设备（删除 DB session token）
- 鉴权
  - Cookie：Web 默认通过 Cookie session 访问 tRPC
  - Bearer：API 支持 `Authorization: Bearer <jwt>` 访问 tRPC（用于脚本/移动端）
- 查询
  - Web Server Components：支持 batch query（一次 HTTP 拉多份数据）

## 本轮开发改动摘要

- 认证保护：Dashboard 等受保护区域从“客户端校验”迁移到“服务端 guard”，减少闪烁
- 并发登录：前端注入稳定 deviceId，后端基于 deviceId 生成指纹并提供设备管理 UI
- JWT/Bearer：新增发放短期 JWT（`auth.getJwt`）并在 tRPC context 支持 bearer 鉴权
- 密码：补齐 forgot/reset/change password 全链路页面与后端封装
- 搜索：搜索结果高亮、标签可点击筛选
- 删除确认：实现可复用确认对话框并替换全站 `window.confirm`
- E2E：引入 Playwright，新增 smoke 用例
