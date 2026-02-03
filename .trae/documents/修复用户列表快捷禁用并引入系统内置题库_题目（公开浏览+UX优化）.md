## 目标与现状

- **目标**：
  - 管理员用户列表支持“禁用/解禁”的快捷操作（无需进入详情页）。

  - 产品形态调整：系统内置题库/题目优先于用户自建；未登录首页也能浏览系统内置内容；登录后在同一信息架构下同时展示“系统内置”和“我的内容”。

  - UX：全局菜单栏适配未登录/已登录，用户个人中心作为“我的”入口。

- **现状**：
  - Web 侧 `/questions`、`/question-banks` 被 middleware 保护，未登录无法访问；首页未登录只显示登录提示。

  - API 侧 list/CRUD 默认都是登录态 + owner（或 admin）控制；没有“只暴露系统内置内容”的公开接口。

## Bug 修复（优先）

- **问题**：SSR 页面一旦 tRPC 请求失败（例如 API 未启动、短暂不可用）会直接触发 Runtime error（fetch failed）。

- **方案**：
  - 在 Web 的 `trpcQuery` 封装中加入“可控失败”能力：
    - 对“首页/探索页”等公共展示页面使用 `safeTrpcQuery`（fetch 失败时返回 `null`），页面展示“服务暂不可用”的友好 Card，而不是整个页面崩溃。

    - 对“必须强一致”的后台/写操作仍维持抛错（避免静默失败）。

## 管理员：用户列表快捷禁用/解禁

- 在 [/admin/users](<file:///Users/loralora/repos/mianshihou/apps/web/app/(admin)/admin/users/page.tsx>) 每行新增：
  - `禁用` / `解禁` 按钮（根据当前 status 渲染）。

  - 采用原生 form POST，复用现有 `/admin/users/[id]/set-status` route；成功后重定向回当前列表（保留 q 搜索）。

  - 可选：加轻量确认，加入弹窗，确认，shadcn ui组件（例如禁用前 confirm），保证操作可感知。

## “系统内置内容”定义与 API 公开浏览接口

- **定义（不改表结构，兼容现有 DB）**：系统内置题库/题目 = **创建者 userRole = 'admin' 的内容**（且 isDelete=false）。
  - 这是最稳妥的“定死”方式：不需要新增字段/迁移（当前 drizzle migration 文件与实际 schema 存在历史不一致风险）。

- **新增 API：public/explore 只读接口**（publicProcedure）：
  - `explore.questionBanks.list`：分页/搜索标题，返回系统题库。

  - `explore.questions.list`：分页/搜索标题/可选题库过滤，返回系统题目。

  - `explore.questionBanks.getById` + `explore.questionBanks.getQuestions`：公开题库详情与题库下题目。

  - `explore.questions.getById`：公开题目详情。

- **安全边界**：
  - 所有 explore 接口只返回 system 内容（admin-owned），绝不返回普通用户内容。

## Web 信息架构与 UX 调整

- **新增公共浏览区（不要求登录）**：
  - `/explore/question-banks`（系统题库列表，SSR Table/卡片）

  - `/explore/question-banks/[id]`（系统题库详情 + 题目列表）

  - `/explore/questions`（系统题目列表）

  - `/explore/questions/[id]`（系统题目详情）

  - middleware 不保护 `/explore/**`。

- **保留用户自建管理区（要求登录）**：
  - `/question-banks`、`/questions` 继续作为“我的题库/我的题目”（可创建、编辑、删除）。

- **首页改造（核心）**：
  - 未登录：首页直接展示“系统内置题库/题目”（优先级最高），同时提供登录/注册 CTA。

  - 已登录：首页先展示“系统内置精选”，再展示“我的最近题库/题目”（次优先级），并提供“新建题库/新建题目”按钮。

- **全局菜单栏**：
  - 未登录：显示“探索（题库/题目）/ 登录 / 注册”。

  - 已登录：显示“探索 / 我的（仪表盘、我的题库、我的题目、个人中心）/ 退出”，admin 额外显示“后台”。

## 端到端验证（实现后必做）

- 启动：`bun dev`（turbo 同时拉起 apps/api + apps/web）。

- 验证用例：
  - 未登录访问 `/`：能看到系统题库/题目；菜单栏显示探索入口；点击题库/题目可进入详情。

  - 未登录访问 `/questions`：仍应重定向 `/login`（我的区保护正确）。

  - 登录后 `/`：系统区在上、我的区在下；新建按钮可用。

  - `/admin/users`：出现“禁用/解禁”快捷按钮；禁用后目标用户被踢下线（会话清理生效）；解禁后可重新登录。

  - API 探索接口：只返回 admin-owned 内容，不泄露普通用户数据。

## 交付物（你将看到的变化）

- Web：新增 `/explore/**` 页面、首页信息架构调整、TopNav 导航改造、用户列表新增快捷禁用/解禁。

- API：新增 explore 只读 router/procedures；必要时增强查询（join users 以判定 admin-owned）。

- 验证：提供可复现的本地端到端验证路径与检查点。
