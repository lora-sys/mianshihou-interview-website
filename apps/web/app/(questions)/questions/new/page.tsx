"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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

export default function NewQuestionPage() {
  const router = useRouter();
  const utils = trpc.useUtils?.();
  const createMutation = trpc.questions.create.useMutation({
    onSuccess(res: any) {
      toast.success(res?.message ?? "创建成功");
      void utils?.questions?.list?.invalidate?.();
      const id = res?.data?.id;
      if (id) router.push(`/questions/${id}`);
      else router.push("/questions");
    },
    onError(err: any) {
      toast.error(err?.message ?? "创建失败");
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

  function parseTags(raw?: string) {
    return (raw ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function onSubmit(values: Values) {
    const questionBankId = values.questionBankId?.trim()
      ? Number(values.questionBankId.trim())
      : undefined;

    createMutation.mutate({
      title: values.title.trim(),
      content: values.content.trim(),
      answer: values.answer?.trim() ? values.answer.trim() : undefined,
      tags: values.tags?.trim() ? parseTags(values.tags) : undefined,
      questionBankId: Number.isFinite(questionBankId)
        ? questionBankId
        : undefined,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">新增题目</h1>
          <p className="text-sm text-muted-foreground mt-1">
            支持填写答案与标签，后续可在详情页继续完善。
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/questions">返回列表</Link>
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
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "创建中..." : "创建"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
