import { redirect } from "next/navigation";
import TopNav from "@/components/top-nav";
import { getCurrentUser, trpcQuery } from "@/lib/trpc/server";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui";

function formatDateTime(ts?: number) {
  if (!ts) return "-";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("zh-CN");
}

export default async function MePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/me");

  const devicesRes = await trpcQuery("auth.myDevices", {});
  const devices = devicesRes?.data ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <TopNav />
      <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">用户中心</h1>
          <p className="text-sm text-muted-foreground">
            账号信息与登录设备管理。
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>账号信息</CardTitle>
              <CardDescription>基础信息与权限状态</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">昵称</span>
                <span className="font-medium">{user.userName || "-"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">邮箱</span>
                <span className="font-medium">{user.email}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">角色</span>
                <Badge variant="outline">{user.userRole}</Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">状态</span>
                <Badge variant="outline">{user.status}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>登录设备</CardTitle>
              <CardDescription>最多同时登录 3 个设备（可配置）</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-t bg-muted/40">
                    <tr className="text-left">
                      <th className="px-4 py-3 font-medium">设备</th>
                      <th className="px-4 py-3 font-medium whitespace-nowrap">
                        首次登录
                      </th>
                      <th className="px-4 py-3 font-medium whitespace-nowrap">
                        最近活跃
                      </th>
                      <th className="px-4 py-3 font-medium whitespace-nowrap">
                        会话数
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {devices.length > 0 ? (
                      devices.map((d: any) => (
                        <tr key={d.fingerprint} className="hover:bg-accent/30">
                          <td className="px-4 py-3">
                            <div className="font-medium">{d.deviceName}</div>
                            <div className="text-xs text-muted-foreground">
                              {d.platform} · {d.browser}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                            {formatDateTime(d.firstSeen)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                            {formatDateTime(d.lastSeen)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                            {d.sessionCount ?? 0}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          className="px-4 py-10 text-center text-muted-foreground"
                          colSpan={4}
                        >
                          暂无设备信息
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
