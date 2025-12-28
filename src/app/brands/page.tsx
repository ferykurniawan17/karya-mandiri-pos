import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import BrandManagement from "@/components/brands/BrandManagement";
import AppLayout from "@/components/layout/AppLayout";

export default async function BrandsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AppLayout user={user} title="Kelola Brand">
      <div className="w-full py-6 sm:px-6 lg:px-8">
        <BrandManagement />
      </div>
    </AppLayout>
  );
}

