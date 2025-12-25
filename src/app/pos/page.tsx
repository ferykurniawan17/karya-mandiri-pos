import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import POSInterface from '@/components/sales/POSInterface'

export default async function POSPage() {
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
              <a href="/dashboard" className="text-gray-600 hover:text-gray-900">
                ← Kembali
              </a>
              <h1 className="text-xl font-bold text-gray-900">Point of Sale</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="w-full py-6 sm:px-6 lg:px-8">
        <POSInterface />
      </main>
    </div>
  )
}

