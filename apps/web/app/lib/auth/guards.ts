import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/trpc/server";

export async function requireUser(redirectTo: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirect=${encodeURIComponent(redirectTo)}`);
  return user;
}

export async function requireAdmin(redirectTo: string) {
  const user = await requireUser(redirectTo);
  if (user.userRole !== "admin") redirect("/dashboard");
  return user;
}
