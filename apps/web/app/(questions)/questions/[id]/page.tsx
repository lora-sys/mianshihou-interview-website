"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import { Badge } from "@repo/ui";
import { Button } from "@repo/ui";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function QuestionDetailPage() {
  const params = useParams();
  const {
    data: question,
    isLoading,
    error,
  } = trpc.questions.getById.useQuery({
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
        <p className="text-destructive">加载题目详情失败</p>
        <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">题目不存在</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/questions">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">题目详情</h1>
          <p className="text-muted-foreground mt-2">查看题目完整信息</p>
        </div>
        <Button>编辑</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">
                {question.questionTitle}
              </CardTitle>
              <div className="flex gap-2 mt-3">
                <Badge>{question.questionType}</Badge>
                <Badge variant="secondary">{question.difficulty}</Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">题目内容</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {question.questionContent}
            </p>
          </div>

          {question.options && (
            <div>
              <h3 className="font-semibold mb-2">选项</h3>
              <ul className="space-y-2">
                {JSON.parse(question.options).map(
                  (option: string, index: number) => (
                    <li
                      key={index}
                      className="text-muted-foreground flex items-center gap-2"
                    >
                      <span className="font-medium w-6">
                        {String.fromCharCode(65 + index)}.
                      </span>
                      <span>{option}</span>
                    </li>
                  ),
                )}
              </ul>
            </div>
          )}

          {question.answer && (
            <div>
              <h3 className="font-semibold mb-2">答案</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {question.answer}
              </p>
            </div>
          )}

          {question.analysis && (
            <div>
              <h3 className="font-semibold mb-2">解析</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {question.analysis}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
