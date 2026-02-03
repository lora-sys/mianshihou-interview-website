import { DashboardShell } from "./dashboard-shell";
import { requireUser } from "@/lib/auth/guards";
import TopNav from "@/components/top-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser("/dashboard");
  return (
    <>
      <TopNav />
      <DashboardShell user={user}>{children}</DashboardShell>
    </>
  );
}
