import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import CategoryManagement from "@/components/categories/CategoryManagement";
import AppLayout from "@/components/layout/AppLayout";

export default async function CategoriesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AppLayout user={user} title="Kelola Kategori">
      <div className="w-full py-6 sm:px-6 lg:px-8">
        <CategoryManagement />
      </div>
    </AppLayout>
  );
}
