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

const loginSchema = z.object({
  email: z.string().email("请输入正确的邮箱地址"),
  password: z.string().min(1, "请输入密码"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();

  const signInMutation = trpc.auth.signIn.useMutation({
    onSuccess(data: any) {
      toast.success(data.message || "登录成功");
      router.push("/dashboard");
    },
    onError(error: any) {
      toast.error(error.message || "登录失败");
    },
  });

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function onSubmit(values: LoginValues) {
    signInMutation.mutate(values);
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
              欢迎回来
            </CardTitle>
            <CardDescription className="text-base">
              登录到面试猴，开始你的学习之旅
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

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-base font-medium">
                          密码
                        </FormLabel>
                        <Link
                          href="/forgot-password"
                          className="text-sm text-primary hover:underline"
                        >
                          忘记密码？
                        </Link>
                      </div>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="请输入你的密码"
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
                  disabled={signInMutation.isPending}
                >
                  {signInMutation.isPending ? "登录中..." : "立即登录"}
                </Button>
              </form>
            </Form>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 pb-8">
            <div className="text-sm text-center text-muted-foreground">
              还没有账号？
              <Link
                href="/register"
                className="text-primary hover:underline font-medium ml-1"
              >
                立即注册
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
