'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AutocompleteSelect } from '@/components/ui/autocomplete-select'
import ExportButtons from './ExportButtons'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { DollarSign, ShoppingCart, Package, TrendingUp } from 'lucide-react'

interface SalesReportData {
  summary: {
    totalRevenue: number
    totalTransactions: number
    totalItems: number
    averageTransaction: number
  }
  data: Array<{
    period: string
    revenue: number
    transactions: number
    items: number
  }>
  chartData: Array<{ label: string; value: number }>
}

export default function SalesReport() {
  const [reportData, setReportData] = useState<SalesReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
  )
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [groupBy, setGroupBy] = useState('day')
  const [categoryId, setCategoryId] = useState<string | undefined>()
  const [customerId, setCustomerId] = useState<string | undefined>()
  const [paymentStatus, setPaymentStatus] = useState<string>('all')
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    fetchCategories()
    fetchCustomers()
  }, [])

  useEffect(() => {
    fetchReport()
  }, [startDate, endDate, groupBy, categoryId, customerId, paymentStatus])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()
      if (response.ok) {
        setCategories(data.categories)
      }
    } catch (err) {
      console.error('Error fetching categories:', err)
    }
  }

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers')
      const data = await response.json()
      if (response.ok) {
        setCustomers(data.customers)
      }
    } catch (err) {
      console.error('Error fetching customers:', err)
    }
  }

  const fetchReport = async () => {
    try {
      setLoading(true)
      let url = `/api/reports/sales?startDate=${startDate}&endDate=${endDate}&groupBy=${groupBy}`
      if (categoryId) url += `&categoryId=${categoryId}`
      if (customerId) url += `&customerId=${customerId}`
      if (paymentStatus !== 'all') url += `&paymentStatus=${paymentStatus}`

      const response = await fetch(url)
      const data = await response.json()
      if (response.ok) {
        setReportData(data)
      }
    } catch (error) {
      console.error('Error fetching sales report:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const exportColumns = reportData
    ? [
        { header: 'Periode', dataKey: 'period' },
        { header: 'Revenue', dataKey: 'revenue' },
        { header: 'Transaksi', dataKey: 'transactions' },
        { header: 'Items', dataKey: 'items' },
      ]
    : []

  const exportData = reportData
    ? reportData.data.map((row) => ({
        period: row.period,
        revenue: formatCurrency(row.revenue),
        transactions: row.transactions,
        items: row.items,
      }))
    : []

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Laporan Penjualan</h2>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <Label>Tanggal Mulai</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Tanggal Akhir</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Group By</Label>
            <Select value={groupBy} onValueChange={setGroupBy}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Harian</SelectItem>
                <SelectItem value="month">Bulanan</SelectItem>
                <SelectItem value="category">Kategori</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="product">Produk</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status Pembayaran</Label>
            <Select value={paymentStatus} onValueChange={setPaymentStatus}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="paid">Lunas</SelectItem>
                <SelectItem value="unpaid">Belum Lunas</SelectItem>
                <SelectItem value="partial">Sebagian</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Kategori</Label>
            <AutocompleteSelect
              options={categories.map((c) => ({ id: c.id, name: c.name }))}
              value={categoryId}
              onValueChange={setCategoryId}
              placeholder="Semua Kategori"
              searchPlaceholder="Cari kategori..."
              className="mt-1"
            />
          </div>
          <div>
            <Label>Customer</Label>
            <AutocompleteSelect
              options={customers.map((c) => ({ id: c.id, name: c.name }))}
              value={customerId}
              onValueChange={setCustomerId}
              placeholder="Semua Customer"
              searchPlaceholder="Cari customer..."
              className="mt-1"
            />
          </div>
        </div>

        {loading && <p className="text-gray-500">Memuat data...</p>}

        {reportData && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-sm text-gray-600">Total Revenue</p>
                      <InfoTooltip content="Total pendapatan dari semua transaksi penjualan dalam periode yang dipilih." />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(reportData.summary.totalRevenue)}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-sm text-gray-600">Total Transaksi</p>
                      <InfoTooltip content="Jumlah total transaksi penjualan yang terjadi dalam periode yang dipilih." />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {reportData.summary.totalTransactions}
                    </p>
                  </div>
                  <ShoppingCart className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-sm text-gray-600">Total Items</p>
                      <InfoTooltip content="Total jumlah unit produk yang terjual (quantity) dari semua transaksi dalam periode yang dipilih." />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {reportData.summary.totalItems.toLocaleString('id-ID', { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <Package className="h-8 w-8 text-purple-600" />
                </div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-sm text-gray-600">Rata-rata Transaksi</p>
                      <InfoTooltip content="Nilai rata-rata per transaksi. Dihitung dengan rumus: Total Revenue dibagi Total Transaksi." />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(reportData.summary.averageTransaction)}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-orange-600" />
                </div>
              </div>
            </div>

            {/* Export Buttons */}
            <div className="mb-4">
              <ExportButtons
                data={exportData}
                columns={exportColumns}
                filename={`laporan-penjualan-${startDate}-${endDate}`}
                title="Laporan Penjualan"
              />
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Periode
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaksi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.data.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {row.period}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(row.revenue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.transactions}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {typeof row.items === 'number' ? row.items.toLocaleString('id-ID', { maximumFractionDigits: 2 }) : row.items}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

