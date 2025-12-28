import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import UserManagement from "@/components/users/UserManagement";
import AppLayout from "@/components/layout/AppLayout";

export default async function UsersPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    redirect("/dashboard");
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <AppLayout user={user} title="Kelola Pengguna">
      <div className="w-full py-6 sm:px-6 lg:px-8">
        <UserManagement initialUsers={users} />
      </div>
    </AppLayout>
  );
}

