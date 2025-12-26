import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import Link from 'next/link'
import LogoutButton from '@/components/auth/LogoutButton'
import SyncStatus from '@/components/sync/SyncStatus'
import { ShoppingCart, Package, Folder, Receipt, Tag, Award, Users, Truck, FileText } from 'lucide-react'

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
              <div className="flex items-center gap-3 mb-2">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Point of Sale</h2>
              </div>
              <p className="text-gray-600">Transaksi penjualan</p>
            </Link>

            <Link
              href="/products"
              className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-3 mb-2">
                <Package className="h-6 w-6 text-green-600" />
                <h2 className="text-xl font-semibold text-gray-900">Produk</h2>
              </div>
              <p className="text-gray-600">Kelola produk dan stok</p>
            </Link>

            <Link
              href="/categories"
              className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-3 mb-2">
                <Folder className="h-6 w-6 text-purple-600" />
                <h2 className="text-xl font-semibold text-gray-900">Kategori</h2>
              </div>
              <p className="text-gray-600">Kelola kategori barang</p>
            </Link>

            <Link
              href="/transactions"
              className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-3 mb-2">
                <Receipt className="h-6 w-6 text-orange-600" />
                <h2 className="text-xl font-semibold text-gray-900">Transaksi</h2>
              </div>
              <p className="text-gray-600">Riwayat transaksi</p>
            </Link>

            <Link
              href="/tags"
              className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-3 mb-2">
                <Tag className="h-6 w-6 text-pink-600" />
                <h2 className="text-xl font-semibold text-gray-900">Tags</h2>
              </div>
              <p className="text-gray-600">Kelola tag produk</p>
            </Link>

            <Link
              href="/brands"
              className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-3 mb-2">
                <Award className="h-6 w-6 text-yellow-600" />
                <h2 className="text-xl font-semibold text-gray-900">Brands</h2>
              </div>
              <p className="text-gray-600">Kelola brand produk</p>
            </Link>

            <Link
              href="/customers"
              className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-3 mb-2">
                <Users className="h-6 w-6 text-teal-600" />
                <h2 className="text-xl font-semibold text-gray-900">Pelanggan</h2>
              </div>
              <p className="text-gray-600">Kelola pelanggan dan proyek</p>
            </Link>

            <Link
              href="/providers"
              className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-3 mb-2">
                <Truck className="h-6 w-6 text-cyan-600" />
                <h2 className="text-xl font-semibold text-gray-900">Provider</h2>
              </div>
              <p className="text-gray-600">Kelola provider barang</p>
            </Link>

            <Link
              href="/purchase-orders"
              className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-3 mb-2">
                <FileText className="h-6 w-6 text-red-600" />
                <h2 className="text-xl font-semibold text-gray-900">Purchase Order</h2>
              </div>
              <p className="text-gray-600">Kelola pembelian barang masuk</p>
            </Link>

            {user.role === 'admin' && (
              <Link
                href="/users"
                className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Users className="h-6 w-6 text-indigo-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Pengguna</h2>
                </div>
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

