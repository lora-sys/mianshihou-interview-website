import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui";
import { safeTrpcBatchQuery } from "@/lib/trpc/server";
import { parseTags } from "@/lib/utils";

export default async function ExploreQuestionBankDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idRaw } = await params;
  const id = Number(idRaw);

  const [bankRes, questionsRes] = await safeTrpcBatchQuery([
    { path: "explore.questionBanks.getById", input: { id } },
    {
      path: "explore.questionBanks.getQuestions",
      input: { questionBankId: id, page: 1, pageSize: 50 },
    },
  ]);

  if (!bankRes || !questionsRes) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>服务暂不可用</CardTitle>
          <CardDescription>请稍后刷新再试。</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const bank = bankRes?.data;
  const items = questionsRes?.data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">
            {bank?.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {bank?.description || "暂无描述"}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/explore/question-banks">返回题库</Link>
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">题目列表</CardTitle>
            <CardDescription>共 {items.length} 道</CardDescription>
          </div>
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
                {items.length > 0 ? (
                  items.map((q: any) => {
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
    </div>
  );
}
