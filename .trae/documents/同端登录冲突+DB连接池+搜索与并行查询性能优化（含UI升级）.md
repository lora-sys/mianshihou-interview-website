## 1）前端配合同端登录（登录冲突与设备管理）

- **现状**
  - 后端已实现并发/多设备登录限制：默认最多 3 台、策略 `kick_oldest`，并提供设备管理接口：`auth.myDevices / auth.revokeDevice / auth.revokeAllDevices`。

  - 登录失败时只返回 `FORBIDDEN + message`，前端登录页仅 toast 文案（无法引导用户“去踢设备/一键踢其他设备再登录”）。

  - 设备指纹目前基于 `ip + user-agent`（误判风险大），且踢下线逻辑目前仅删 Redis key，可能无法真正让被踢端下线（Better-Auth session 主存储在 Postgres）。

- **要做的改造（后端）**
  - 把“设备上限”错误做成结构化业务信息（仍是 FORBIDDEN，但 `data` 附带 `reason=DEVICE_LIMIT_REACHED,maxDevices,currentDevices,strategy`）。

  - 让“踢设备/踢最旧设备”真正生效：按 token 删除 `session` 表记录（或走 Better-Auth revoke/删除会话能力），并处理 cookieCache 5 分钟延迟。

  - 设备指纹升级为“客户端持久 deviceId”：前端生成并写入 cookie（或 localStorage），登录时通过 header 透传（如 `x-device-id`）；服务端改用它做 fingerprint，UA 只做展示。

- **要做的改造（前端 UI/UX，使用 frontend-design + ui-design）**
  - 登录页：遇到 DEVICE_LIMIT_REACHED 时，不只 toast：弹出“登录冲突”对话框（数据源：`auth.myDevices`），提供：
    - 每台设备一键“踢下线”（调用 `auth.revokeDevice`）

    - 一键“踢出其他设备并继续登录”（调用 `auth.revokeAllDevices` + 自动重试登录）

  - 用户中心 /me：把“登录设备”从纯表格升级为“设备卡片/表格混合视图”并补齐操作（踢下线/踢其他设备），信息层级更清晰。

  - 视觉方向：做一个“控制台风格”的设备管理区（密度更高、操作更明确），保留现有 shadcn 组件体系，强化状态与风险提示（例如红色危险区）。

## 2）后端数据库连接池（数据池）与查询优化

- **现状**：运行时用 `pg Pool`，但未显式配置池参数；关停未 `pool.end()`；登录态每请求会额外查一次 user。

- **要做的改造**
  - 显式配置 Pool：`max/idleTimeoutMillis/connectionTimeoutMillis`，并支持通过 env 配置。

  - 在那个docker-compose.yaml file 文件配置好，

  - graceful shutdown 时关闭 pool。

  - 在关键查询上加超时/慢查询监控（例如 statement_timeout 或日志采样），为后续优化提供证据。

## 3）继续优化各页面搜索（体验与一致性）

- **现状**：大多页面用 `like('%q%')` 做标题模糊；新增了 /search 但页面间体验不统一。

- **要做的改造（体验层）**
  - 统一搜索交互：
    - `/search` 作为全局入口（系统/我的分区 + tabs + 结果卡片）

    - 列表页搜索框统一占位、热键（/ 聚焦）、保留 q 与分页、空态一致

  - 增强匹配：至少 title + tags；可选 description/content（逐步开启）。

  - 后端为搜索准备索引路线：
    - Phase 1：继续 like（已做）

    - Phase 2：pg_trgm/全文（提升质量与性能）

    - Phase 3：pgvector 混合检索（等 embedding pipeline 落地）

## 4）优化前端并行查询与性能（减少 RTT 与重复请求）

- **现状**：多数页面已用 Promise.all；getCurrentUser 有 cache；但多接口仍是多次 HTTP。

- **要做的改造**
  - 在 server 侧实现“多 procedure 的 batch 请求”（一个 HTTP 拿回多份数据），用于首页、/me 等多数据块页面，减少 RTT。

  - 字段裁剪：列表接口避免返回大字段（content/answer 全文），用 excerpt/hasAnswer 替代。

  - 结构性避免重复会话读取：在需要用户的页面把 user 传给 TopNav（或在布局层统一取一次并下发）。

## 实施顺序（我会按这个落地）

1. 同端登录冲突：后端结构化错误 + 前端登录页对话框 + /me 设备管理操作补齐
2. 数据库连接池参数化 + graceful shutdown + 基础慢查询可观测
3. 搜索体验统一与细节打磨（/search + 各列表页一致性）
4. 前端并行/批处理与字段裁剪（性能专项）
5. 优化better-auth 性能，优化缓存

   “import { betterAuth } from "better-auth";

   export const auth = betterAuth({
   session: {
   cookieCache: {
   enabled: true,
   maxAge: 5 \* 60, // Cache duration in seconds
   },
   },
   });

   ”

   export async function getUsers() {
   'use cache'
   const { users } = await auth.api.listUsers();
   return users
   } in nextjs

   const session = await auth.api.getSession({
   headers: await headers(),
   });
   //then pass the session to the client

   optimizing database performance is essential to get the best out of Better Auth.

   <https://www.better-auth.com/docs/guides/optimizing-for-performance#bundle-size-optimization>

确认后我会开始逐项实现，并在每项完成后跑 lint/typecheck、并做真实浏览器端验证（登录冲突、踢设备、搜索命中、页面加载耗时对比）。
