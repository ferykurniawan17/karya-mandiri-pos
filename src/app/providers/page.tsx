import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import ProviderManagement from "@/components/providers/ProviderManagement";
import AppLayout from "@/components/layout/AppLayout";

export default async function ProvidersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AppLayout user={user} title="Daftar Provider">
      <div className="w-full py-6 sm:px-6 lg:px-8">
        <ProviderManagement />
      </div>
    </AppLayout>
  );
}

