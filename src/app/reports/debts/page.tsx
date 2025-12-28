import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import DebtReport from "@/components/reports/DebtReport";
import AppLayout from "@/components/layout/AppLayout";
import ReportsTabs from "@/components/reports/ReportsTabs";

export default async function DebtReportPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AppLayout user={user} title="Laporan Hutang">
      <ReportsTabs />
      <div className="mt-6">
        <DebtReport />
      </div>
    </AppLayout>
  );
}

