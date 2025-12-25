import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import UserManagement from '@/components/users/UserManagement'

export default async function UsersPage() {
  const user = await getCurrentUser()

  if (!user || user.role !== 'admin') {
    redirect('/dashboard')
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
      createdAt: 'desc',
    },
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <a href="/dashboard" className="text-gray-600 hover:text-gray-900">
                ← Kembali
              </a>
              <h1 className="text-xl font-bold text-gray-900">Kelola Pengguna</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="w-full py-6 sm:px-6 lg:px-8">
        <UserManagement initialUsers={users} />
      </main>
    </div>
  )
}

