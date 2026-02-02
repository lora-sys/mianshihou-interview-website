"use client";

import Link from "next/link";
import { useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui";
import {
  BookOpen,
  FileText,
  LayoutDashboard,
  Plus,
  Sparkles,
} from "lucide-react";

function StatCard({
  title,
  value,
  helper,
  icon,
}: {
  title: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className="mt-2 text-3xl font-semibold tracking-tight">
            {value}
          </div>
          <CardDescription className="mt-2">{helper}</CardDescription>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-2xl border bg-background/60">
          {icon}
        </div>
      </CardHeader>
    </Card>
  );
}

export default function DashboardHomePage() {
  const statsQuery = trpc.dashboard.getStats.useQuery();
  const recentQuestionsQuery = trpc.question.getRecent.useQuery({ limit: 6 });
  const recentBanksQuery = trpc.questionBank.getRecent.useQuery({ limit: 6 });

  const stats = statsQuery.data?.data;
  const recentQuestions = useMemo(
    () => recentQuestionsQuery.data?.data ?? [],
    [recentQuestionsQuery.data?.data],
  );
  const recentBanks = useMemo(
    () => recentBanksQuery.data?.data ?? [],
    [recentBanksQuery.data?.data],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            面试猴 · 学习面板
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">仪表盘</h1>
          <p className="text-sm text-muted-foreground">
            继续积累题目与题库，保持稳定的练习节奏。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/question-banks/new">
              <BookOpen className="h-4 w-4 mr-2" />
              新建题库
            </Link>
          </Button>
          <Button asChild>
            <Link href="/questions/new">
              <Plus className="h-4 w-4 mr-2" />
              新建题目
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="题目数量"
          value={String(stats?.totalQuestions ?? 0)}
          helper="越早整理，越利于复盘"
          icon={<FileText className="h-4 w-4" />}
        />
        <StatCard
          title="题库数量"
          value={String(stats?.totalQuestionBanks ?? 0)}
          helper="按岗位/方向做结构化归档"
          icon={<BookOpen className="h-4 w-4" />}
        />
        <StatCard
          title="已完成练习"
          value={String(stats?.completedPractices ?? 0)}
          helper="持续练习会带来质变"
          icon={<LayoutDashboard className="h-4 w-4" />}
        />
        <StatCard
          title="平均得分"
          value={`${stats?.averageScore ?? 0}%`}
          helper="目标：稳步提升即可"
          icon={<Sparkles className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">最近题目</CardTitle>
              <CardDescription>最近新增或更新的题目</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/questions">查看全部</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentQuestionsQuery.isLoading ? (
              <div className="space-y-2">
                <div className="h-11 w-full rounded-xl bg-muted animate-pulse" />
                <div className="h-11 w-full rounded-xl bg-muted animate-pulse" />
                <div className="h-11 w-full rounded-xl bg-muted animate-pulse" />
              </div>
            ) : recentQuestions.length > 0 ? (
              <div className="space-y-2">
                {recentQuestions.map((q: any) => (
                  <div
                    key={q.id}
                    className="flex items-start justify-between gap-3 rounded-xl border bg-background/40 p-3 transition hover:bg-accent/40"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/questions/${q.id}`}
                        className="text-sm font-medium hover:underline line-clamp-1"
                      >
                        {q.title}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {q.content}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="shrink-0 bg-primary/10 text-primary border-primary/20"
                    >
                      {q.answer ? "有答案" : "待补充"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border bg-background/40 p-6 text-center text-sm text-muted-foreground">
                暂无题目，先从创建第一道题开始。
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">最近题库</CardTitle>
              <CardDescription>最近新增或更新的题库</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/question-banks">查看全部</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentBanksQuery.isLoading ? (
              <div className="space-y-2">
                <div className="h-11 w-full rounded-xl bg-muted animate-pulse" />
                <div className="h-11 w-full rounded-xl bg-muted animate-pulse" />
                <div className="h-11 w-full rounded-xl bg-muted animate-pulse" />
              </div>
            ) : recentBanks.length > 0 ? (
              <div className="space-y-2">
                {recentBanks.map((b: any) => (
                  <div
                    key={b.id}
                    className="flex items-start justify-between gap-3 rounded-xl border bg-background/40 p-3 transition hover:bg-accent/40"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/question-banks/${b.id}`}
                        className="text-sm font-medium hover:underline line-clamp-1"
                      >
                        {b.title}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {b.description || "暂无描述"}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {b.questionCount ?? 0} 题
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border bg-background/40 p-6 text-center text-sm text-muted-foreground">
                暂无题库，建议先按岗位方向建一个题库。
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
