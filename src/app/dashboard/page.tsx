import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import DashboardStats from "@/components/reports/DashboardStats";
import AppLayout from "@/components/layout/AppLayout";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AppLayout user={user}>
      <div className="p-6">
        <DashboardStats />
      </div>
    </AppLayout>
  );
}
