import Link from "next/link";
import { Plus, Search, Trash2 } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from "@repo/ui";
import { trpcQuery } from "@/lib/trpc/server";
import { formatDate } from "@/lib/utils";

function normalizeSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
) {
  const qRaw = searchParams?.q;
  const q = Array.isArray(qRaw) ? qRaw[0] : qRaw;
  return { q: (q ?? "").trim() };
}

export default async function QuestionBanksPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { q } = normalizeSearchParams(resolvedSearchParams);

  const res = await trpcQuery("questionBank.listWithQuestionCount", {
    page: 1,
    pageSize: 50,
    title: q ? q : undefined,
  });

  const items = res?.data?.items ?? [];
  const pagination = res?.data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            题库列表
          </h1>
          <p className="text-muted-foreground mt-2">
            管理和查看所有题库
            {pagination
              ? `（第 ${pagination.page} / ${pagination.totalPages} 页）`
              : ""}
          </p>
        </div>
        <Button asChild className="shadow-md">
          <Link href="/question-banks/new">
            <Plus className="w-4 h-4 mr-2" />
            新增题库
          </Link>
        </Button>
      </div>

      <form className="relative max-w-md" action="/question-banks" method="GET">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="搜索题库..."
          name="q"
          defaultValue={q}
          className="pl-10 h-11"
        />
      </form>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">列表</CardTitle>
            <CardDescription>
              共 {pagination?.total ?? items.length} 个
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
                  <th className="px-4 py-3 font-medium whitespace-nowrap">
                    题目数
                  </th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">
                    创建时间
                  </th>
                  <th className="px-4 py-3 font-medium w-40 text-right">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.length > 0 ? (
                  items.map((bank: any) => (
                    <tr key={bank.id} className="hover:bg-accent/30">
                      <td className="px-4 py-3">
                        <Link
                          href={`/question-banks/${bank.id}`}
                          className="font-medium hover:underline"
                        >
                          {bank.title}
                        </Link>
                        <div className="text-xs text-muted-foreground line-clamp-1 mt-1">
                          {bank.description || "暂无描述"}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {bank.questionCount ?? 0}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {formatDate(bank.createTime)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/question-banks/${bank.id}`}>
                              查看
                            </Link>
                          </Button>
                          <form
                            action={`/question-banks/${bank.id}/delete`}
                            method="POST"
                          >
                            {q ? (
                              <input
                                type="hidden"
                                name="redirect"
                                value={`/question-banks?q=${encodeURIComponent(q)}`}
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
