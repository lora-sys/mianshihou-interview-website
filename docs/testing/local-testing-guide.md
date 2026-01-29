# 本地测试指南

## 📖 测试策略

我们的项目采用以下测试策略：

### 单元测试（在 CI/CD 中运行）
- **位置**: `tests/unit/`
- **运行时机**: 每次推送代码到 GitHub
- **运行环境**: CI/CD（GitHub Actions）
- **目的**: 快速验证代码逻辑
- **特点**:
  - ✅ 不需要数据库
  - ✅ 运行快速（< 1 分钟）
  - ✅ 自动化运行

### 集成测试（在本地运行）
- **位置**: `tests/integration/`
- **运行时机**: 推送代码前
- **运行环境**: 本地开发环境
- **目的**: 验证完整功能
- **特点**:
  - ❌ 需要数据库
  - ❌ 运行较慢（2-3 分钟）
  - ❌ 需要手动运行

## 🚀 本地运行测试

### 1. 运行所有测试

```bash
cd mianshihou/apps/api
bun test
```

### 2. 只运行单元测试

```bash
cd mianshihou/apps/api
bun test tests/unit
```

### 3. 只运行集成测试

```bash
cd mianshihou/apps/api
bun test tests/integration
```

### 4. 运行特定测试文件

```bash
cd mianshihou/apps/api
bun test tests/unit/exception.test.ts
```

### 5. 监听模式（开发时使用）

```bash
cd mianshihou/apps/api
bun test --watch
```

### 6. 生成覆盖率报告

```bash
cd mianshihou/apps/api
bun test --coverage
```

## 📋 推送代码前的检查清单

在推送代码到 GitHub 之前，请确保：

### 必须检查（本地运行）

- [ ] ✅ 运行单元测试：`bun test tests/unit`
- [ ] ✅ 运行集成测试：`bun test tests/integration`
- [ ] ✅ 运行 TypeScript 检查：`bun run build`
- [ ] ✅ 确保所有测试通过

### 可选检查

- [ ] 📊 生成覆盖率报告：`bun test --coverage`
- [ ] 🔍 检查代码质量：`bun run lint`

## 🎯 工作流程

### 开发新功能

```bash
# 1. 创建功能分支
git checkout -b feature/new-feature

# 2. 开发代码
# ... 编写代码 ...

# 3. 运行单元测试
cd mianshihou/apps/api
bun test tests/unit

# 4. 运行集成测试
bun test tests/integration

# 5. 如果测试通过，提交代码
git add .
git commit -m "feat: 添加新功能"

# 6. 推送到 GitHub
git push origin feature/new-feature

# 7. 创建 Pull Request
# CI/CD 会自动运行单元测试
```

### 修复 Bug

```bash
# 1. 创建修复分支
git checkout -b fix/bug-name

# 2. 修复代码
# ... 修复代码 ...

# 3. 运行相关测试
cd mianshihou/apps/api
bun test tests/unit
bun test tests/integration

# 4. 如果测试通过，提交代码
git add .
git commit -m "fix: 修复 bug"

# 5. 推送到 GitHub
git push origin fix/bug-name

# 6. 创建 Pull Request
```

## 🔧 数据库配置

### 本地开发环境

确保 `.env` 文件配置正确：

```env
DATABASE_URL=postgresql://mianshihou:123456@localhost:5432/mianshihou
BETTER_AUTH_SECRET=your-secret-key-at-least-32-characters-long
COOKIE_SECRET=your-cookie-secret-at-least-32-characters-long
BETTER_AUTH_URL=http://localhost:3001
CORS_ORIGIN=*
NODE_ENV=development
```

### 初始化数据库

如果数据库表不存在，运行：

```bash
cd mianshihou/apps/api
bun run db:push
```

### 验证数据库状态

运行数据库初始化脚本：

```bash
cd mianshihou/apps/api
bun run init-test-db
```

## 📊 测试覆盖率

### 查看覆盖率报告

```bash
cd mianshihou/apps/api
bun test --coverage
```

覆盖率报告会生成在 `coverage/` 目录中。

### 在浏览器中查看

```bash
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
start coverage/index.html  # Windows
```

### 目标覆盖率

- **单元测试**: > 80%
- **整体覆盖率**: > 70%

## 🐛 常见问题

### 1. 数据库连接失败

**错误**: `connection refused`

**解决**:
```bash
# 检查 PostgreSQL 是否运行
# macOS
brew services list | grep postgresql

# 启动 PostgreSQL
brew services start postgresql

# 或使用 Docker
docker-compose up -d postgres
```

### 2. 数据库表不存在

**错误**: `relation "session" does not exist`

**解决**:
```bash
cd mianshihou/apps/api
bun run db:push
```

### 3. 环境变量未设置

**错误**: `DATABASE_URL is not defined`

**解决**:
```bash
# 确保 .env 文件存在
cd mianshihou/apps/api
ls -la .env

# 如果不存在，从示例创建
cp .env.example .env
# 然后编辑 .env 文件
```

### 4. 测试超时

**错误**: `Test timeout`

**解决**:
```bash
# 增加测试超时时间
# 在 bunfig.toml 中配置
[test]
timeout = 60000  # 60秒
```

## 📚 参考资料

- [Bun Test 文档](https://bun.sh/docs/test)
- [测试最佳实践](https://testingjavascript.com/)
- [单元测试 vs 集成测试](https://martinfowler.com/bliki/UnitTest.html)

## 🎓 总结

**关键原则**:
1. ✅ 单元测试在 CI/CD 中自动运行
2. ✅ 集成测试在本地运行，推送前完成
3. ✅ 推送前确保所有测试通过
4. ✅ 使用测试驱动开发（TDD）

**推荐工作流**:
1. 编写代码
2. 编写测试
3. 本地运行测试
4. 修复问题
5. 推送代码

这样既能保证代码质量，又能提高开发效率！