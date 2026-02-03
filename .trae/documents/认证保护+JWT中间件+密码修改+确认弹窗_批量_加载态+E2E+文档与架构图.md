## 现状结论（先对齐）

- 前端当前是 Cookie Session 机制（middleware 只检查 `mianshihou.session_token` 是否存在），并非 JWT；未发现 Authorization Bearer/JWT 的使用。

- 登出已实现：Web 的 `/logout` route 代理调用 API `auth.signOut` 并转发 `set-cookie` 清理会话。

- 用户信息展示主要来自 `getCurrentUser()`（底层调用 `auth.getSession`），TopNav 根据 `userRole` 显示后台入口。

- 密码找回/重置/修改：Web 登录页有 `/forgot-password` 链接但页面缺失；API 侧未封装相应 tRPC。

- 批量操作：Admin 侧已有批量删除，但缺少“全选/选中计数/禁用态/失败反馈”；确认对话框不统一（admin 无确认、用户侧多处用 `window.confirm`）。

- Loading：有 `PageSpinner`，但 skeleton/按钮级 loading/页面级 `loading.tsx` 未系统化。

- E2E：仓库未落地 Playwright/Cypress。

## 1）前端认证保护中间件与路由保护（精修）

- 把“受保护页面的最终判定”统一为 **Server Component Guard**，避新增 `requireUser(`免仅靠 cookie 存在导致的闪烁：`)` / `requireAdmin()`（基于 `getCurrentUser()`），在 `/dashboard`、`/questions`、`/question-banks`、`/me`、`/admin` 的 layout 层统一调用。
  - 将现有 dashboard-shell 的客户端 `getSession` 重定向逻辑替换为 server guard（减少二次跳转）。

- 保留 middleware 作为“快速挡板”，但精修：
  - 受保护前缀维护成单一常量。

  - 对 `/login`/`/register` 的 redirect 逻辑保持一致，避免循环跳转。

## 2）JWT 验证中间件（在不破坏 Cookie Session 的前提下追加能力）

- 目标：既支持浏览器 Cookie 会话，也支持 `Authorization: Bearer <token>`（为移动端/脚本/外部服务调用准备）。

- 后端实现方案（优先 Better-Auth 官方能力）：
  - 启用 Better-Auth 的 `bearer`/`jwt` 插件（以仓库版本为准），让 `auth.api.getSession` 能从 Authorization 头解析。

  - 改造 tRPC `createContextAsync`：除 cookie 外，把 `authorization` 也纳入 headers；若 cookie 无会话但 bearer 有效，则填充 `ctx.user`。

  - 新增一个 tRPC `auth.issueToken`（仅登录态）用于生成/轮换 bearer token（或复用 Better-Auth 的 token 能力），并在文档说明安全策略与过期策略。

## 3）登出功能与用户信息显示（统一语义与体验）

- 登出：保留现有 `/logout` 代理实现，补齐：
  - UI 上增加“确认登出”对话框（可选），并在登出后清理本地 UI 状态。

- 用户信息显示：
  - TopNav 菜单完善：显示角色/状态徽标、个人资料入口、账号安全入口（修改密码）。

  - 统一 `getCurrentUser()` 的唯一来源（建议继续使用 `auth.getSession`；同时让 `auth.me` 与 `getSession` 输出一致或合并）。

## 4）密码修改/忘记密码/重置密码

- API：在 `auth` router 新增 3 个 procedure（与现有 signIn/signUp 风格一致）：
  - `auth.forgotPassword(email)`：生成重置 token 并触发邮件发送（dev 环境可先返回/打印 reset 链接）。

  - `auth.resetPassword(token,newPassword)`：验证 token 并更新密码。

  - `auth.changePassword(currentPassword,newPassword)`：登录态修改密码。

- Web：补齐 3 个页面：
  - `/forgot-password`、`/reset-password`、`/me/security`。

  - 全部使用一致的 Form/校验/按钮 loading/错误提示模式。

## 5）搜索功能（第 8 点：体验+一致性+可扩展）

- Web `/search` 精修：
  - Tabs（题目/题库/收藏/我的）+ 高亮匹配 + 结果为空的统一空态。

  - 支持 tags 点击快速过滤，保留 query string。

- API：进一步统一输入字段命名（`q`/`title`/`keyword`）并对热门查询加索引计划（先 pg_trgm，后全文）。

## 6）批量操作（第 9 点）

- 抽离可复用批量选择：`useBatchSelection()` + `BulkActionsBar`（支持全选/反选/选中计数/禁用态）。

- 批量删除 route 增加失败反馈（toast + 可回滚 UI）。

## 7）加载状态（第 10 点）

- 建立统一组件：`Skeleton`、`InlineSpinner`、`ButtonPending`。

- 为关键页面增加 `loading.tsx`（App Router 原生 loading），避免白屏。

## 8）确认对话框（第 11 点）

- 因 `@repo/ui` 目前未提供 Dialog/AlertDialog：在 `apps/web/app/components/` 新增无依赖的 `ConfirmDialog`（Portal + focus trap 基础版，含危险操作样式、输入二次确认可选）。

- 全站替换 `window.confirm` 与 admin 表单直删：
  - 用户侧题目/题库删除、移除题目

  - admin 单删/批量删

## 9）端到端验证（E2E）

- 引入 Playwright（workspace 级）：
  - 增加脚本：`bun e2e`、`bun e2e:ui`。

  - 冒烟用例：登录→搜索→收藏→我已完成→/me 校验；admin 批量删除（带确认）。

## 10）抽离可复用组件与扩展性

- 目录规范：`apps/web/app/components/` 下按领域拆：`auth/`、`dialog/`、`table/`、`states/`。

- 统一表单模式：react-hook-form + zod + @repo/ui Form 组件。

## 11）输出开发记录到 apps/web/docs（含新架构图、坑点、计划）

- 新增 `apps/web/docs/`：
  - `README.md`（目录索引）

  - `architecture.md` + `architecture.excalidraw.md`（Excalidraw 架构图：Web↔API↔DB/Redis↔Better-Auth↔tRPC）

  - `auth.md`（Cookie Session 与 Bearer/JWT 双通道、middleware/guard 规则、登出/设备管理）

  - `e2e.md`（Playwright 运行方式、用例说明）

  - `pitfalls.md`（踩坑：cookie 存在但失效、tRPC batch、BigInt 序列化、deviceId、CORS headers）

  - `next-plan.md`（下一步：pg_trgm/全文索引、权限模型细化、审计日志等）

确认后我会按以上顺序逐项落地：实现→lint/typecheck→最少 E2E 冒烟→补齐 docs 与架构图。
