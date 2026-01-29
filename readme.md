# 这是一个全栈nodejs 的面试刷题网站
## 原代码使用java sprintboot实现，现计划重构为Monorepo架构


## 项目计划结构
```bash
mianshiya-next-lora/
├── apps/
│   ├── web/                           # 前端应用
│   │   ├── app/                       # Next.js App Router
│   │   │   ├── (auth)/                # 认证页面
│   │   │   ├── (dashboard)/           # 主页面
│   │   │   └── _trpc/                 # tRPC 配置
│   │   ├── components/                # 组件
│   │   ├── lib/                       # 工具库
│   │   ├── hooks/                     # 自定义 Hooks
│   │   ├── stores/                    # 状态管理
│   │   ├── public/                    # 静态资源
│   │   ├── next.config.mjs
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── api/                           # 后端应用
│       ├── src/
│       │   ├── db/                    # 数据库
│       │   ├── lib/                   # 工具库
│       │   ├── middlewares/           # 中间件
│       │   ├── modules/               # 业务模块
│       │   ├── trpc/                  # tRPC 配置
│       │   └── index.ts
│       ├── sql/                       # SQL 初始化脚本
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── config/                        # 共享配置
│   │   ├── eslint-config/
│   │   ├── prettier-config/
│   │   └── tsconfig/
│   ├── types/                         # 共享类型
│   │   ├── trpc.ts
│   │   ├── index.ts
│   │   └── package.json
│   └── ui/                            # 共享 UI 组件（可选）
│
├── docker-compose.yml                 # Docker Compose
├── pnpm-workspace.yaml                # pnpm workspace
├── turbo.json                         # Turborepo
├── package.json                       # 根 package.json
├── .gitignore
└── README.md
```

![Tests](https://github.com/你的用户名/mianshihou-interview-website/actions/workflows/test.yml/badge.svg)