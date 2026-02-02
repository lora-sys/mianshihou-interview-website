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
  title: z.string().min(1, "请输入题库标题"),
  description: z.string().optional(),
  picture: z.string().optional(),
});

type Values = z.infer<typeof schema>;

export default function NewQuestionBankPage() {
  const router = useRouter();
  const utils = trpc.useUtils?.();
  const createMutation = trpc.questionBanks.create.useMutation({
    onSuccess(res: any) {
      toast.success(res?.message ?? "创建成功");
      void utils?.questionBank?.listWithQuestionCount?.invalidate?.();
      const id = res?.data?.id;
      if (id) router.push(`/question-banks/${id}`);
      else router.push("/question-banks");
    },
    onError(err: any) {
      toast.error(err?.message ?? "创建失败");
    },
  });

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", description: "", picture: "" },
  });

  function onSubmit(values: Values) {
    createMutation.mutate({
      title: values.title.trim(),
      description: values.description?.trim()
        ? values.description.trim()
        : undefined,
      picture: values.picture?.trim() ? values.picture.trim() : undefined,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">新增题库</h1>
          <p className="text-sm text-muted-foreground mt-1">
            先创建题库，再在详情页绑定题目。
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/question-banks">返回列表</Link>
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>题库信息</CardTitle>
          <CardDescription>标题必填；可选填写封面图 URL。</CardDescription>
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
                      <Input placeholder="例如：前端高频面试题库" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>描述（可选）</FormLabel>
                    <FormControl>
                      <textarea
                        className="min-h-28 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="一句话说明这个题库面向的岗位/方向"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="picture"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>封面图 URL（可选）</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
