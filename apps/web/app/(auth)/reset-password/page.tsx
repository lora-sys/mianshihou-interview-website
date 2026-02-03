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

const schema = z
  .object({
    newPassword: z.string().min(6, "密码至少 6 位"),
    confirmPassword: z.string().min(6, "请再次输入密码"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "两次密码不一致",
    path: ["confirmPassword"],
  });
type Values = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const mutation = trpc.auth.resetPassword.useMutation({
    onSuccess(res: any) {
      toast.success(res?.message || "重置密码成功");
      router.push("/login");
    },
    onError(err: any) {
      toast.error(err?.message || "重置失败");
    },
  });

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  function onSubmit(values: Values) {
    if (!token) {
      toast.error("缺少 token");
      return;
    }
    mutation.mutate({ token, newPassword: values.newPassword });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border-border/50">
          <CardHeader className="space-y-2 text-center pb-6">
            <CardTitle className="text-2xl font-bold">重置密码</CardTitle>
            <CardDescription className="text-base">
              设置一个新的登录密码
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
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        新密码
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="请输入新密码"
                          className="h-12 text-base"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        再次输入
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="请再次输入新密码"
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
                  {mutation.isPending ? "提交中..." : "确认重置"}
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
