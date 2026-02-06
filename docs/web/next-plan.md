# 下一步计划

## 搜索质量与性能

- Phase 1：现有 like(title/tags/description) 保持体验一致
- Phase 2：引入 `pg_trgm`（title/description/content），提升模糊匹配性能
- Phase 3：全文检索（tsvector + ranking），支持更强的召回与排序

## 权限与审计

- 将 admin 侧关键操作补齐审计日志（删除/批量删除/用户禁用等）
- 对“批量操作”补齐选中计数、全选与不可选项提示

## 认证与会话

- JWT/Bearer：增加 token 刷新与吊销策略（可选）
- 统一 `auth.me` 与 `auth.getSession` 的语义与返回结构，减少重复代码路径

## 体验

- 全站 skeleton/empty/error 状态统一
- /me：设备管理进一步精修（分组、排序、当前设备高亮、可视化会话数）
