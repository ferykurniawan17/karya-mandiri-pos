import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AppLayout from "@/components/layout/AppLayout";
import PaymentsPageContent from "@/components/payments/PaymentsPageContent";

export default async function PaymentsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AppLayout user={user} title="Pembayaran Hutang">
      <PaymentsPageContent />
    </AppLayout>
  );
}

