import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import CustomerManagement from "@/components/customers/CustomerManagement";
import AppLayout from "@/components/layout/AppLayout";

export default async function CustomersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AppLayout user={user} title="Daftar Pelanggan">
      <div className="w-full py-6 sm:px-6 lg:px-8">
        <CustomerManagement />
      </div>
    </AppLayout>
  );
}
