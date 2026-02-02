"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import { Badge } from "@repo/ui";
import { Button } from "@repo/ui";
import { ArrowLeft, BookOpen, Calendar, Loader2 } from "lucide-react";
import Link from "next/link";

export default function QuestionBankDetailPage() {
  const params = useParams();
  const {
    data: bank,
    isLoading,
    error,
  } = trpc.questionBanks.getById.useQuery({
    id: params.id as string,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">加载题库详情失败</p>
        <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
      </div>
    );
  }

  if (!bank) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">题库不存在</p>
      </div>
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
        <Button>编辑</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{bank.questionBankName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">描述</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {bank.description || "暂无描述"}
            </p>
          </div>

          <div className="flex gap-4 flex-wrap">
            {bank.category && (
              <div className="flex items-center gap-2">
                <Badge>{bank.category}</Badge>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>
                创建于{" "}
                {new Date(bank.createdAt || "").toLocaleDateString("zh-CN")}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>题库中的题目</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>该题库暂无题目</p>
            <Button className="mt-4" variant="outline">
              添加题目
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
