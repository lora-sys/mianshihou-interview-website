import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@repo/ui";

export function QuestionsListSkeleton() {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">列表</CardTitle>
          <CardDescription>正在加载题目数据...</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-t bg-muted/40">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium">标题</th>
                <th className="px-4 py-3 font-medium">标签</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  创建时间
                </th>
                <th className="px-4 py-3 font-medium w-40 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3">
                    <div className="h-5 w-48 bg-muted animate-pulse rounded" />
                    <div className="mt-1 h-3 w-64 bg-muted/60 animate-pulse rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <div className="h-5 w-12 bg-muted animate-pulse rounded" />
                      <div className="h-5 w-12 bg-muted animate-pulse rounded" />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                      <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
