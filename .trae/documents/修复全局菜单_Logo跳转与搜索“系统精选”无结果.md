## 目标与现状

- 目标：导航菜单在用户创建题目/题库等页面也可用；点击 Logo 永远回到主页；修复搜索页输入“系统精选”无结果的体验/逻辑问题。
- 现状：根布局不注入导航，导致不同路由分组各自决定是否显示菜单；Dashboard/Questions 仅有桌面侧边栏，移动端直接没有菜单；DashboardShell 的 Logo 不是链接；搜索后端只搜 title/tags（题目）与 title/description（题库），且“系统精选”这种组合词在 tags 的 JSON 中常不连续出现。

## 导航（全局菜单 + UX）

1. 在 Dashboard/Questions 分组补齐顶部导航
   - 修改 [DashboardLayout](<file:///Users/loralora/repos/mianshihou/apps/web/app/(dashboard)/layout.tsx>)：在 `DashboardShell` 之前渲染 `TopNav`，让“用户创建题目/题库”等页面也拥有同一套顶部菜单。
   - 给 `TopNav` 增加移动端可用的菜单入口（见下一条），避免只显示 Logo/退出导致“看不到菜单”。
2. 给 TopNav 增加移动端菜单（汉堡按钮 + 弹层）
   - 新增一个 `use client` 组件（例如 `app/components/mobile-nav.tsx`）：用 Portal 渲染遮罩+菜单面板，列出“精选题库/精选题目/搜索/我的/我的题目/我的题库/后台（若 admin）”。
   - 在 [top-nav.tsx](file:///Users/loralora/repos/mianshihou/apps/web/app/components/top-nav.tsx) 内嵌该客户端组件，并把 `user`（是否登录、是否 admin）以 props 传下去。

## Logo 点击回主页

- 修改 [dashboard-shell.tsx](<file:///Users/loralora/repos/mianshihou/apps/web/app/(dashboard)/dashboard-shell.tsx>)：将左侧 Logo 区块包一层 `Link href="/"`，保证点击回主页（与 TopNav 行为一致）。

## 搜索“系统精选”无结果（测试 + 修复）

1. 修复“搜索内容字段未参与匹配”的真实问题
   - 修改 API [search.ts](file:///Users/loralora/repos/mianshihou/apps/api/trpc/router/search.ts)：对系统题目与我的题目查询把 `questions.content` 加入 OR 条件（与前端展示/高亮一致）。
2. 处理“系统精选”这种组合词/标签不连续的问题
   - 在同一处增加一个轻量的关键词展开策略：当 query 包含“系统精选”时，额外用 `系统`、`精选` 参与匹配（title/tags/content/description）。
   - 可选增强：把 query 按空白/标点切词后也加入匹配（对英文/多关键词更友好）。
3. 本地验证
   - 使用现有 dev server 访问 `/search?q=系统精选`、`/search?q=系统`、`/search?q=精选`，确认系统内容可返回；再用一个只存在于题目 content 的词验证 content 搜索生效。

## 回归与验收

- 回归关键页面：`/questions/new`、`/question-banks/new`、`/questions/[id]`、`/search`、`/explore/*`。
- 运行 `apps/web lint + check-types` 与 `apps/api lint`，确保无类型与规范问题。

如果你确认这个方案，我会按上述步骤直接修改代码并在本地跑通验证。
