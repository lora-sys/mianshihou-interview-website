import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Button, Input } from "@repo/ui";
import { Suspense } from "react";
import { QuestionsList } from "./QuestionsList";
import { QuestionsListSkeleton } from "./QuestionsListSkeleton";

function normalizeSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
) {
  const qRaw = searchParams?.q;
  const q = Array.isArray(qRaw) ? qRaw[0] : qRaw;
  return { q: (q ?? "").trim() };
}

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { q } = normalizeSearchParams(resolvedSearchParams);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            题目列表
          </h1>
          <p className="text-muted-foreground mt-2">管理和查看所有面试题目</p>
        </div>
        <Button asChild className="shadow-md">
          <Link href="/questions/new">
            <Plus className="w-4 h-4 mr-2" />
            新增题目
          </Link>
        </Button>
      </div>

      <form className="relative" action="/questions" method="GET">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="搜索题目..."
          name="q"
          defaultValue={q}
          className="pl-10 h-11"
        />
      </form>

      <Suspense fallback={<QuestionsListSkeleton />}>
        <QuestionsList q={q} />
      </Suspense>
    </div>
  );
}
