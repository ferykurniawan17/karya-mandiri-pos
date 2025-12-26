import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import Link from 'next/link'
import { BarChart3, ShoppingCart, Truck, TrendingUp, Package, Users } from 'lucide-react'
import ReportsTabs from '@/components/reports/ReportsTabs'

export default async function ReportsLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
              <div className="flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-indigo-600" />
                <h1 className="text-xl font-bold text-gray-900">Laporan</h1>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <ReportsTabs />

      <main className="w-full py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">{children}</div>
      </main>
    </div>
  )
}

