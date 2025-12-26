'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  AlertTriangle, 
  CreditCard,
  Package
} from 'lucide-react'

interface DashboardStatsData {
  salesToday: {
    totalRevenue: number
    totalTransactions: number
    averageTransaction: number
    cashRevenue: number
    creditRevenue: number
  }
  topProducts: Array<{
    productId: string
    productName: string
    quantity: number
    revenue: number
  }>
  lowStockCount: number
  pendingCredit: number
}

export default function DashboardStats() {
  const [stats, setStats] = useState<DashboardStatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  )

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/reports/dashboard?date=${selectedDate}`)
      const data = await response.json()
      if (response.ok) {
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [selectedDate])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500">Memuat statistik...</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  return (
    <div className="mb-6 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Statistik Hari Ini</h2>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Penjualan */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1">
                <p className="text-sm text-gray-600">Total Penjualan</p>
                <InfoTooltip content="Total pendapatan dari semua transaksi yang sudah dibayar (paid) pada tanggal yang dipilih." />
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(stats.salesToday.totalRevenue)}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-600">
            <span>Cash: {formatCurrency(stats.salesToday.cashRevenue)}</span>
            <span className="ml-4">Credit: {formatCurrency(stats.salesToday.creditRevenue)}</span>
          </div>
        </div>

        {/* Total Transaksi */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Transaksi</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats.salesToday.totalTransactions}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Rata-rata: {formatCurrency(stats.salesToday.averageTransaction)}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <ShoppingCart className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Stok Rendah */}
        <Link href="/products">
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-sm text-gray-600">Stok Rendah</p>
                  <InfoTooltip content="Jumlah produk yang stoknya sudah berada di bawah atau sama dengan stok minimal yang ditetapkan." />
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.lowStockCount}
                </p>
                <p className="text-xs text-gray-500 mt-1">Produk</p>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
        </Link>

        {/* Piutang Belum Lunas */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1">
                <p className="text-sm text-gray-600">Piutang Belum Lunas</p>
                <InfoTooltip content="Total piutang dari transaksi yang statusnya belum dibayar (unpaid) atau sebagian dibayar (partial)." />
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(stats.pendingCredit)}
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <CreditCard className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Top Products */}
      {stats.topProducts.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">Produk Terlaris Hari Ini</h3>
          </div>
          <div className="space-y-3">
            {stats.topProducts.map((product, index) => (
              <div
                key={product.productId}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{product.productName}</p>
                    <p className="text-sm text-gray-500">
                      {product.quantity} unit terjual
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(product.revenue)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

