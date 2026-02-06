import Link from "next/link";
import {
  Badge,
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
import { formatDate, parseTags } from "@/lib/utils";

function normalizeSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
) {
  const qRaw = searchParams?.q;
  const q = Array.isArray(qRaw) ? qRaw[0] : qRaw;
  return { q: (q ?? "").trim() };
}

export default async function ExploreQuestionsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { q } = normalizeSearchParams(resolvedSearchParams);

  const res = await safeTrpcQuery("explore.questions.list", {
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
          <h1 className="text-3xl font-semibold tracking-tight">精选题目</h1>
          <p className="text-sm text-muted-foreground">
            系统内置题目，直接开始刷。
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {pagination ? `共 ${pagination.total} 道` : ""}
        </div>
      </div>

      <form
        className="relative max-w-md"
        action="/explore/questions"
        method="GET"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          name="q"
          defaultValue={q}
          placeholder="搜索题目..."
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
                  <th className="px-4 py-3 font-medium">标签</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">
                    更新时间
                  </th>
                  <th className="px-4 py-3 font-medium w-24" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.length > 0 ? (
                  items.map((qItem: any) => {
                    const tags = parseTags(qItem.tags).slice(0, 2);
                    return (
                      <tr key={qItem.id} className="hover:bg-accent/30">
                        <td className="px-4 py-3">
                          <Link
                            href={`/explore/questions/${qItem.id}`}
                            className="font-medium hover:underline"
                          >
                            {qItem.title}
                          </Link>
                          <div className="text-xs text-muted-foreground line-clamp-1 mt-1">
                            {qItem.content}
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
                          {formatDate(qItem.updateTime)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/explore/questions/${qItem.id}`}>
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
                      colSpan={4}
                    >
                      {q ? "未找到匹配题目" : "暂无题目"}
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
