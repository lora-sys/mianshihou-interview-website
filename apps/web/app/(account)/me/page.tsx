import { redirect } from "next/navigation";
import TopNav from "@/components/top-nav";
import { getCurrentUser, trpcBatchQuery } from "@/lib/trpc/server";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui";
import Link from "next/link";

function formatDateTime(ts?: number) {
  if (!ts) return "-";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("zh-CN");
}

export default async function MePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/me");

  const [devicesRes, favRes, practiceRes, practiceStatsRes] =
    await trpcBatchQuery([
      { path: "auth.myDevices", input: {} },
      { path: "questionFavours.listMy", input: { page: 1, pageSize: 20 } },
      { path: "practice.getDailyCounts", input: { days: 365 } },
      { path: "practice.getStats", input: {} },
    ]);

  const devices = devicesRes?.data ?? [];
  const favItems = favRes?.data?.items ?? [];
  const favPagination = favRes?.data?.pagination;
  const daily = practiceRes?.data ?? [];
  const practiceStats = practiceStatsRes?.data ?? { total: 0, recent: [] };

  const countsByDay = new Map<string, number>();
  for (const row of daily)
    countsByDay.set(String((row as any).day), Number((row as any).count ?? 0));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days: Array<{ day: string; count: number }> = [];
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ day: key, count: countsByDay.get(key) ?? 0 });
  }

  const maxCount = Math.max(1, ...days.map((d) => d.count));
  const colorFor = (count: number) => {
    if (count <= 0) return "bg-muted/50";
    const ratio = count / maxCount;
    if (ratio < 0.25) return "bg-emerald-200";
    if (ratio < 0.5) return "bg-emerald-300";
    if (ratio < 0.75) return "bg-emerald-400";
    return "bg-emerald-500";
  };

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
              <CardTitle>练习进度</CardTitle>
              <CardDescription>近 365 天打卡风格贡献图</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className="text-muted-foreground">累计完成</div>
                <div className="font-medium">{practiceStats.total}</div>
              </div>
              <div className="overflow-x-auto">
                <div className="inline-grid grid-flow-col grid-rows-7 gap-1">
                  {days.map((d) => (
                    <div
                      key={d.day}
                      title={`${d.day}：${d.count}`}
                      className={`h-3 w-3 rounded ${colorFor(d.count)}`}
                    />
                  ))}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                颜色越深表示当天完成题目越多。
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>我的收藏</CardTitle>
              <CardDescription>
                {favPagination
                  ? `共 ${favPagination.total} 条，展示最近 20 条`
                  : "最近收藏"}
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/search">去搜索更多</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-t bg-muted/40">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-medium">题目</th>
                    <th className="px-4 py-3 font-medium">来源</th>
                    <th className="px-4 py-3 font-medium w-44 text-right">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {favItems.length > 0 ? (
                    favItems.map((it: any) => {
                      const href = it.isSystem
                        ? `/explore/questions/${it.questionId}`
                        : `/questions/${it.questionId}`;
                      return (
                        <tr key={it.id} className="hover:bg-accent/30">
                          <td className="px-4 py-3">
                            <Link
                              href={href}
                              className="font-medium hover:underline"
                            >
                              {it.title}
                            </Link>
                            <div className="text-xs text-muted-foreground line-clamp-1 mt-1">
                              {it.content}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {it.isSystem ? "系统" : "我的"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <Button asChild size="sm" variant="outline">
                                <Link href={href}>查看</Link>
                              </Button>
                              <form
                                action={`/me/favourites/${it.questionId}/toggle`}
                                method="POST"
                              >
                                <input
                                  type="hidden"
                                  name="redirect"
                                  value="/me"
                                />
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  type="submit"
                                >
                                  取消收藏
                                </Button>
                              </form>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        className="px-4 py-10 text-center text-muted-foreground"
                        colSpan={3}
                      >
                        暂无收藏，去精选题目里收藏几道吧。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>登录设备</CardTitle>
              <CardDescription>最多同时登录 3 个设备（可配置）</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="border-t bg-background px-4 py-3 flex justify-between gap-2">
                <div className="text-xs text-muted-foreground">
                  当前设备已标记为“当前”，不可被踢下线。
                </div>
                <form action="/me/devices/revoke-all" method="POST">
                  <input type="hidden" name="redirect" value="/me" />
                  <Button size="sm" variant="destructive" type="submit">
                    踢出其他设备
                  </Button>
                </form>
              </div>
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
                      <th className="px-4 py-3 font-medium w-44 text-right">
                        操作
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
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              {d.isCurrent ? (
                                <Badge variant="outline">当前</Badge>
                              ) : (
                                <form action="/me/devices/revoke" method="POST">
                                  <input
                                    type="hidden"
                                    name="redirect"
                                    value="/me"
                                  />
                                  <input
                                    type="hidden"
                                    name="deviceFingerprint"
                                    value={d.fingerprint}
                                  />
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    type="submit"
                                  >
                                    踢下线
                                  </Button>
                                </form>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          className="px-4 py-10 text-center text-muted-foreground"
                          colSpan={5}
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
