# E2E 测试

## 依赖与脚本

- Root scripts：
  - `bun e2e`：运行 Playwright
  - `bun e2e:ui`：UI 模式

## 环境变量

- `E2E_BASE_URL`：默认 `http://localhost:3000`
- `E2E_EMAIL` / `E2E_PASSWORD`：登录用账号（未设置会自动 skip）
- `E2E_SKIP_WEB_SERVER=1`：不启动 webServer（如果你已手动启动）

## 用例

- `apps/web/e2e/smoke.spec.ts`
  - login → search → me
