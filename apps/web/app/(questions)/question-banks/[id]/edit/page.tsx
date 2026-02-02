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
  title: z.string().min(1, "请输入题库标题"),
  description: z.string().optional(),
  picture: z.string().optional(),
});

type Values = z.infer<typeof schema>;

function toNumberId(raw: string | string[] | undefined) {
  const s = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export default function EditQuestionBankPage() {
  const router = useRouter();
  const params = useParams();
  const id = toNumberId((params as any)?.id);

  const utils = trpc.useUtils?.();
  const bankQuery = trpc.questionBanks.getById.useQuery(
    { id: id ?? 0 },
    { enabled: typeof id === "number" && id > 0 },
  );

  const updateMutation = trpc.questionBanks.update.useMutation({
    onSuccess(res: any) {
      toast.success(res?.message ?? "已保存");
      void utils?.questionBanks?.getById?.invalidate?.({ id: id ?? 0 });
      void utils?.questionBank?.listWithQuestionCount?.invalidate?.();
      router.push(`/question-banks/${id}`);
    },
    onError(err: any) {
      toast.error(err?.message ?? "保存失败");
    },
  });

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", description: "", picture: "" },
  });

  useEffect(() => {
    const b = bankQuery.data?.data;
    if (!b) return;
    form.reset({
      title: b.title ?? "",
      description: b.description ?? "",
      picture: b.picture ?? "",
    });
  }, [bankQuery.data?.data, form]);

  function onSubmit(values: Values) {
    if (!id) return;
    updateMutation.mutate({
      id,
      title: values.title.trim(),
      description: values.description?.trim()
        ? values.description.trim()
        : undefined,
      picture: values.picture?.trim() ? values.picture.trim() : undefined,
    });
  }

  if (!id) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">编辑题库</h1>
        <p className="text-sm text-muted-foreground">无效的题库 ID。</p>
        <Button asChild variant="outline">
          <Link href="/question-banks">返回列表</Link>
        </Button>
      </div>
    );
  }

  if (bankQuery.isLoading) {
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
          <h1 className="text-2xl font-semibold tracking-tight">编辑题库</h1>
          <p className="text-sm text-muted-foreground mt-1">
            修改后会同步更新列表与详情页。
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/question-banks/${id}`}>返回详情</Link>
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
