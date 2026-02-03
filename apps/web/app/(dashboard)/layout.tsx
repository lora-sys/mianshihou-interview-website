import { DashboardShell } from "./dashboard-shell";
import { requireUser } from "@/lib/auth/guards";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser("/dashboard");
  return <DashboardShell user={user}>{children}</DashboardShell>;
}
