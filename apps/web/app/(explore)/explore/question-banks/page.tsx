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
import { formatDate } from "@/lib/utils";

function normalizeSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
) {
  const qRaw = searchParams?.q;
  const q = Array.isArray(qRaw) ? qRaw[0] : qRaw;
  return { q: (q ?? "").trim() };
}

export default async function ExploreQuestionBanksPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { q } = normalizeSearchParams(resolvedSearchParams);

  const res = await safeTrpcQuery("explore.questionBanks.list", {
    page: 1,
    pageSize: 50,
    title: q ? q : undefined,
  });

  if (!res) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>服务暂不可用</CardTitle>
          <CardDescription>请稍后刷新再试。</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const items = res?.data?.items ?? [];
  const pagination = res?.data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">精选题库</h1>
          <p className="text-sm text-muted-foreground">
            系统内置题库，开箱即用。
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {pagination ? `共 ${pagination.total} 个` : ""}
        </div>
      </div>

      <form
        className="relative max-w-md"
        action="/explore/question-banks"
        method="GET"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          name="q"
          defaultValue={q}
          placeholder="搜索题库..."
          className="pl-10 h-11"
        />
      </form>

      <Card className="shadow-sm">
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
                    更新时间
                  </th>
                  <th className="px-4 py-3 font-medium w-24" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.length > 0 ? (
                  items.map((b: any) => (
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
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {formatDate(b.updateTime)}
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
                      colSpan={4}
                    >
                      {q ? "未找到匹配题库" : "暂无题库"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
