"use client";

import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import { Badge } from "@repo/ui";
import { Button } from "@repo/ui";
import { ArrowLeft, Calendar, Pencil, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { PageMessage, PageSpinner } from "@/components/states";
import { Suspense } from "react";

const ConfirmButton = dynamic(
  () => import("@/components/confirm-button").then((m) => m.ConfirmButton),
  { ssr: false },
);

const QuestionBankQuestionsPanel = dynamic(
  () =>
    import("./QuestionBankQuestionsPanel").then(
      (m) => m.QuestionBankQuestionsPanel,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border bg-card/60 p-4 text-sm text-muted-foreground">
        加载题目管理中...
      </div>
    ),
  },
);

export default function QuestionBankDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number((params as any)?.id);
  const utils = trpc.useUtils?.();

  const {
    data: bankRes,
    isLoading,
    error,
  } = trpc.questionBanks.getById.useQuery(
    {
      id: Number.isFinite(id) ? id : 0,
    },
    { enabled: Number.isFinite(id) && id > 0 },
  );

  const bank = bankRes?.data;

  const deleteBankMutation = trpc.questionBanks.delete.useMutation({
    async onSuccess() {
      const { toast } = await import("sonner");
      toast.success("题库已删除");
      void utils?.questionBank?.listWithQuestionCount?.invalidate?.();
      router.replace("/question-banks");
    },
    async onError(err: any) {
      const { toast } = await import("sonner");
      toast.error(err?.message ?? "删除失败");
    },
  });

  if (isLoading) {
    return <PageSpinner label="加载题库详情..." />;
  }

  if (error) {
    return (
      <PageMessage
        tone="danger"
        title="加载题库详情失败"
        description={(error as any).message}
        actionLabel="返回列表"
        actionHref="/question-banks"
      />
    );
  }

  if (!bank) {
    return (
      <PageMessage
        title="题库不存在"
        description="可能已被删除，或链接不正确。"
        actionLabel="返回列表"
        actionHref="/question-banks"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/question-banks">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">题库详情</h1>
          <p className="text-muted-foreground mt-2">查看题库完整信息</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/question-banks/${bank.id}/edit`}>
            <Pencil className="w-4 h-4 mr-2" />
            编辑
          </Link>
        </Button>
        <ConfirmButton
          title="确定删除这个题库吗？"
          description="题库内题目不会被删除。此操作不可撤销。"
          confirmText="删除题库"
          triggerVariant="destructive"
          confirmVariant="destructive"
          pending={deleteBankMutation.isPending}
          onConfirm={() => deleteBankMutation.mutate({ id: Number(bank.id) })}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          删除题库
        </ConfirmButton>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{bank.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">描述</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {bank.description || "暂无描述"}
            </p>
          </div>

          <div className="flex gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="bg-primary/10 text-primary border-primary/20"
              >
                {bank.questionCount ?? 0} 题
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>
                创建于{" "}
                {bank.createTime
                  ? new Date(bank.createTime).toLocaleDateString("zh-CN")
                  : "-"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Suspense
        fallback={
          <div className="rounded-2xl border bg-card/60 p-4 text-sm text-muted-foreground">
            加载题目管理中...
          </div>
        }
      >
        <QuestionBankQuestionsPanel questionBankId={bank.id} />
      </Suspense>
    </div>
  );
}
