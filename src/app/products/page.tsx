import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import ProductManagement from '@/components/products/ProductManagement'

export default async function ProductsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <a href="/dashboard" className="text-gray-600 hover:text-gray-900">
                ← Kembali
              </a>
              <h1 className="text-xl font-bold text-gray-900">Kelola Produk</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <ProductManagement />
      </main>
    </div>
  )
}

