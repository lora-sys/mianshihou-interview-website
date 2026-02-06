# 前端开发模板指南

本文档详细介绍了 `apps/web` 的架构模式和 React/Next.js 开发最佳实践。

## 🏗 技术栈

- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn UI
- **Data Fetching**: tRPC (Client & Server)
- **State Management**: URL State & React Query

## 📂 目录结构

```
apps/web/
├── app/
│   ├── (auth)/             # 认证相关路由组
│   ├── (dashboard)/        # 面板相关路由组
│   ├── components/         # 页面级组件
│   ├── layout.tsx          # 根布局
│   └── page.tsx            # 首页
├── components/             # 全局共享组件
│   ├── ui/                 # Shadcn UI 基础组件
│   └── ...
├── lib/                    # 工具函数和配置
└── hooks/                  # 自定义 Hooks
```

## 🚀 组件开发模板

### 1. 页面组件 (Page) - Server Component

页面组件应尽量保持为 Server Component，负责数据获取和元数据定义。

```typescript
// app/posts/page.tsx
import { Suspense } from "react";
import { trpcQuery } from "@/lib/trpc/server";
import { PostList } from "./_components/post-list";
import { PostListSkeleton } from "./_components/post-list-skeleton";

export default async function PostsPage() {
  // 预加载数据或直接在组件中获取
  // 如果需要流式渲染，可以将数据获取下沉到 Client Component 或通过 Suspense 包裹的 Server Component

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">文章列表</h1>
      <Suspense fallback={<PostListSkeleton />}>
        <PostListWrapper />
      </Suspense>
    </div>
  );
}

// 拆分出的 Server Component，用于流式传输
async function PostListWrapper() {
  const posts = await trpcQuery("posts.list");
  return <PostList initialData={posts} />;
}
```

### 2. 交互组件 - Client Component

需要用户交互（点击、表单、状态）的组件必须标记为 `"use client"`。

```typescript
// app/posts/_components/post-list.tsx
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";

export function PostList({ initialData }: { initialData: any[] }) {
  // 使用 React Query 管理客户端数据状态
  const { data } = trpc.posts.list.useQuery(undefined, {
    initialData,
  });

  return (
    <ul>
      {data.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

## 💎 React 最佳实践

### 1. 代码分割与按需加载 (Code Splitting)

- **Next.js 自动分割**: 每个 Page 和 Layout 自动分割。
- **重型组件**: 对于巨大的组件（如富文本编辑器、图表），使用 `next/dynamic` 和 `Suspense`。

```typescript
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const HeavyChart = dynamic(() => import("@/components/charts/heavy-chart"), {
  loading: () => <Skeleton className="h-[300px] w-full" />,
  ssr: false, // 如果不需要 SEO，可以禁用 SSR
});
```

### 2. 状态管理策略

遵循状态下沉和 URL 优先原则：

1.  **URL Search Params**: 搜索关键词、分页、筛选条件 -> 放在 URL 中，可分享，可刷新。
2.  **Server State (React Query)**: 远程数据 -> 使用 tRPC hooks。
3.  **Local State (useState)**: UI 交互状态（模态框打开/关闭、表单输入）。
4.  **Global State (Zustand)**: 仅用于真正的全局状态（如用户偏好设置、购物车）。**避免滥用 Context**。

### 3. 组件设计原则

- **单一职责**: 一个组件只做一件事。
- **Props 扁平化**: 传递基本类型 props 而不是整个对象，除非对象结构非常稳定。
- **组合优于继承**: 使用 `children` prop 或 render props 来组合组件。

### 4. 性能优化 (Web Vitals)

- **LCP (Largest Contentful Paint)**: 确保首屏关键图片使用 `<Image priority />`。
- **CLS (Cumulative Layout Shift)**: 为图片和动态加载的内容预留空间（使用 Skeleton）。
- **INP (Interaction to Next Paint)**: 避免在事件处理函数中执行长任务；使用 `useTransition` 处理非紧急更新。

## 🎨 样式规范

- 使用 Tailwind CSS utility classes。
- 避免在组件中写复杂的行内样式。
- 使用 `cn()` 工具函数合并类名。

```typescript
import { cn } from "@/lib/utils";

<div className={cn("p-4 bg-white", className)}>{children}</div>
```
