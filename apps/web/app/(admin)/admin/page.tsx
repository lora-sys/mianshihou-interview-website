import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
} from "@repo/ui";
import { trpcQuery } from "@/lib/trpc/server";

export default async function AdminHomePage() {
  const usersRes = await trpcQuery("users.listWithStats", {});
  const stats = usersRes?.data ?? null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              用户总数
            </CardTitle>
            <div className="mt-2 text-3xl font-semibold tracking-tight">
              {stats?.totalUsers ?? 0}
            </div>
            <CardDescription className="mt-2">
              包含 active/disabled
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              活跃用户
            </CardTitle>
            <div className="mt-2 text-3xl font-semibold tracking-tight">
              {stats?.activeUsers ?? 0}
            </div>
            <CardDescription className="mt-2">可正常登录与操作</CardDescription>
          </CardHeader>
        </Card>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              禁用用户
            </CardTitle>
            <div className="mt-2 text-3xl font-semibold tracking-tight">
              {stats?.disabledUsers ?? 0}
            </div>
            <CardDescription className="mt-2">需要管理员处理</CardDescription>
          </CardHeader>
        </Card>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              管理员数量
            </CardTitle>
            <div className="mt-2 text-3xl font-semibold tracking-tight">
              {stats?.adminUsers ?? 0}
            </div>
            <CardDescription className="mt-2">拥有后台权限</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>快捷入口</CardTitle>
          <CardDescription>
            先把“用户治理”跑通，再扩展题库/题目批量管理。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/admin/users">用户管理</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/questions">题目管理</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/question-banks">题库管理</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
