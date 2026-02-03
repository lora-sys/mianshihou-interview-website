import TopNav from "@/components/top-nav";
import { requireUser } from "@/lib/auth/guards";
import { ChangePasswordForm } from "./ChangePasswordForm";

export default async function SecurityPage() {
  await requireUser("/me/security");

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <TopNav />
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">账号安全</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理你的密码与会话安全。
          </p>
        </div>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
