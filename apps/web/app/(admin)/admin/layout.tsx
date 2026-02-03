import TopNav from "@/components/top-nav";
import Link from "next/link";
import { Button } from "@repo/ui";
import { requireAdmin } from "@/lib/auth/guards";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin("/admin");

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <TopNav />
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              管理员后台
            </h1>
            <p className="text-sm text-muted-foreground">仅管理员可访问</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin">总览</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/users">用户</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/questions">题目</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/question-banks">题库</Link>
            </Button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
