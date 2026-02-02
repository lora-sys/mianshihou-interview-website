import Image from "next/image";
import Link from "next/link";
import { User, FileText, BookOpen, LogOut } from "lucide-react";
import { Button } from "@repo/ui";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* 侧边栏 */}
      <aside className="w-64 border-r bg-card p-4 flex flex-col">
        <div className="mb-8 flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Logo"
            width={32}
            height={32}
            className="h-8 w-auto"
          />
          <h1 className="text-xl font-bold">面试后</h1>
        </div>

        <nav className="flex-1 space-y-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2 rounded-md hover:bg-accent text-sm font-medium transition-colors"
          >
            <User className="w-4 h-4" />
            用户管理
          </Link>
          <Link
            href="/questions"
            className="flex items-center gap-2 px-4 py-2 rounded-md hover:bg-accent text-sm font-medium transition-colors"
          >
            <FileText className="w-4 h-4" />
            题目管理
          </Link>
          <Link
            href="/question-banks"
            className="flex items-center gap-2 px-4 py-2 rounded-md hover:bg-accent text-sm font-medium transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            题库管理
          </Link>
        </nav>

        <div className="pt-4 border-t">
          <Button variant="ghost" className="w-full justify-start gap-2">
            <LogOut className="w-4 h-4" />
            退出登录
          </Button>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
