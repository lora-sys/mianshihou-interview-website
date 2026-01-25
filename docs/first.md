# First setting for Monorepo

## init pnpm workspace
```bash
pnpm init
```

## 初始化 Turborepo
```bash
npx create-turbo@latest
```

## 初始化pnpm-workspace.yaml
```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```
