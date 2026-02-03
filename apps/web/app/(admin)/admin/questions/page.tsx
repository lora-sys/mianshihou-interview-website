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
import { trpcQuery } from "@/lib/trpc/server";
import { Search, Trash2 } from "lucide-react";
import { ConfirmSubmit } from "@/components/dialog/confirm-submit";
import { ConfirmFormAction } from "@/components/dialog/confirm-form-action";

function normalizeSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
) {
  const qRaw = searchParams?.q;
  const uidRaw = searchParams?.userId;
  const noticeRaw = searchParams?.notice;
  const errorRaw = searchParams?.error;
  const q = Array.isArray(qRaw) ? qRaw[0] : qRaw;
  const userId = Array.isArray(uidRaw) ? uidRaw[0] : uidRaw;
  const notice = Array.isArray(noticeRaw) ? noticeRaw[0] : noticeRaw;
  const error = Array.isArray(errorRaw) ? errorRaw[0] : errorRaw;
  return {
    q: (q ?? "").trim(),
    userId: (userId ?? "").trim(),
    notice: (notice ?? "").trim(),
    error: (error ?? "").trim(),
  };
}

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

function formatDate(value: any) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("zh-CN");
}

export default async function AdminQuestionsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { q, userId, notice, error } =
    normalizeSearchParams(resolvedSearchParams);

  const res = await trpcQuery("questions.list", {
    page: 1,
    pageSize: 50,
    title: q ? q : undefined,
    userId: userId ? userId : undefined,
  });

  const items = res?.data?.items ?? [];
  const pagination = res?.data?.pagination;

  return (
    <div className="space-y-4">
      {notice || error ? (
        <div
          className={
            error
              ? "rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm"
              : "rounded-xl border bg-muted/30 px-4 py-3 text-sm"
          }
        >
          {error === "batch-delete-failed"
            ? "批量删除失败，请稍后重试。"
            : notice === "no-selection"
              ? "未选择任何条目。"
              : notice === "batch-deleted"
                ? "批量删除已提交。"
                : null}
        </div>
      ) : null}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">题目管理</h2>
          <p className="text-sm text-muted-foreground">
            全局列表、按用户过滤、单删与批量删除。
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {pagination
            ? `第 ${pagination.page} / ${pagination.totalPages} 页`
            : ""}
        </div>
      </div>

      <form
        className="grid gap-2 md:grid-cols-2"
        action="/admin/questions"
        method="GET"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={q}
            placeholder="按标题搜索..."
            className="pl-10 h-11"
          />
        </div>
        <Input
          name="userId"
          defaultValue={userId}
          placeholder="按用户 ID 过滤（可选）"
          className="h-11"
        />
      </form>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">列表</CardTitle>
            <CardDescription>
              共 {pagination?.total ?? items.length} 道
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/questions">用户侧题目</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <form
            id="admin-questions-batch-delete"
            action="/admin/questions/batch-delete"
            method="POST"
          >
            <input
              type="hidden"
              name="redirect"
              value={
                userId || q
                  ? `/admin/questions?${new URLSearchParams({
                      ...(q ? { q } : {}),
                      ...(userId ? { userId } : {}),
                    }).toString()}`
                  : "/admin/questions"
              }
            />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-t bg-muted/40">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-medium w-12">
                      <span className="text-muted-foreground">选</span>
                    </th>
                    <th className="px-4 py-3 font-medium">标题</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">
                      用户
                    </th>
                    <th className="px-4 py-3 font-medium">标签</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">
                      创建时间
                    </th>
                    <th className="px-4 py-3 font-medium w-44 text-right">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.length > 0 ? (
                    items.map((it: any) => {
                      const tags = parseTags(it.tags).slice(0, 2);
                      return (
                        <tr key={it.id} className="hover:bg-accent/30">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              name="ids"
                              value={String(it.id)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/questions/${it.id}`}
                              className="font-medium hover:underline"
                            >
                              {it.title}
                            </Link>
                            <div className="text-xs text-muted-foreground line-clamp-1 mt-1">
                              {it.content}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                            {it.userId || "-"}
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
                            {formatDate(it.createTime)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <Button asChild size="sm" variant="outline">
                                <Link href={`/questions/${it.id}`}>查看</Link>
                              </Button>
                              <ConfirmFormAction
                                title="确定删除该题目吗？"
                                description="此操作不可撤销。"
                                confirmText="删除"
                                triggerVariant="destructive"
                                triggerSize="sm"
                                confirmVariant="destructive"
                                formAction={`/admin/questions/${it.id}/delete`}
                                formMethod="post"
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                删除
                              </ConfirmFormAction>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        className="px-4 py-10 text-center text-muted-foreground"
                        colSpan={6}
                      >
                        {q || userId ? "未找到匹配题目" : "暂无题目"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="border-t bg-background px-4 py-3 flex justify-end">
              <ConfirmSubmit
                formId="admin-questions-batch-delete"
                title="批量删除已勾选题目？"
                description="此操作不可撤销。"
                confirmText="批量删除"
                triggerVariant="destructive"
                triggerSize="sm"
                confirmVariant="destructive"
              >
                批量删除（已勾选）
              </ConfirmSubmit>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
