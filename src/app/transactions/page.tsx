import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import TransactionHistory from "@/components/sales/TransactionHistory";
import AppLayout from "@/components/layout/AppLayout";

export default async function TransactionsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AppLayout user={user} title="Riwayat Transaksi">
      <div className="w-full py-6 sm:px-6 lg:px-8">
        <TransactionHistory />
      </div>
    </AppLayout>
  );
}
