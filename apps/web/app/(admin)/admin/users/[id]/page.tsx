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
import { trpcQuery } from "@/lib/trpc/server";
import { formatDateTime } from "@/lib/utils";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await trpcQuery("users.byId", { id });
  const u = res?.data;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">用户详情</h2>
          <p className="text-sm text-muted-foreground">{u?.id ?? id}</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/users">返回列表</Link>
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>账号信息</CardTitle>
          <CardDescription>敏感字段已脱敏处理</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">昵称</span>
            <span className="font-medium">{u?.userName || "-"}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">账号</span>
            <span className="font-medium">{u?.userAccount || "-"}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">邮箱</span>
            <span className="font-medium">{u?.email || "-"}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">角色</span>
            <Badge variant="outline">{u?.userRole || "-"}</Badge>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">状态</span>
            <Badge variant="outline">{u?.status || "-"}</Badge>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">创建时间</span>
            <span className="text-muted-foreground">
              {formatDateTime(u?.createTime)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">更新时间</span>
            <span className="text-muted-foreground">
              {formatDateTime(u?.updateTime)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>危险操作</CardTitle>
          <CardDescription>
            删除为软删。建议先做禁用/解禁能力再开放删除。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={`/admin/users/${id}/delete`} method="POST">
            <input type="hidden" name="redirect" value="/admin/users" />
            <Button type="submit" variant="destructive">
              删除用户
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>角色与状态</CardTitle>
          <CardDescription>仅管理员可修改。角色变更立即生效。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            action={`/admin/users/${id}/set-role`}
            method="POST"
            className="flex items-center gap-2"
          >
            <input type="hidden" name="redirect" value={`/admin/users/${id}`} />
            <select
              name="role"
              defaultValue={u?.userRole ?? "user"}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
            <Button type="submit" size="sm" variant="outline">
              更新角色
            </Button>
          </form>

          <form
            action={`/admin/users/${id}/set-status`}
            method="POST"
            className="flex items-center gap-2"
          >
            <input type="hidden" name="redirect" value={`/admin/users/${id}`} />
            <select
              name="status"
              defaultValue={u?.status ?? "active"}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="active">active</option>
              <option value="disabled">disabled</option>
            </select>
            <Button type="submit" size="sm" variant="outline">
              更新状态
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
