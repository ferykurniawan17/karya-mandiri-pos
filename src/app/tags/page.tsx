import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import Link from 'next/link'
import LogoutButton from '@/components/auth/LogoutButton'
import TagManagement from '@/components/tags/TagManagement'

export default async function TagsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                ← Kembali
              </Link>
              <h1 className="text-xl font-bold text-gray-900">Kelola Tag</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Halo, {user.name}</span>
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="w-full py-6 sm:px-6 lg:px-8">
        <TagManagement />
      </main>
    </div>
  )
}

