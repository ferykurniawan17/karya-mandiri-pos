import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import ProductManagement from "@/components/products/ProductManagement";
import AppLayout from "@/components/layout/AppLayout";

export default async function ProductsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AppLayout user={user} title="Kelola Produk">
      <div className="w-full py-6 sm:px-6 lg:px-8">
        <ProductManagement />
      </div>
    </AppLayout>
  );
}
