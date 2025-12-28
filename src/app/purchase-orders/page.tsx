import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import PurchaseOrderManagement from "@/components/purchase-orders/PurchaseOrderManagement";
import AppLayout from "@/components/layout/AppLayout";

export default async function PurchaseOrdersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AppLayout user={user} title="Daftar Purchase Order">
      <div className="w-full py-6 sm:px-6 lg:px-8">
        <PurchaseOrderManagement />
      </div>
    </AppLayout>
  );
}

