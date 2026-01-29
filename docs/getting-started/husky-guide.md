# Husky Git Hooks 指南

## 📖 什么是 Husky？

Husky 是一个流行的 Git hooks 管理工具，它让你能够轻松地在 Git 事件（如 commit、push 等）发生时自动运行脚本。

### 为什么需要 Husky？

在实际开发中，我们经常需要在提交代码前执行一些检查：
- ✅ 运行测试
- ✅ 代码格式化（Prettier）
- ✅ 代码检查（ESLint）
- ✅ TypeScript 类型检查
- ✅ 检查提交信息格式

如果没有 Husky，这些检查需要：
- ❌ 每次手动运行
- ❌ 容易忘记
- ❌ 无法强制执行

有了 Husky，这些检查会：
- ✅ 自动运行
- ✅ 不会忘记
- ✅ 可以强制执行

## 🚀 如何安装和配置 Husky

### 1. 安装 Husky

```bash
cd mianshihou/apps/api
bun add -D husky
```

### 2. 初始化 Husky

```bash
bunx husky init
```

这个命令会：
- 创建 `.husky/` 目录
- 在 `package.json` 中添加 `prepare` 脚本
- 创建 `.husky/pre-commit` hook

### 3. 验证安装

检查以下文件是否创建：
- `.husky/pre-commit`
- `.husky/commit-msg`

## 🔧 配置常用 Hooks

### pre-commit Hook（提交前检查）

在提交代码前运行测试和代码检查：

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🧪 运行单元测试..."
bun test tests/unit

if [ $? -ne 0 ]; then
  echo "❌ 单元测试失败，请修复后再提交"
  exit 1
fi

echo "✅ 单元测试通过"
```

### pre-push Hook（推送前检查）

在推送代码前运行完整测试：

```bash
# .husky/pre-push
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🧪 运行所有测试..."
bun test

if [ $? -ne 0 ]; then
  echo "❌ 测试失败，请修复后再推送"
  exit 1
fi

echo "✅ 所有测试通过"
```

### commit-msg Hook（检查提交信息）

检查提交信息是否符合规范：

```bash
# .husky/commit-msg
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# 获取提交信息
commit_msg=$(cat "$1")

# 检查提交信息格式（示例：feat: 添加新功能）
if ! echo "$commit_msg" | grep -qE "^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?: .{1,}"; then
  echo "❌ 提交信息格式不正确"
  echo ""
  echo "正确格式："
  echo "  feat: 添加新功能"
  echo "  fix: 修复 bug"
  echo "  docs: 更新文档"
  echo "  test: 添加测试"
  echo ""
  echo "更多格式参考：https://www.conventionalcommits.org/"
  exit 1
fi

echo "✅ 提交信息格式正确"
```

## 📦 使用 lint-staged（推荐）

lint-staged 可以只对本次修改的文件运行检查，提高速度。

### 安装 lint-staged

```bash
bun add -D lint-staged
```

### 配置 lint-staged

在 `package.json` 中添加：

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{js,jsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

### 更新 pre-commit Hook

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🔍 运行单元测试..."
bun test tests/unit

if [ $? -ne 0 ]; then
  echo "❌ 单元测试失败，请修复后再提交"
  exit 1
fi

echo "✨ 检查暂存文件..."
bunx lint-staged
```

## 🎯 完整配置示例

### package.json

```json
{
  "name": "mianshihou-api",
  "scripts": {
    "prepare": "husky install",
    "test": "bun test",
    "test:unit": "bun test tests/unit",
    "test:integration": "bun test tests/integration",
    "lint": "eslint .",
    "format": "prettier --write ."
  },
  "devDependencies": {
    "husky": "^9.0.0",
    "lint-staged": "^15.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{js,jsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

### .husky/pre-commit

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🧪 运行单元测试..."
bun test tests/unit

if [ $? -ne 0 ]; then
  echo "❌ 单元测试失败，请修复后再提交"
  exit 1
fi

echo "✨ 检查暂存文件..."
bunx lint-staged

echo "✅ 所有检查通过"
```

### .husky/commit-msg

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

commit_msg=$(cat "$1")

