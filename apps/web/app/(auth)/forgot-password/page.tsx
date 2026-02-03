"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { trpc } from "@/lib/trpc/client";

const schema = z.object({
  email: z.string().email("请输入正确的邮箱地址"),
});
type Values = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || undefined;

  const mutation = trpc.auth.forgotPassword.useMutation({
    onSuccess(res: any) {
      toast.success(res?.message || "已发送邮件（如邮箱存在）");
      router.push("/login");
    },
    onError(err: any) {
      toast.error(err?.message || "发送失败");
    },
  });

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  function onSubmit(values: Values) {
    mutation.mutate({ email: values.email, redirectTo });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border-border/50">
          <CardHeader className="space-y-2 text-center pb-6">
            <CardTitle className="text-2xl font-bold">找回密码</CardTitle>
            <CardDescription className="text-base">
              输入邮箱，我们会发送重置链接（如账号存在）
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        邮箱地址
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="请输入你的邮箱"
                          className="h-12 text-base"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-medium"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? "发送中..." : "发送重置链接"}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center pb-8">
            <Link
              href="/login"
              className="text-sm text-primary hover:underline"
            >
              返回登录
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
