"use client";

import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import { Badge } from "@repo/ui";
import { Button } from "@repo/ui";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { PageMessage, PageSpinner } from "@/components/states";

export default function QuestionBankDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number((params as any)?.id);
  const utils = trpc.useUtils?.();
  const [searchTitle, setSearchTitle] = useState("");

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

  const questionsQuery = trpc.questionBanks.getQuestions.useQuery(
    { questionBankId: Number.isFinite(id) ? id : 0, page: 1, pageSize: 50 },
    { enabled: !!bank },
  );

  const searchQuery = trpc.questions.list.useQuery(
    {
      page: 1,
      pageSize: 20,
      title: searchTitle.trim() ? searchTitle.trim() : undefined,
    },
    { enabled: !!bank && !!searchTitle.trim() },
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
    onSuccess(res: any) {
      toast.success(res?.message ?? "已添加");
      setSearchTitle("");
      void utils?.questions?.list?.invalidate?.();
      void utils?.questionBanks?.getQuestions?.invalidate?.({
        questionBankId: id,
        page: 1,
        pageSize: 50,
      });
      void utils?.questionBank?.listWithQuestionCount?.invalidate?.();
    },
    onError(err: any) {
      toast.error(err?.message ?? "添加失败");
    },
  });

  const removeMutation = trpc.questionBanks.removeQuestion.useMutation({
    onSuccess(res: any) {
      toast.success(res?.message ?? "已移除");
      void utils?.questionBanks?.getQuestions?.invalidate?.({
        questionBankId: id,
        page: 1,
        pageSize: 50,
      });
      void utils?.questionBank?.listWithQuestionCount?.invalidate?.();
    },
    onError(err: any) {
      toast.error(err?.message ?? "移除失败");
    },
  });

  const deleteBankMutation = trpc.questionBanks.delete.useMutation({
    onSuccess() {
      toast.success("题库已删除");
      void utils?.questionBank?.listWithQuestionCount?.invalidate?.();
      router.replace("/question-banks");
    },
    onError(err: any) {
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
        <Button
          variant="destructive"
          disabled={deleteBankMutation.isPending}
          onClick={() => {
            const ok = window.confirm(
              "确定删除这个题库吗？题库内题目不会被删除。",
            );
            if (!ok) return;
            deleteBankMutation.mutate({ id: Number(bank.id) });
          }}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          删除题库
        </Button>
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
                              questionBankId: Number(bank.id),
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={removeMutation.isPending}
                    onClick={() => {
                      const ok = window.confirm("从题库移除该题目？");
                      if (!ok) return;
                      removeMutation.mutate({
                        questionBankId: Number(bank.id),
                        questionId: Number(q.id),
                      });
                    }}
                  >
                    移除
                  </Button>
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
    </div>
  );
}
