"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";

const schema = z
  .object({
    currentPassword: z.string().min(1, "请输入当前密码"),
    newPassword: z.string().min(6, "新密码至少 6 位"),
    confirmPassword: z.string().min(6, "请再次输入新密码"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "两次密码不一致",
    path: ["confirmPassword"],
  });

type Values = z.infer<typeof schema>;

export function ChangePasswordForm() {
  const mutation = trpc.auth.changePassword.useMutation({
    onSuccess(res: any) {
      toast.success(res?.message || "修改密码成功");
    },
    onError(err: any) {
      toast.error(err?.message || "修改失败");
    },
  });

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  function onSubmit(values: Values) {
    mutation.mutate({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
      revokeOtherSessions: true,
    });
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>修改密码</CardTitle>
        <CardDescription>建议定期更新密码，并保持唯一性。</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>当前密码</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="请输入当前密码"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>新密码</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="至少 6 位" {...field} />
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
                  <FormLabel>再次输入</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="请再次输入新密码"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "提交中..." : "保存更改"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
