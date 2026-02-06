import Link from "next/link";
import { Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui";
import { trpcQuery } from "@/lib/trpc/server";
import { formatDate, parseTags } from "@/lib/utils";

export async function QuestionsList({ q }: { q: string }) {
  // 人为制造延迟以展示 Suspense 效果（可选，但对于演示很有用，这里暂不加）
  const res = await trpcQuery("questions.list", {
    page: 1,
    pageSize: 50,
    title: q ? q : undefined,
  });

  const items = res?.data?.items ?? [];
  const pagination = res?.data?.pagination;

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">列表</CardTitle>
          <CardDescription>
            共 {pagination?.total ?? items.length} 道
          </CardDescription>
        </div>
        <div className="text-xs text-muted-foreground">
          {q ? `关键词：${q}` : ""}
        </div>
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
                <th className="px-4 py-3 font-medium w-40 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.length > 0 ? (
                items.map((question: any) => {
                  const tags = parseTags(question.tags).slice(0, 2);
                  return (
                    <tr key={question.id} className="hover:bg-accent/30">
                      <td className="px-4 py-3">
                        <Link
                          href={`/questions/${question.id}`}
                          className="font-medium hover:underline"
                        >
                          {question.title}
                        </Link>
                        <div className="text-xs text-muted-foreground line-clamp-1 mt-1">
                          {question.content}
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
                        {formatDate(question.createTime)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/questions/${question.id}`}>查看</Link>
                          </Button>
                          <form
                            action={`/questions/${question.id}/delete`}
                            method="POST"
                          >
                            {q ? (
                              <input
                                type="hidden"
                                name="redirect"
                                value={`/questions?q=${encodeURIComponent(q)}`}
                              />
                            ) : null}
                            <Button
                              size="sm"
                              variant="destructive"
                              type="submit"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              删除
                            </Button>
                          </form>
                        </div>
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
  );
}
