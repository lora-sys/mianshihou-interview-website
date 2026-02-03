import Link from "next/link";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from "@repo/ui";
import { safeTrpcQuery } from "@/lib/trpc/server";
import { Search } from "lucide-react";

function normalizeSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
) {
  const qRaw = searchParams?.q;
  const q = Array.isArray(qRaw) ? qRaw[0] : qRaw;
  return { q: (q ?? "").trim() };
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

function highlight(text: string, q: string) {
  const source = String(text ?? "");
  const query = q.trim();
  if (!query) return source;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(escaped, "ig");
  const parts = source.split(re);
  const matches = source.match(re) ?? [];
  if (matches.length === 0) return source;
  const nodes: any[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i]) nodes.push(parts[i]);
    const m = matches[i];
    if (m) {
      nodes.push(
        <span
          key={`${m}-${i}`}
          className="rounded-sm bg-primary/15 px-0.5 text-foreground"
        >
          {m}
        </span>,
      );
    }
  }
  return nodes;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const { q } = normalizeSearchParams(searchParams);

  const res = q ? await safeTrpcQuery("search.query", { q, limit: 10 }) : null;

  const systemQuestions = res?.data?.system?.questions ?? [];
  const systemBanks = res?.data?.system?.questionBanks ?? [];
  const myQuestions = res?.data?.mine?.questions ?? [];
  const myBanks = res?.data?.mine?.questionBanks ?? [];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">搜索</h1>
        <p className="text-sm text-muted-foreground">
          先搜系统精选；登录后会额外展示你的题库与题目。
        </p>
      </div>

      <form className="relative max-w-2xl" action="/search" method="GET">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          name="q"
          defaultValue={q}
          placeholder="搜索题目/题库..."
          className="pl-10 h-11"
        />
      </form>

      {!q ? (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>输入关键词开始搜索</CardTitle>
            <CardDescription>支持标题与标签的模糊匹配。</CardDescription>
          </CardHeader>
        </Card>
      ) : !res ? (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>服务暂不可用</CardTitle>
            <CardDescription>请稍后刷新再试。</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">系统题目</CardTitle>
                <CardDescription>优先展示内置内容</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/explore/questions?q=${encodeURIComponent(q)}`}>
                  更多
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {systemQuestions.length > 0 ? (
                systemQuestions.map((it: any) => {
                  const tags = parseTags(it.tags).slice(0, 2);
                  return (
                    <div key={it.id} className="rounded-xl border p-3">
                      <Link
                        href={`/explore/questions/${it.id}`}
                        className="font-medium hover:underline"
                      >
                        {highlight(it.title, q)}
                      </Link>
                      <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {highlight(it.content, q)}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {tags.map((t) => (
                          <Button
                            key={t}
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-6 rounded-full border px-2 text-xs"
                          >
                            <Link href={`/search?q=${encodeURIComponent(t)}`}>
                              {t}
                            </Link>
                          </Button>
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-muted-foreground">暂无匹配</div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">系统题库</CardTitle>
                <CardDescription>优先展示内置内容</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link
                  href={`/explore/question-banks?q=${encodeURIComponent(q)}`}
                >
                  更多
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {systemBanks.length > 0 ? (
                systemBanks.map((b: any) => (
                  <div key={b.id} className="rounded-xl border p-3">
                    <Link
                      href={`/explore/question-banks/${b.id}`}
                      className="font-medium hover:underline"
                    >
                      {highlight(b.title, q)}
                    </Link>
                    <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {b.description ? highlight(b.description, q) : "暂无描述"}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      题目数：{b.questionCount ?? 0}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">暂无匹配</div>
              )}
            </CardContent>
          </Card>

          {res?.data?.mine ? (
            <>
              <Card className="shadow-sm lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">我的内容</CardTitle>
                  <CardDescription>你的题目与题库</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <div className="text-sm font-medium">我的题目</div>
                    {myQuestions.length > 0 ? (
                      myQuestions.map((it: any) => (
                        <div key={it.id} className="rounded-xl border p-3">
                          <Link
                            href={`/questions/${it.id}`}
                            className="font-medium hover:underline"
                          >
                            {highlight(it.title, q)}
                          </Link>
                          <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                            {highlight(it.content, q)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        暂无匹配
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">我的题库</div>
                    {myBanks.length > 0 ? (
                      myBanks.map((b: any) => (
                        <div key={b.id} className="rounded-xl border p-3">
                          <Link
                            href={`/question-banks/${b.id}`}
                            className="font-medium hover:underline"
                          >
                            {highlight(b.title, q)}
                          </Link>
                          <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                            {b.description
                              ? highlight(b.description, q)
                              : "暂无描述"}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        暂无匹配
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
