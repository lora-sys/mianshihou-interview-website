"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@repo/ui";
import { Input } from "@repo/ui";
import { Label } from "@repo/ui";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@repo/ui";
import Link from "next/link";
import Image from "next/image";

export default function RegisterPage() {
  const registerMutation = trpc.auth.register.useMutation();
  const [passwordError, setPasswordError] = useState("");

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      name: "",
    },
    onSubmit: async ({ value }) => {
      // 验证密码确认
      if (value.password !== value.confirmPassword) {
        setPasswordError("两次输入的密码不一致");
        return;
      }
      setPasswordError("");

      try {
        await registerMutation.mutateAsync({
          email: value.email,
          password: value.password,
          name: value.name,
        });
        // 注册成功后跳转到登录页面
        window.location.href = "/login";
      } catch (error) {
        console.error("注册失败:", error);
      }
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border-border/50">
          <CardHeader className="space-y-2 text-center pb-8">
            <div className="mx-auto mb-4">
              <Image
                src="/logo.png"
                alt="Logo"
                width={64}
                height={64}
                className="h-16 w-auto mx-auto"
              />
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              创建账号
            </CardTitle>
            <CardDescription className="text-base">
              注册面试后系统，开启您的学习之旅
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit();
              }}
              className="space-y-5"
            >
              <form.Field name="name">
                {(field) => (
                  <div className="space-y-3">
                    <Label
                      htmlFor={field.name}
                      className="text-base font-medium"
                    >
                      姓名
                    </Label>
                    <Input
                      id={field.name}
                      type="text"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="请输入您的姓名"
                      className="h-12 text-base"
                    />
                    {field.state.meta.errors && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        {field.state.meta.errors[0]}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="email">
                {(field) => (
                  <div className="space-y-3">
                    <Label
                      htmlFor={field.name}
                      className="text-base font-medium"
                    >
                      邮箱地址
                    </Label>
                    <Input
                      id={field.name}
                      type="email"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="请输入您的邮箱"
                      className="h-12 text-base"
                    />
                    {field.state.meta.errors && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        {field.state.meta.errors[0]}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="password">
                {(field) => (
                  <div className="space-y-3">
                    <Label
                      htmlFor={field.name}
                      className="text-base font-medium"
                    >
                      密码
                    </Label>
                    <Input
                      id={field.name}
                      type="password"
                      value={field.state.value}
                      onChange={(e) => {
                        field.handleChange(e.target.value);
                        setPasswordError("");
                      }}
                      placeholder="请输入密码（至少8位）"
                      className="h-12 text-base"
                    />
                    {field.state.meta.errors && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        {field.state.meta.errors[0]}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="confirmPassword">
                {(field) => (
                  <div className="space-y-3">
                    <Label
                      htmlFor={field.name}
                      className="text-base font-medium"
                    >
                      确认密码
                    </Label>
                    <Input
                      id={field.name}
                      type="password"
                      value={field.state.value}
                      onChange={(e) => {
                        field.handleChange(e.target.value);
                        setPasswordError("");
                      }}
                      placeholder="请再次输入密码"
                      className="h-12 text-base"
                    />
                    {passwordError && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        {passwordError}
                      </p>
                    )}
                    {field.state.meta.errors && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        {field.state.meta.errors[0]}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              {registerMutation.error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg flex items-start gap-3">
                  <svg
                    className="h-5 w-5 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3L21 12c0 1.103-.884 2-1.972 2z"
                    />
                  </svg>
                  <div className="text-sm">
                    <p className="font-medium">注册失败</p>
                    <p className="text-destructive/80 mt-1">
                      {registerMutation.error.message || "请检查您的输入信息"}
                    </p>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-base font-medium"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018 0v8H0z"
                      ></path>
                    </svg>
                    注册中...
                  </span>
                ) : (
                  "立即注册"
                )}
              </Button>
            </form>
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
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/50"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  服务条款
                </span>
              </div>
            </div>
            <div className="text-xs text-center text-muted-foreground">
              注册即表示您同意我们的
              <Link href="/terms" className="text-primary hover:underline mx-1">
                服务条款
              </Link>
              和
              <Link
                href="/privacy"
                className="text-primary hover:underline mx-1"
              >
                隐私政策
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
