import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import LogoutButton from "@/components/auth/LogoutButton";
import SyncStatus from "@/components/sync/SyncStatus";
import DashboardStats from "@/components/reports/DashboardStats";
import {
  ShoppingCart,
  Package,
  Folder,
  Receipt,
  Tag,
  Award,
  Users,
  Truck,
  FileText,
  BarChart3,
} from "lucide-react";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                POS Karya Mandiri
              </h1>
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
          {/* Featured POS Menu - Paling Atas */}
          <div className="mb-8 relative overflow-hidden">
            <Link
              href="/pos"
              className="block relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-10 rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-[1.01] group"
            >
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24 blur-2xl"></div>

              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-5">
                    <div className="bg-white/25 backdrop-blur-sm p-4 rounded-2xl shadow-lg group-hover:bg-white/30 transition-all">
                      <ShoppingCart className="h-10 w-10 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-3xl font-bold text-white">
                          Point of Sale
                        </h2>
                      </div>
                      <p className="text-blue-100 text-lg">
                        Sistem transaksi penjualan yang cepat dan mudah
                      </p>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full group-hover:bg-white/30 transition-all">
                    <svg
                      className="w-8 h-8 text-white transform group-hover:translate-x-1 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          <DashboardStats />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                <h2 className="text-xl font-semibold text-gray-900">
                  Kategori
                </h2>
              </div>
              <p className="text-gray-600">Kelola kategori barang</p>
            </Link>

            <Link
              href="/transactions"
              className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-3 mb-2">
                <Receipt className="h-6 w-6 text-orange-600" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Transaksi
                </h2>
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
                <h2 className="text-xl font-semibold text-gray-900">
                  Pelanggan
                </h2>
              </div>
              <p className="text-gray-600">Kelola pelanggan dan proyek</p>
            </Link>

            <Link
              href="/providers"
              className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-3 mb-2">
                <Truck className="h-6 w-6 text-cyan-600" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Provider
                </h2>
              </div>
              <p className="text-gray-600">Kelola provider barang</p>
            </Link>

            <Link
              href="/purchase-orders"
              className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-3 mb-2">
                <FileText className="h-6 w-6 text-red-600" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Purchase Order
                </h2>
              </div>
              <p className="text-gray-600">Kelola pembelian barang masuk</p>
            </Link>

            {user.role === "admin" && (
              <Link
                href="/users"
                className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Users className="h-6 w-6 text-indigo-600" />
                  <h2 className="text-xl font-semibold text-gray-900">
                    Pengguna
                  </h2>
                </div>
                <p className="text-gray-600">Kelola pengguna</p>
              </Link>
            )}

            <Link
              href="/reports/sales"
              className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="h-6 w-6 text-violet-600" />
                <h2 className="text-xl font-semibold text-gray-900">Laporan</h2>
              </div>
              <p className="text-gray-600">
                Laporan penjualan, pembelian, dan analitik
              </p>
            </Link>
          </div>

          <div className="mt-6">
            <SyncStatus />
          </div>
        </div>
      </main>
    </div>
  );
}
