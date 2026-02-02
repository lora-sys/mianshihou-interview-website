"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@repo/ui";

const schema = z.object({
  title: z.string().min(1, "请输入标题"),
  content: z.string().min(1, "请输入题目内容"),
  answer: z.string().optional(),
  tags: z.string().optional(),
  questionBankId: z.string().optional(),
});

type Values = z.infer<typeof schema>;

function toNumberId(raw: string | string[] | undefined) {
  const s = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export default function EditQuestionPage() {
  const router = useRouter();
  const params = useParams();
  const id = toNumberId(params?.id as any);

  const utils = trpc.useUtils?.();
  const questionQuery = trpc.questions.getById.useQuery(
    { id: id ?? 0 },
    { enabled: typeof id === "number" && id > 0 },
  );

  const updateMutation = trpc.questions.update.useMutation({
    onSuccess(res: any) {
      toast.success(res?.message ?? "已保存");
      void utils?.questions?.getById?.invalidate?.({ id: id ?? 0 });
      void utils?.questions?.list?.invalidate?.();
      router.push(`/questions/${id}`);
    },
    onError(err: any) {
      toast.error(err?.message ?? "保存失败");
    },
  });

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      content: "",
      answer: "",
      tags: "",
      questionBankId: "",
    },
  });

  useEffect(() => {
    const q = questionQuery.data?.data;
    if (!q) return;
    let tags = "";
    if (typeof q.tags === "string") {
      try {
        const parsed = JSON.parse(q.tags);
        tags = Array.isArray(parsed) ? parsed.join(", ") : q.tags;
      } catch {
        tags = q.tags;
      }
    }
    form.reset({
      title: q.title ?? "",
      content: q.content ?? "",
      answer: q.answer ?? "",
      tags,
      questionBankId: q.questionBankId ? String(q.questionBankId) : "",
    });
  }, [form, questionQuery.data?.data]);

  function parseTags(raw?: string) {
    return (raw ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function onSubmit(values: Values) {
    if (!id) return;
    const questionBankId = values.questionBankId?.trim()
      ? Number(values.questionBankId.trim())
      : undefined;

    updateMutation.mutate({
      id,
      title: values.title.trim(),
      content: values.content.trim(),
      answer: values.answer?.trim() ? values.answer.trim() : undefined,
      tags: values.tags?.trim() ? parseTags(values.tags) : undefined,
      questionBankId: Number.isFinite(questionBankId)
        ? questionBankId
        : undefined,
    });
  }

  if (!id) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">编辑题目</h1>
        <p className="text-sm text-muted-foreground">无效的题目 ID。</p>
        <Button asChild variant="outline">
          <Link href="/questions">返回列表</Link>
        </Button>
      </div>
    );
  }

  if (questionQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="h-4 w-4 rounded-full border-2 border-muted-foreground/40 border-t-transparent animate-spin" />
          加载中...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">编辑题目</h1>
          <p className="text-sm text-muted-foreground mt-1">
            修改后会同步更新列表与详情页。
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/questions/${id}`}>返回详情</Link>
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>题目内容</CardTitle>
          <CardDescription>标题必填；标签用逗号分隔。</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>标题</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="例如：解释 React 的渲染流程"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>题目</FormLabel>
                    <FormControl>
                      <textarea
                        className="min-h-40 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="请输入题目内容..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="answer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>答案（可选）</FormLabel>
                    <FormControl>
                      <textarea
                        className="min-h-32 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="可先写要点，后续再补全"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>标签（可选）</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="React, 性能优化, Fiber"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="questionBankId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>题库 ID（可选）</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="例如：1"
                          inputMode="numeric"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button
                  type="submit"
                  className="min-w-28"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "保存中..." : "保存"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
