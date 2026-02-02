"use client";

import { trpc } from "@/lib/trpc/client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BookOpen, Loader2, Plus, Search, Trash2 } from "lucide-react";
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

export default function QuestionBanksPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const utils = trpc.useUtils?.();

  const { data, isLoading, error, isFetching } =
    trpc.questionBank.listWithQuestionCount.useQuery({
      page: 1,
      pageSize: 50,
      title: searchQuery.trim() ? searchQuery.trim() : undefined,
    });

  const items = data?.data?.items ?? EMPTY_ITEMS;
  const pagination = data?.data?.pagination;

  const deleteMutation = trpc.questionBanks.delete.useMutation({
    onSuccess() {
      toast.success("已删除");
      void utils?.questionBank?.listWithQuestionCount?.invalidate?.();
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
      const desc = String(it.description ?? "").toLowerCase();
      return title.includes(q) || desc.includes(q);
    });
  }, [items, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground">加载题库列表...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-destructive"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3L21 12c0 1.103-.884 2-1.972 2z"
            />
          </svg>
        </div>
        <p className="text-destructive font-medium">加载题库列表失败</p>
        <p className="text-sm text-muted-foreground mt-2">
          {(error as any).message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部区域 */}
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

      {/* 搜索框 */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="搜索题库..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-11"
        />
      </div>

      {/* 统计信息 */}
      {visibleItems.length > 0 && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>当前 {visibleItems.length} 个</span>
          {isFetching && <span>• 更新中...</span>}
        </div>
      )}

      {/* 题库网格 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {visibleItems.length > 0 ? (
          visibleItems.map((bank: any) => (
            <Card
              key={bank.id}
              className="shadow-md hover:shadow-xl transition-all border-border/50 flex flex-col"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-semibold shadow-md">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/question-banks/${bank.id}`}>
                        <CardTitle className="text-lg hover:text-primary transition-colors line-clamp-1">
                          {bank.title}
                        </CardTitle>
                      </Link>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge
                          variant="outline"
                          className="bg-primary/10 text-primary border-primary/20"
                        >
                          {bank.questionCount ?? 0} 题
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        const ok = window.confirm("确定删除这个题库吗？");
                        if (!ok) return;
                        deleteMutation.mutate({ id: Number(bank.id) });
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed min-h-[3.75rem]">
                  {bank.description || "暂无描述"}
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <div className="text-xs text-muted-foreground">
                    {bank.updateTime
                      ? `更新于 ${new Date(bank.updateTime).toLocaleString()}`
                      : ""}
                  </div>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="text-primary hover:bg-primary/10"
                  >
                    <Link href={`/question-banks/${bank.id}`}>查看详情</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="md:col-span-2 lg:col-span-3 shadow-md">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <BookOpen className="w-10 h-10 text-muted-foreground/60" />
              </div>
              <CardDescription className="text-base mb-4">
                {searchQuery ? "没有找到匹配的题库" : "暂无题库"}
              </CardDescription>
              {!searchQuery && (
                <Button asChild className="shadow-md" variant="outline">
                  <Link href="/question-banks/new">
                    <Plus className="w-4 h-4 mr-2" />
                    创建第一个题库
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
