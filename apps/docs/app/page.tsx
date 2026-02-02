import Link from "next/link";

export default function DocsHomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">面试猴 · 项目文档</h1>
        <p className="text-sm text-muted-foreground">
          记录架构、踩坑与后续规划，避免重复走弯路。
        </p>
      </div>

      <div className="grid gap-3">
        <Link href="/pitfalls" className="rounded-xl border p-4 hover:bg-accent/30 transition">
          <div className="font-medium">踩坑记录</div>
          <div className="text-sm text-muted-foreground mt-1">Better Auth / tRPC / SSR / Drizzle 等</div>
        </Link>
        <Link href="/admin-plan" className="rounded-xl border p-4 hover:bg-accent/30 transition">
          <div className="font-medium">管理员规划</div>
          <div className="text-sm text-muted-foreground mt-1">权限模型、后台能力、批量操作与审计</div>
        </Link>
      </div>
    </main>
  );
}
