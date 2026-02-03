"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, FileText, LayoutDashboard, LogOut } from "lucide-react";
import { Button } from "@repo/ui";
import { cn } from "@/lib/utils";

function NavItem({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
        "hover:bg-accent/70 hover:text-foreground",
        isActive
          ? "bg-accent text-foreground shadow-sm"
          : "text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "grid h-9 w-9 place-items-center rounded-xl border bg-background/40 transition",
          isActive
            ? "border-border"
            : "border-border/60 group-hover:border-border",
        )}
      >
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function DashboardShell({
  user,
  children,
}: {
  user: { email?: string | null } | any;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px] gap-6 px-4 py-6 md:px-6">
        <aside className="hidden w-72 shrink-0 md:block">
          <div className="sticky top-6 space-y-4">
            <div className="rounded-2xl border bg-card/70 p-4 shadow-sm backdrop-blur">
              <Link href="/" className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl border bg-background/70">
                  <Image
                    src="/logo.png"
                    alt="面试猴"
                    width={36}
                    height={36}
                    className="h-9 w-auto"
                    priority
                  />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold tracking-tight">
                    面试猴
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {user.userName || user.email || "已登录"}
                  </div>
                </div>
              </Link>
            </div>

            <div className="rounded-2xl border bg-card/60 p-2 shadow-sm backdrop-blur">
              <nav className="space-y-1">
                <NavItem
                  href="/dashboard"
                  icon={<LayoutDashboard className="h-4 w-4" />}
                  label="概览"
                />
                <NavItem
                  href="/questions"
                  icon={<FileText className="h-4 w-4" />}
                  label="题目"
                />
                <NavItem
                  href="/question-banks"
                  icon={<BookOpen className="h-4 w-4" />}
                  label="题库"
                />
              </nav>
            </div>

            <div className="rounded-2xl border bg-card/60 p-3 shadow-sm backdrop-blur">
              <Button
                asChild
                variant="ghost"
                className="w-full justify-start gap-2 rounded-xl"
              >
                <Link href="/logout">
                  <LogOut className="h-4 w-4" />
                  退出登录
                </Link>
              </Button>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="rounded-2xl border bg-card/60 p-4 shadow-sm backdrop-blur md:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
