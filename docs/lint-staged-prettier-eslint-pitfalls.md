# Lint-staged、Prettier 和 ESLint 配置踩坑记录

本文档记录了在配置 lint-staged、Prettier 和 ESLint 过程中遇到的所有问题、解决方案和最佳实践。

---

## 安装和配置

### 安装依赖

```bash
cd mianshihou/apps/api
bun add -D lint-staged prettier eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-config-prettier eslint-plugin-prettier
```

### 创建配置文件

1. **Prettier 配置** (`.prettierrc`)
2. **Prettier 忽略文件** (`.prettierignore`)
3. **ESLint 配置** (`eslint.config.js`)
4. **lint-staged 配置** (在 `package.json` 中)

---

## 错误 1: ESLint 9.x 不再支持 .eslintignore 文件

### 错误描述

运行 `bun run lint` 时出现以下警告：

```
ESLintIgnoreWarning: The ".eslintignore" file is no longer supported. Switch to using the "ignores" property in "eslint.config.js"
```

### 错误原因

ESLint 9.x 使用 Flat Config 系统，不再支持传统的 `.eslintignore` 文件。需要在 `eslint.config.js` 中使用 `ignores` 属性。

### 错误代码

```javascript
// .eslintignore（错误方式）
node_modules
dist
coverage
*.test.ts
*.config.js
bun.lockb

// eslint.config.js（错误方式）
module.exports = {
  root: true,  // 错误：flat config 不支持 root 键
  // ...
  ignorePatterns: ['dist', 'node_modules', 'coverage', '*.test.ts'],  // 错误：应该使用 ignores
};
```

### 解决方案

删除 `.eslintignore` 文件，在 `eslint.config.js` 中使用 `ignores` 属性：

```javascript
// eslint.config.js（正确方式）
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  plugins: ['@typescript-eslint', 'prettier'],
  rules: {
    'prettier/prettier': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': 'off',
  },
  ignores: ['dist', 'node_modules', 'coverage', '*.test.ts', '*.config.js', 'bun.lockb'],  // 使用 ignores 而不是 ignorePatterns
};
```

### 修改文件

- 删除 `mianshihou/apps/api/.eslintignore`
- 修改 `mianshihou/apps/api/eslint.config.js`

### 关键要点

- ESLint 9.x 使用 Flat Config 系统
- 不再支持 `.eslintignore` 文件
- 使用 `ignores` 属性而不是 `ignorePatterns`
- 不再支持 `root` 键

---

## 错误 2: Flat Config 不支持 "root" 键

### 错误描述

运行 `bun run lint` 时出现以下错误：

```
ESLint: 9.39.2

A config object is using the "root" key, which is not supported in flat config system.

Flat configs always act as if they are the root config file, so this key can be safely removed.
```

### 错误原因

ESLint 9.x 的 Flat Config 系统不再支持 `root` 键，因为所有配置文件都自动被视为根配置文件。

### 错误代码

```javascript
module.exports = {
  root: true,  // 错误：flat config 不支持 root 键
  // ...
};
```

### 解决方案

删除 `root` 键：

```javascript
module.exports = {
  // root: true,  // 删除这行
  parser: '@typescript-eslint/parser',
  // ...
};
```

### 修改文件

- `mianshihou/apps/api/eslint.config.js`

### 关键要点

- Flat Config 系统自动将配置文件视为根配置
- 不需要 `root` 键
- 直接删除即可

---

## 错误 3: Husky prepare 脚本路径问题

### 错误描述

安装依赖时出现以下警告：

```
husky - install command is DEPRECATED
```

### 错误原因

Husky 9.x 的 `install` 命令已弃用，新的方式是使用 `husky init` 命令或手动配置。

### 错误代码

```json
{
  "scripts": {
    "prepare": "cd ../.. && husky install mianshihou/apps/api/.husky"  // 旧方式
  }
}
```

### 解决方案

使用新的 `husky init` 命令或手动配置：

```bash
# 在项目根目录运行
git config core.hooksPath .husky
```

或者保留现有的 `prepare` 脚本（虽然会有警告，但仍然可以工作）。

### 关键要点

- Husky 9.x 的 `install` 命令已弃用
- 使用 `git config core.hooksPath .husky` 代替
- 或使用 `husky init` 命令

---

## 错误 4: lint-staged 与 Prettier 冲突

### 错误描述

配置 lint-staged 时，Prettier 和 ESLint 可能会对同一文件进行多次格式化，导致冲突。

### 错误代码

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",  // 先运行 ESLint
      "prettier --write"  // 再运行 Prettier，可能覆盖 ESLint 的修改
    ]
  }
}
```

### 解决方案

使用 `eslint-config-prettier` 和 `eslint-plugin-prettier` 来确保 ESLint 和 Prettier 协同工作：

```javascript
// eslint.config.js
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',  // 必须放在最后，禁用与 Prettier 冲突的规则
  ],
  plugins: ['@typescript-eslint', 'prettier'],
  rules: {
    'prettier/prettier': 'error',  // 将 Prettier 错误报告为 ESLint 错误
  },
};
```

### 关键要点

- 使用 `eslint-config-prettier` 禁用与 Prettier 冲突的规则
- 使用 `eslint-plugin-prettier` 将 Prettier 规则集成到 ESLint
- `prettier` 配置必须放在 `extends` 数组的最后
- 使用 `'prettier/prettier': 'error'` 将 Prettier 错误报告为 ESLint 错误

---

## 错误 5: lint-staged 配置路径问题

### 错误描述

lint-staged 无法找到要检查的文件，或者检查了不应该检查的文件。

### 错误代码

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "src/**/*.{ts,tsx}": ["eslint --fix", "prettier --write"]  // 错误：重复配置
  }
}
```

