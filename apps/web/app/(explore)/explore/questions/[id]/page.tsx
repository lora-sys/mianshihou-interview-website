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
import { getCurrentUser, safeTrpcQuery } from "@/lib/trpc/server";

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

export default async function ExploreQuestionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idRaw } = await params;
  const id = Number(idRaw);

  const user = await getCurrentUser();
  const [res, favourRes] = await Promise.all([
    safeTrpcQuery("explore.questions.getById", { id }),
    user
      ? safeTrpcQuery("questionFavours.check", { questionId: id })
      : Promise.resolve(null),
  ]);
  if (!res) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>服务暂不可用</CardTitle>
          <CardDescription>请稍后刷新再试。</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const q = res?.data;
  const tags = parseTags(q?.tags);
  const isFavour = favourRes?.data?.isFavour ?? false;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">{q?.title}</h1>
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {tags.slice(0, 8).map((t) => (
                <Badge key={t} variant="secondary" className="text-xs">
                  {t}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/explore/questions">返回题目</Link>
          </Button>
          {q?.questionBankId ? (
            <Button asChild>
              <Link href={`/explore/question-banks/${q.questionBankId}`}>
                所属题库
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>题目</CardTitle>
          <CardDescription>建议先自己作答，再展开答案。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {q?.content}
          </div>
          {q?.answer ? (
            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="text-sm font-medium">参考答案</div>
              <div className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                {q.answer}
              </div>
            </div>
          ) : null}
          {user ? (
            <div className="flex flex-wrap items-center gap-2">
              <form action={`/explore/questions/${idRaw}/favour`} method="POST">
                <input
                  type="hidden"
                  name="redirect"
                  value={`/explore/questions/${idRaw}`}
                />
                <Button
                  type="submit"
                  variant={isFavour ? "outline" : "default"}
                >
                  {isFavour ? "取消收藏" : "收藏"}
                </Button>
              </form>

              <form
                action={`/explore/questions/${idRaw}/practice`}
                method="POST"
                className="flex items-center gap-2"
              >
                <input
                  type="hidden"
                  name="redirect"
                  value={`/explore/questions/${idRaw}`}
                />
                <Input
                  name="score"
                  placeholder="得分 0-100（可选）"
                  className="h-9 w-44"
                />
                <Button type="submit" variant="outline">
                  我已完成
                </Button>
              </form>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline">
                <Link href={`/login?redirect=/explore/questions/${idRaw}`}>
                  登录后可收藏与记录练习
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
