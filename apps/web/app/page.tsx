import Link from "next/link";
import TopNav from "@/components/top-nav";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui";
import { getCurrentUser, safeTrpcBatchQuery } from "@/lib/trpc/server";

function formatDate(value: any) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("zh-CN");
}

function parseTags(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}

export default async function HomePage() {
  const user = await getCurrentUser();

  const [systemQuestionsRes, systemBanksRes] = await safeTrpcBatchQuery([
    { path: "explore.questions.getRecent", input: { limit: 10 } },
    { path: "explore.questionBanks.getRecent", input: { limit: 10 } },
  ]);

  const [myQuestionsRes, myBanksRes] = user
    ? await safeTrpcBatchQuery([
        { path: "question.getRecent", input: { limit: 10 } },
        { path: "questionBank.getRecent", input: { limit: 10 } },
      ])
    : [null, null];

  const systemQuestions = systemQuestionsRes?.data ?? [];
  const systemBanks = systemBanksRes?.data ?? [];
  const recentQuestions = myQuestionsRes?.data ?? [];
  const recentBanks = myBanksRes?.data ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <TopNav />
      <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">首页</h1>
            <p className="text-sm text-muted-foreground">
              系统内置精选题库与题目，直接开始刷题。
            </p>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Button asChild variant="outline">
                  <Link href="/question-banks/new">新建题库</Link>
                </Button>
                <Button asChild>
                  <Link href="/questions/new">新建题目</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="outline">
                  <Link href="/explore/question-banks">浏览题库</Link>
                </Button>
                <Button asChild>
                  <Link href="/login">登录保存进度</Link>
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">精选题目</CardTitle>
                <CardDescription>系统内置最近更新的 10 道</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/explore/questions">查看全部</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-t bg-muted/40">
                    <tr className="text-left">
                      <th className="px-4 py-3 font-medium">标题</th>
                      <th className="px-4 py-3 font-medium">标签</th>
                      <th className="px-4 py-3 font-medium w-24" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {systemQuestions.length > 0 ? (
                      systemQuestions.map((q: any) => {
                        const tags = parseTags(q.tags).slice(0, 2);
                        return (
                          <tr key={q.id} className="hover:bg-accent/30">
                            <td className="px-4 py-3">
                              <Link
                                href={`/explore/questions/${q.id}`}
                                className="font-medium hover:underline"
                              >
                                {q.title}
                              </Link>
                              <div className="text-xs text-muted-foreground line-clamp-1 mt-1">
                                {q.content}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {tags.length > 0 ? (
                                  tags.map((t) => (
                                    <Badge
                                      key={t}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {t}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    -
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button asChild size="sm" variant="outline">
                                <Link href={`/explore/questions/${q.id}`}>
                                  查看
                                </Link>
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          className="px-4 py-10 text-center text-muted-foreground"
                          colSpan={3}
                        >
                          暂无题目
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">精选题库</CardTitle>
                <CardDescription>系统内置最近更新的 10 个</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/explore/question-banks">查看全部</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-t bg-muted/40">
                    <tr className="text-left">
                      <th className="px-4 py-3 font-medium">标题</th>
                      <th className="px-4 py-3 font-medium whitespace-nowrap">
                        题目数
                      </th>
                      <th className="px-4 py-3 font-medium w-24" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {systemBanks.length > 0 ? (
                      systemBanks.map((b: any) => (
                        <tr key={b.id} className="hover:bg-accent/30">
                          <td className="px-4 py-3">
                            <Link
                              href={`/explore/question-banks/${b.id}`}
                              className="font-medium hover:underline"
                            >
                              {b.title}
                            </Link>
                            <div className="text-xs text-muted-foreground line-clamp-1 mt-1">
                              {b.description || "暂无描述"}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                            {b.questionCount ?? 0}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/explore/question-banks/${b.id}`}>
                                进入
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          className="px-4 py-10 text-center text-muted-foreground"
                          colSpan={3}
                        >
                          暂无题库
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {!user ? (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>登录后解锁“我的”</CardTitle>
              <CardDescription>
                登录后可创建个人题库、沉淀笔记，并在后台管理权限与数据。
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2">
              <Button asChild>
                <Link href="/login">登录</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/register">注册</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">我的题目</CardTitle>
                  <CardDescription>最近更新的 10 道题</CardDescription>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/questions">查看全部</Link>
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-t bg-muted/40">
                      <tr className="text-left">
                        <th className="px-4 py-3 font-medium">标题</th>
                        <th className="px-4 py-3 font-medium">标签</th>
                        <th className="px-4 py-3 font-medium whitespace-nowrap">
                          创建时间
                        </th>
                        <th className="px-4 py-3 font-medium w-24" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {recentQuestions.length > 0 ? (
                        recentQuestions.map((q: any) => {
                          const tags = parseTags(q.tags).slice(0, 2);
                          return (
                            <tr key={q.id} className="hover:bg-accent/30">
                              <td className="px-4 py-3">
                                <Link
                                  href={`/questions/${q.id}`}
                                  className="font-medium hover:underline"
                                >
                                  {q.title}
                                </Link>
                                <div className="text-xs text-muted-foreground line-clamp-1 mt-1">
                                  {q.content}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1">
                                  {tags.length > 0 ? (
                                    tags.map((t) => (
                                      <Badge
                                        key={t}
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        {t}
                                      </Badge>
                                    ))
                                  ) : (
                                    <span className="text-xs text-muted-foreground">
                                      -
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                                {formatDate(q.createTime)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Button asChild size="sm" variant="outline">
                                  <Link href={`/questions/${q.id}`}>查看</Link>
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            className="px-4 py-10 text-center text-muted-foreground"
                            colSpan={4}
                          >
                            暂无题目
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">我的题库</CardTitle>
                  <CardDescription>最近更新的 10 个题库</CardDescription>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/question-banks">查看全部</Link>
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-t bg-muted/40">
                      <tr className="text-left">
                        <th className="px-4 py-3 font-medium">标题</th>
                        <th className="px-4 py-3 font-medium whitespace-nowrap">
                          题目数
                        </th>
                        <th className="px-4 py-3 font-medium whitespace-nowrap">
                          创建时间
                        </th>
                        <th className="px-4 py-3 font-medium w-24" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {recentBanks.length > 0 ? (
                        recentBanks.map((b: any) => (
                          <tr key={b.id} className="hover:bg-accent/30">
                            <td className="px-4 py-3">
                              <Link
                                href={`/question-banks/${b.id}`}
                                className="font-medium hover:underline"
                              >
                                {b.title}
                              </Link>
                              <div className="text-xs text-muted-foreground line-clamp-1 mt-1">
                                {b.description || "暂无描述"}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                              {b.questionCount ?? 0}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                              {formatDate(b.createTime)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button asChild size="sm" variant="outline">
                                <Link href={`/question-banks/${b.id}`}>
                                  查看
                                </Link>
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            className="px-4 py-10 text-center text-muted-foreground"
                            colSpan={4}
                          >
                            暂无题库
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
