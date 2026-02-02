import DashboardLayout from "../(dashboard)/layout";

export default function QuestionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
