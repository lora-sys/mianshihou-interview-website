"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { trpc } from "@/lib/trpc/client";
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
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const registerSchema = z
  .object({
    name: z.string().min(1, "请输入姓名"),
    email: z.string().email("请输入正确的邮箱地址"),
    password: z.string().min(6, "密码至少 6 位"),
    confirmPassword: z.string().min(1, "请再次输入密码"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  });

type RegisterValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();

  const signUpMutation = trpc.auth.signUp.useMutation({
    onSuccess(data: any) {
      toast.success(data.message || "注册成功");
      router.push("/login");
    },
    onError(error: any) {
      toast.error(error.message || "注册失败");
    },
  });

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  function onSubmit(values: RegisterValues) {
    signUpMutation.mutate({
      email: values.email,
      password: values.password,
      name: values.name,
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border-border/50">
          <CardHeader className="space-y-2 text-center pb-8">
            <div className="mx-auto mb-4">
              <Image
                src="/logo.png"
                alt="面试猴"
                width={64}
                height={64}
                className="h-16 w-auto mx-auto"
                priority
              />
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              创建账号
            </CardTitle>
            <CardDescription className="text-base">
              注册面试猴，开启你的学习之旅
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-5"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        姓名
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="请输入你的姓名"
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

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        密码
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="请输入密码（至少 6 位）"
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
                        确认密码
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="请再次输入密码"
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
                  disabled={signUpMutation.isPending}
                >
                  {signUpMutation.isPending ? "注册中..." : "立即注册"}
                </Button>
              </form>
            </Form>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 pb-8">
            <div className="text-sm text-center text-muted-foreground">
              已有账号？
              <Link
                href="/login"
                className="text-primary hover:underline font-medium ml-1"
              >
                立即登录
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
