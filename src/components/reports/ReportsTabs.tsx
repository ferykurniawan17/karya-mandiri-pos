'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ShoppingCart, Truck, TrendingUp, Package, Users } from 'lucide-react'

const navItems = [
  { href: '/reports/sales', label: 'Penjualan', icon: ShoppingCart },
  { href: '/reports/purchases', label: 'Pembelian', icon: Truck },
  { href: '/reports/profit-loss', label: 'Laba Rugi', icon: TrendingUp },
  { href: '/reports/stock', label: 'Stok', icon: Package },
  { href: '/reports/customers', label: 'Customer', icon: Users },
]

export default function ReportsTabs() {
  const pathname = usePathname()

  return (
    <div className="bg-white border-b">
      <div className="px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-8" aria-label="Tabs">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 border-b-2 py-4 px-1 text-sm font-medium ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

