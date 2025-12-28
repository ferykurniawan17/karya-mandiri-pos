import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import POSInterface from "@/components/sales/POSInterface";
import AppLayout from "@/components/layout/AppLayout";

export default async function POSPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AppLayout user={user} title="Point of Sale">
      <div className="w-full py-6 sm:px-6 lg:px-8">
        <POSInterface />
      </div>
    </AppLayout>
  );
}
