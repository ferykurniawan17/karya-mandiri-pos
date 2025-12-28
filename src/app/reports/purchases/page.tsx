import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import PurchaseReport from "@/components/reports/PurchaseReport";
import ReportsTabs from "@/components/reports/ReportsTabs";
import AppLayout from "@/components/layout/AppLayout";

export default async function PurchaseReportPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AppLayout user={user} title="Laporan">
      <div className="w-full">
        <ReportsTabs />
        <div className="py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <PurchaseReport />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

