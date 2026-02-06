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
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
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
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const [conflictOpen, setConflictOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<LoginValues | null>(null);

  const signInMutation = trpc.auth.signIn.useMutation({
    onSuccess(data: any) {
      toast.success(data.message || "登录成功");
      router.push(redirectTo);
    },
    onError(error: any) {
      const biz = error?.data?.biz;
      if (biz?.code === "DEVICE_LIMIT_REACHED") {
        setConflictOpen(true);
        toast.error(error.message || "登录设备过多");
        return;
      }
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
    setPendingValues(values);
    signInMutation.mutate(values);
  }

  const devicesQuery = trpc.auth.myDevices.useQuery(undefined, {
    enabled: conflictOpen,
  });
  const revokeDeviceMutation = trpc.auth.revokeDevice.useMutation({
    onSuccess() {
      devicesQuery.refetch();
    },
    onError(err: any) {
      toast.error(err.message || "操作失败");
    },
  });
  const revokeAllMutation = trpc.auth.revokeAllDevices.useMutation({
    onSuccess() {
      devicesQuery.refetch();
    },
    onError(err: any) {
      toast.error(err.message || "操作失败");
    },
  });

  function retryLogin() {
    if (!pendingValues) return;
    setConflictOpen(false);
    signInMutation.mutate(pendingValues);
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

        {conflictOpen ? (
          <div className="mt-4 rounded-2xl border bg-background/80 backdrop-blur p-4 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium">账号同时登录设备过多</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  为了账号安全，请退出部分旧设备后继续。
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConflictOpen(false)}
              >
                关闭
              </Button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => revokeAllMutation.mutate()}
                disabled={revokeAllMutation.isPending}
              >
                退出其他设备
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={retryLogin}
                disabled={signInMutation.isPending}
              >
                继续登录
              </Button>
            </div>

            <div className="mt-3 space-y-2">
              {(devicesQuery.data?.data ?? []).map((d: any) => (
                <div
                  key={d.fingerprint}
                  className="flex items-center justify-between gap-3 rounded-xl border p-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {d.deviceName} {d.isCurrent ? "（当前）" : ""}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {d.platform} · {d.browser}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      revokeDeviceMutation.mutate({
                        deviceFingerprint: d.fingerprint,
                      })
                    }
                    disabled={revokeDeviceMutation.isPending || d.isCurrent}
                  >
                    退出
                  </Button>
                </div>
              ))}
              {devicesQuery.isLoading ? (
                <div className="text-xs text-muted-foreground">
                  加载设备列表中...
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