if ! echo "$commit_msg" | grep -qE "^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?: .{1,}"; then
  echo "❌ 提交信息格式不正确"
  echo ""
  echo "正确格式："
  echo "  feat: 添加新功能"
  echo "  fix: 修复 bug"
  echo "  docs: 更新文档"
  echo "  test: 添加测试"
  echo ""
  echo "更多格式参考：https://www.conventionalcommits.org/"
  exit 1
fi

echo "✅ 提交信息格式正确"
```

## 📋 提交信息规范（Conventional Commits）

### 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type（类型）

| Type | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | 修复 bug |
| `docs` | 文档更新 |
| `style` | 代码格式调整（不影响功能） |
| `refactor` | 重构（既不是新功能也不是修复） |
| `test` | 添加或修改测试 |
| `chore` | 构建过程或辅助工具的变动 |
| `perf` | 性能优化 |
| `ci` | CI/CD 配置文件和脚本的变动 |
| `build` | 影响构建系统或外部依赖的更改 |
| `revert` | 回退之前的提交 |

### 示例

```bash
git commit -m "feat(auth): 添加用户登录功能"
git commit -m "fix(auth): 修复 cookie 设置问题"
git commit -m "docs: 更新 API 文档"
git commit -m "test(auth): 添加登录集成测试"
git commit -m "refactor(user): 优化用户查询逻辑"
```

## 🔍 常见问题

### 1. 如何跳过 Husky hooks？

在提交时添加 `--no-verify` 参数：

```bash
git commit --no-verify -m "临时提交"
```

**注意**：这会跳过所有 hooks，谨慎使用！

### 2. 如何临时禁用某个 hook？

```bash
# 禁用 pre-commit
chmod -x .husky/pre-commit

# 重新启用
chmod +x .husky/pre-commit
```

### 3. 如何调试 hook？

在 hook 中添加 `set -x` 来查看详细输出：

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

set -x  # 启用调试模式

echo "🧪 运行单元测试..."
bun test tests/unit
```

### 4. 如何在 CI/CD 中运行 hooks？

通常不需要，CI/CD 已经有自己的检查流程。但如果需要：

```bash
# 在 CI/CD 中手动运行 hooks
bunx husky install
git config core.hooksPath .husky
```

### 5. hook 运行太慢怎么办？

- 使用 `lint-staged` 只检查修改的文件
- 将耗时的检查移到 `pre-push` hook
- 考虑并行运行检查

## 🎓 最佳实践

### 1. pre-commit 应该快速

pre-commit hook 应该在几秒内完成：
- ✅ 快速检查（ESLint、格式化）
- ✅ 单元测试（如果很快）
- ❌ 完整测试套件
- ❌ 集成测试

### 2. pre-push 可以慢一些

pre-push hook 可以运行更耗时的检查：
- ✅ 完整测试套件
- ✅ 集成测试
- ✅ 构建检查

### 3. 使用 lint-staged

只检查修改的文件，提高速度：
```json
"lint-staged": {
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"]
}
```

### 4. 提供清晰的错误信息

```bash
if [ $? -ne 0 ]; then
  echo "❌ 单元测试失败"
  echo ""
  echo "运行以下命令查看详情："
  echo "  bun test tests/unit"
  exit 1
fi
```

### 5. 不要强制所有开发者使用相同的 hooks

在 `.gitignore` 中添加：
```
.husky/*
!.husky/pre-commit
!.husky/commit-msg
```

让开发者可以选择是否启用某些 hooks。

## 📚 参考资料

- [Husky 官方文档](https://typicode.github.io/husky/)
- [lint-staged 官方文档](https://github.com/okonet/lint-staged)
- [Conventional Commits 规范](https://www.conventionalcommits.org/)
- [Commitlint](https://commitlint.js.org/)

## 🚀 下一步

1. ✅ 安装和配置 Husky
2. ✅ 配置 pre-commit hook
3. ✅ 配置 commit-msg hook
4. ✅ 安装和配置 lint-staged
5. ⏳ 配置 commitlint（可选）
6. ⏳ 添加更多自定义 hooks

现在你的项目已经配置好了 Git hooks，每次提交代码时都会自动运行检查，确保代码质量！