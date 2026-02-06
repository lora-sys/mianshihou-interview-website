"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import { BookOpen, Loader2 } from "lucide-react";

const ConfirmButton = dynamic(
  () => import("@/components/confirm-button").then((m) => m.ConfirmButton),
  { ssr: false },
);

export function QuestionBankQuestionsPanel({
  questionBankId,
}: {
  questionBankId: number;
}) {
  const utils = trpc.useUtils?.();
  const [searchTitle, setSearchTitle] = useState("");

  const questionsQuery = trpc.questionBanks.getQuestions.useQuery(
    { questionBankId, page: 1, pageSize: 50 },
    { enabled: Number.isFinite(questionBankId) && questionBankId > 0 },
  );

  const searchQuery = trpc.questions.list.useQuery(
    {
      page: 1,
      pageSize: 20,
      title: searchTitle.trim() ? searchTitle.trim() : undefined,
    },
    {
      enabled:
        Number.isFinite(questionBankId) &&
        questionBankId > 0 &&
        !!searchTitle.trim(),
    },
  );

  const inBankIds = useMemo(() => {
    const items = questionsQuery.data?.data?.items ?? [];
    return new Set<number>(
      items
        .map((q: any) => Number(q.id))
        .filter((n: number) => Number.isFinite(n)),
    );
  }, [questionsQuery.data?.data?.items]);

  const candidates = useMemo(() => {
    if (!searchTitle.trim()) return [];
    const items = searchQuery.data?.data?.items ?? [];
    return items.filter((q: any) => {
      const qid = Number(q.id);
      if (!Number.isFinite(qid)) return false;
      return !inBankIds.has(qid);
    });
  }, [inBankIds, searchQuery.data?.data?.items, searchTitle]);

  const addMutation = trpc.questionBanks.addQuestion.useMutation({
    async onSuccess(res: any) {
      const { toast } = await import("sonner");
      toast.success(res?.message ?? "已添加");
      setSearchTitle("");
      void utils?.questions?.list?.invalidate?.();
      void utils?.questionBanks?.getQuestions?.invalidate?.({
        questionBankId,
        page: 1,
        pageSize: 50,
      });
      void utils?.questionBank?.listWithQuestionCount?.invalidate?.();
    },
    async onError(err: any) {
      const { toast } = await import("sonner");
      toast.error(err?.message ?? "添加失败");
    },
  });

  const removeMutation = trpc.questionBanks.removeQuestion.useMutation({
    async onSuccess(res: any) {
      const { toast } = await import("sonner");
      toast.success(res?.message ?? "已移除");
      void utils?.questionBanks?.getQuestions?.invalidate?.({
        questionBankId,
        page: 1,
        pageSize: 50,
      });
      void utils?.questionBank?.listWithQuestionCount?.invalidate?.();
    },
    async onError(err: any) {
      const { toast } = await import("sonner");
      toast.error(err?.message ?? "移除失败");
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>题库中的题目</CardTitle>
          <Button asChild size="sm" variant="outline">
            <Link href="/questions/new">新建题目</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 rounded-xl border bg-background/40 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-medium">添加题目到题库</div>
            <div className="text-xs text-muted-foreground">
              搜索后点击“添加”即可
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={searchTitle}
              onChange={(e) => setSearchTitle(e.target.value)}
              placeholder="按标题关键词搜索题目..."
              className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button
              type="button"
              variant="ghost"
              className="h-10"
              disabled={!searchTitle.trim()}
              onClick={() => setSearchTitle("")}
            >
              清空
            </Button>
          </div>

          {searchTitle.trim() ? (
            <div className="mt-3">
              {searchQuery.isLoading ? (
                <div className="space-y-2">
                  <div className="h-11 w-full rounded-xl bg-muted animate-pulse" />
                  <div className="h-11 w-full rounded-xl bg-muted animate-pulse" />
                </div>
              ) : candidates.length > 0 ? (
                <div className="space-y-2">
                  {candidates.map((q: any) => (
                    <div
                      key={q.id}
                      className="flex items-start justify-between gap-3 rounded-xl border bg-background/40 p-3"
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
                      <Button
                        size="sm"
                        disabled={addMutation.isPending}
                        onClick={() =>
                          addMutation.mutate({
                            questionBankId,
                            questionId: Number(q.id),
                          })
                        }
                      >
                        添加
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border bg-background/40 p-4 text-sm text-muted-foreground">
                  没有可添加的题目（可能都已在题库中，或没有匹配结果）。
                </div>
              )}
            </div>
          ) : null}
        </div>

        {questionsQuery.isLoading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            加载题目中...
          </div>
        ) : (questionsQuery.data?.data?.items?.length ?? 0) > 0 ? (
          <div className="space-y-3">
            {(questionsQuery.data?.data?.items ?? []).map((q: any) => (
              <div
                key={q.id}
                className="flex items-start justify-between gap-3 rounded-xl border bg-background/40 p-3"
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
                <ConfirmButton
                  title="从题库移除该题目？"
                  description="仅从当前题库移除，不会删除题目本身。"
                  confirmText="移除"
                  triggerVariant="ghost"
                  triggerSize="sm"
                  triggerClassName="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  confirmVariant="destructive"
                  pending={removeMutation.isPending}
                  onConfirm={() =>
                    removeMutation.mutate({
                      questionBankId,
                      questionId: Number(q.id),
                    })
                  }
                >
                  移除
                </ConfirmButton>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>该题库暂无题目</p>
            <p className="mt-2 text-xs">使用上方搜索框添加题目。</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
