"use client";

import { trpc } from "@/lib/trpc/client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { PageMessage, PageSpinner } from "@/components/states";
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

const EMPTY_ITEMS: any[] = [];

export default function QuestionsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const utils = trpc.useUtils?.();

  const { data, isLoading, error, isFetching } = trpc.questions.list.useQuery({
    page: 1,
    pageSize: 50,
    title: searchQuery.trim() ? searchQuery.trim() : undefined,
  });

  const items = data?.data?.items ?? EMPTY_ITEMS;
  const pagination = data?.data?.pagination;

  const deleteMutation = trpc.questions.delete.useMutation({
    onSuccess() {
      toast.success("已删除");
      void utils?.questions?.list?.invalidate?.();
    },
    onError(err: any) {
      toast.error(err?.message ?? "删除失败");
    },
  });

  const visibleItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it: any) => {
      const title = String(it.title ?? "").toLowerCase();
      const content = String(it.content ?? "").toLowerCase();
      return title.includes(q) || content.includes(q);
    });
  }, [items, searchQuery]);

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

  if (isLoading) {
    return <PageSpinner label="加载题目列表..." />;
  }

  if (error) {
    return (
      <PageMessage
        tone="danger"
        title="加载题目列表失败"
        description={(error as any).message}
        actionLabel="返回仪表盘"
        actionHref="/dashboard"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部区域 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            题目列表
          </h1>
          <p className="text-muted-foreground mt-2">
            管理和查看所有面试题目
            {pagination
              ? `（第 ${pagination.page} / ${pagination.totalPages} 页）`
              : ""}
          </p>
        </div>
        <Button asChild className="shadow-md">
          <Link href="/questions/new">
            <Plus className="w-4 h-4 mr-2" />
            新增题目
          </Link>
        </Button>
      </div>

      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="搜索题目..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-11"
        />
      </div>

      {/* 统计信息 */}
      {visibleItems.length > 0 && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>当前 {visibleItems.length} 道</span>
          {isFetching && <span>• 更新中...</span>}
        </div>
      )}

      {/* 题目列表 */}
      <div className="grid gap-4">
        {visibleItems.length > 0 ? (
          visibleItems.map((question: any, index: number) => {
            const tags = parseTags(question.tags);
            return (
              <Card
                key={question.id}
                className="shadow-md hover:shadow-lg transition-all border-border/50"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link href={`/questions/${question.id}`}>
                            <CardTitle className="text-lg hover:text-primary transition-colors line-clamp-1">
                              {question.title}
                            </CardTitle>
                          </Link>
                          <div className="mt-3 flex flex-wrap gap-2">
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
                            {tags.slice(0, 3).map((t: string) => (
                              <Badge
                                key={t}
                                variant="outline"
                                className="bg-muted/50"
                              >
                                {t}
                              </Badge>
                            ))}
                            {tags.length > 3 ? (
                              <Badge variant="outline" className="bg-muted/50">
                                +{tags.length - 3}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 hover:bg-primary/10 hover:text-primary"
                      >
                        <Link href={`/questions/${question.id}/edit`}>
                          <Pencil className="w-4 h-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => {
                          const ok = window.confirm("确定删除这道题吗？");
                          if (!ok) return;
                          deleteMutation.mutate({ id: Number(question.id) });
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
                    {question.content}
                  </p>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="shadow-md">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <svg
                  className="w-10 h-10 text-muted-foreground/60"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <CardDescription className="text-base mb-4">
                {searchQuery ? "没有找到匹配的题目" : "暂无题目"}
              </CardDescription>
              {!searchQuery && (
                <Button asChild className="shadow-md" variant="outline">
                  <Link href="/questions/new">
                    <Plus className="w-4 h-4 mr-2" />
                    创建第一个题目
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
