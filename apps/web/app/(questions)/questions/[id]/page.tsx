"use client";

import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import { Badge } from "@repo/ui";
import { Button } from "@repo/ui";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { PageMessage, PageSpinner } from "@/components/states";
import { parseTags } from "@/lib/utils";

const ConfirmButton = dynamic(
  () => import("@/components/confirm-button").then((m) => m.ConfirmButton),
  { ssr: false },
);

export default function QuestionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number((params as any)?.id);
  const utils = trpc.useUtils?.();
  const deleteMutation = trpc.questions.delete.useMutation({
    async onSuccess() {
      const { toast } = await import("sonner");
      toast.success("已删除");
      void utils?.questions?.list?.invalidate?.();
      router.replace("/questions");
    },
    async onError(err: any) {
      const { toast } = await import("sonner");
      toast.error(err?.message ?? "删除失败");
    },
  });

  const {
    data: questionRes,
    isLoading,
    error,
  } = trpc.questions.getById.useQuery(
    {
      id: Number.isFinite(id) ? id : 0,
    },
    { enabled: Number.isFinite(id) && id > 0 },
  );

  const question = questionRes?.data;

  if (isLoading) {
    return <PageSpinner label="加载题目详情..." />;
  }

  if (error) {
    return (
      <PageMessage
        tone="danger"
        title="加载题目详情失败"
        description={(error as any).message}
        actionLabel="返回列表"
        actionHref="/questions"
      />
    );
  }

  if (!question) {
    return (
      <PageMessage
        title="题目不存在"
        description="可能已被删除，或链接不正确。"
        actionLabel="返回列表"
        actionHref="/questions"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/questions">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">题目详情</h1>
          <p className="text-muted-foreground mt-2">查看题目完整信息</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href={`/questions/${question.id}/edit`}>
              <Pencil className="w-4 h-4 mr-2" />
              编辑
            </Link>
          </Button>
          <ConfirmButton
            title="确定删除这道题吗？"
            description="此操作不可撤销。"
            confirmText="删除"
            triggerVariant="destructive"
            confirmVariant="destructive"
            pending={deleteMutation.isPending}
            onConfirm={() => deleteMutation.mutate({ id: Number(question.id) })}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            删除
          </ConfirmButton>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{question.title}</CardTitle>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/20"
                >
                  {question.answer ? "有答案" : "待补充"}
                </Badge>
                {question.questionBankId ? (
                  <Badge variant="outline">
                    题库 #{question.questionBankId}
                  </Badge>
                ) : null}
                {parseTags(question.tags).map((t) => (
                  <Badge key={t} variant="outline" className="bg-muted/50">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">题目内容</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {question.content}
            </p>
          </div>

          {question.answer && (
            <div>
              <h3 className="font-semibold mb-2">答案</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {question.answer}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