### 解决方案

简化配置，避免重复：

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{js,jsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

### 关键要点

- 使用通配符匹配文件类型
- 避免重复配置
- 简化配置以提高性能

---

## 错误 6: Prettier 格式化后 git diff 显示大量变更

### 错误描述

运行 `bun run format` 后，git diff 显示大量文件被修改，但实际上只是格式化。

### 错误原因

Prettier 的默认配置可能与项目现有的代码风格不一致。

### 解决方案

1. 先运行 `bun run format` 格式化所有文件
2. 提交格式化后的代码
3. 后续提交时，lint-staged 会自动格式化新修改的文件

```bash
# 第一次配置时
bun run format
git add -A
git commit -m "style: 添加 Prettier 配置并格式化代码"
```

### 关键要点

- 第一次配置时，Prettier 会格式化所有文件
- 提交格式化后的代码
- 后续使用 lint-staged 只格式化修改的文件

---

## 完整配置示例

### .prettierrc

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### .prettierignore

```
node_modules
dist
coverage
*.lock
.env
.env.*
bun.lockb
```

### eslint.config.js

```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  plugins: ['@typescript-eslint', 'prettier'],
  rules: {
    'prettier/prettier': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': 'off',
  },
  ignores: ['dist', 'node_modules', 'coverage', '*.test.ts', '*.config.js', 'bun.lockb'],
};
```

### package.json

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
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
cd mianshihou/apps/api

echo "🧪 运行单元测试..."
bun test tests/unit

if [ $? -ne 0 ]; then
  echo "❌ 单元测试失败，请修复后再提交"
  exit 1
fi

echo "✅ 单元测试通过"

echo "✨ 检查暂存文件..."
bunx lint-staged

if [ $? -ne 0 ]; then
  echo "❌ 代码检查失败，请修复后再提交"
  exit 1
fi

echo "✅ 代码检查通过"
```

---

## 最佳实践

### 1. 配置顺序很重要

确保 `prettier` 配置放在 `extends` 数组的最后：

```javascript
extends: [
  'eslint:recommended',
  'plugin:@typescript-eslint/recommended',
  'prettier',  // 必须放在最后
],
```

### 2. 使用 lint-staged 只检查修改的文件

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"]
  }
}
```

### 3. pre-commit hook 应该快速

pre-commit hook 应该在几秒内完成：
- ✅ 快速检查（ESLint、格式化）
- ✅ 单元测试（如果很快）
- ❌ 完整测试套件
- ❌ 集成测试

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

### 5. 定期运行完整检查

```bash
# 定期运行完整检查
bun run lint
bun run format
bun test
```

---

## 测试验证

### 测试 ESLint

```bash
cd mianshihou/apps/api
bun run lint
```

### 测试 Prettier

```bash
cd mianshihou/apps/api
bun run format
```

### 测试 lint-staged

```bash
cd mianshihou/apps/api
echo "test" > test.ts
git add test.ts
bunx lint-staged
rm test.ts
```

### 测试 pre-commit hook

```bash
cd mianshihou/apps/api
echo "test" > test.ts
git add test.ts
git commit -m "test: 测试 pre-commit hook"
```

---

## 参考资料

- [ESLint Flat Config 文档](https://eslint.org/docs/latest/use/configure/configuration-files-new)
- [Prettier 官方文档](https://prettier.io/)
- [lint-staged 官方文档](https://github.com/okonet/lint-staged)
- [eslint-config-prettier](https://github.com/prettier/eslint-config-prettier)
- [eslint-plugin-prettier](https://github.com/prettier/eslint-plugin-prettier)

---

## 总结

### 主要问题类别

1. **ESLint 9.x 配置变化**：不再支持 `.eslintignore` 和 `root` 键
2. **Husky 命令弃用**：`install` 命令已弃用
3. **lint-staged 与 Prettier 冲突**：需要正确配置 ESLint 和 Prettier 的集成
4. **配置路径问题**：正确配置 lint-staged 的文件匹配模式
5. **格式化大量文件**：首次配置时 Prettier 会格式化所有文件

### 最佳实践

1. **使用 Flat Config**：ESLint 9.x 使用新的配置系统
2. **正确集成 ESLint 和 Prettier**：使用 `eslint-config-prettier` 和 `eslint-plugin-prettier`
3. **使用 lint-staged**：只检查修改的文件，提高速度
4. **简化配置**：避免重复配置，提高性能
5. **提供清晰的错误信息**：帮助开发者快速定位问题

### 经验教训

1. **阅读官方文档**：ESLint 9.x 的配置方式发生了重大变化
2. **逐步配置**：不要一次性配置所有工具，逐步测试每个工具
3. **测试配置**：配置完成后，测试每个工具是否正常工作
4. **记录问题**：记录每个问题的解决方案，方便后续参考
5. **定期更新**：工具版本更新后，检查配置是否需要调整

### 后续改进

1. **添加更多 ESLint 规则**：根据项目需求添加更多规则
2. **配置 commitlint**：检查提交信息格式
3. **添加 pre-push hook**：运行完整测试套件
4. **配置.editorconfig**：统一编辑器配置
5. **添加更多文件类型**：支持更多文件类型的检查和格式化