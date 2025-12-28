import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import TagManagement from "@/components/tags/TagManagement";
import AppLayout from "@/components/layout/AppLayout";

export default async function TagsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AppLayout user={user} title="Kelola Tag">
      <div className="w-full py-6 sm:px-6 lg:px-8">
        <TagManagement />
      </div>
    </AppLayout>
  );
}

