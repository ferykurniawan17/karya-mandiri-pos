import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import Link from 'next/link'
import LogoutButton from '@/components/auth/LogoutButton'
import SyncStatus from '@/components/sync/SyncStatus'

export default async function DashboardPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">POS Karya Mandiri</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Halo, {user.name}</span>
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="w-full py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link
              href="/pos"
              className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Point of Sale</h2>
              <p className="text-gray-600">Transaksi penjualan</p>
            </Link>

            <Link
              href="/products"
              className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Produk</h2>
              <p className="text-gray-600">Kelola produk dan stok</p>
            </Link>

            <Link
              href="/categories"
              className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Kategori</h2>
              <p className="text-gray-600">Kelola kategori barang</p>
            </Link>

            <Link
              href="/transactions"
              className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Transaksi</h2>
              <p className="text-gray-600">Riwayat transaksi</p>
            </Link>

            <Link
              href="/tags"
              className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Tags</h2>
              <p className="text-gray-600">Kelola tag produk</p>
            </Link>

            <Link
              href="/brands"
              className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Brands</h2>
              <p className="text-gray-600">Kelola brand produk</p>
            </Link>

            {user.role === 'admin' && (
              <Link
                href="/users"
                className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
              >
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Pengguna</h2>
                <p className="text-gray-600">Kelola pengguna</p>
              </Link>
            )}
          </div>

          <div className="mt-6">
            <SyncStatus />
          </div>
        </div>
      </main>
    </div>
  )
}

