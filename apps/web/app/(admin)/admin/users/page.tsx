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

function normalizeSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
) {
  const qRaw = searchParams?.q;
  const pageRaw = searchParams?.page;
  const q = Array.isArray(qRaw) ? qRaw[0] : qRaw;
  const pageStr = Array.isArray(pageRaw) ? pageRaw[0] : pageRaw;
  const page = Number(pageStr ?? "1");
  return {
    q: (q ?? "").trim(),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

function formatDateTime(value: any) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("zh-CN");
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { q, page } = normalizeSearchParams(resolvedSearchParams);

  const res = await trpcQuery("users.list", {
    page,
    pageSize: 50,
    keyword: q ? q : undefined,
  });

  const items = res?.data?.items ?? [];
  const pagination = res?.data?.pagination;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">用户管理</h2>
          <p className="text-sm text-muted-foreground">
            搜索、查看与删除用户（删除为软删）。
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {pagination
            ? `第 ${pagination.page} / ${pagination.totalPages} 页`
            : ""}
        </div>
      </div>

      <form className="relative max-w-md" action="/admin/users" method="GET">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          name="q"
          defaultValue={q}
          placeholder="按昵称搜索..."
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
                  <th className="px-4 py-3 font-medium">昵称</th>
                  <th className="px-4 py-3 font-medium">邮箱</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">
                    角色
                  </th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">
                    状态
                  </th>
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
                  items.map((u: any) => (
                    <tr key={u.id} className="hover:bg-accent/30">
                      <td className="px-4 py-3">
                        <div className="font-medium">{u.userName || "-"}</div>
                        <div className="text-xs text-muted-foreground">
                          {u.userAccount || u.id}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {u.email || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{u.userRole}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{u.status}</Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {formatDateTime(u.createTime)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/admin/users/${u.id}`}>查看</Link>
                          </Button>
                          <form
                            action={`/admin/users/${u.id}/set-status`}
                            method="POST"
                          >
                            <input
                              type="hidden"
                              name="redirect"
                              value={
                                q
                                  ? `/admin/users?q=${encodeURIComponent(q)}`
                                  : "/admin/users"
                              }
                            />
                            <input
                              type="hidden"
                              name="status"
                              value={
                                u.status === "active" ? "disabled" : "active"
                              }
                            />
                            <Button size="sm" variant="outline" type="submit">
                              {u.status === "active" ? "禁用" : "解禁"}
                            </Button>
                          </form>
                          <form
                            id={`admin-user-delete-${u.id}`}
                            action={`/admin/users/${u.id}/delete`}
                            method="POST"
                          >
                            <input
                              type="hidden"
                              name="redirect"
                              value={
                                q
                                  ? `/admin/users?q=${encodeURIComponent(q)}`
                                  : "/admin/users"
                              }
                            />
                            <ConfirmSubmit
                              formId={`admin-user-delete-${u.id}`}
                              title="确定删除该用户吗？"
                              description="此操作不可撤销。"
                              confirmText="删除"
                              triggerVariant="destructive"
                              triggerSize="sm"
                              confirmVariant="destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              删除
                            </ConfirmSubmit>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      className="px-4 py-10 text-center text-muted-foreground"
                      colSpan={6}
                    >
                      {q ? "未找到匹配用户" : "暂无用户"}
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
