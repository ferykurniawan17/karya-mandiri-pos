'use client'

import { useState, useEffect } from 'react'
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

interface PurchaseReportData {
  summary: {
    totalPurchase: number
    totalPOs: number
    totalItems: number
    averagePO: number
  }
  data: Array<{
    period: string
    purchase: number
    pos: number
    items: number
  }>
}

export default function PurchaseReport() {
  const [reportData, setReportData] = useState<PurchaseReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
  )
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [groupBy, setGroupBy] = useState('day')
  const [providerId, setProviderId] = useState<string | undefined>()
  const [status, setStatus] = useState<string>('all')
  const [providers, setProviders] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    fetchProviders()
  }, [])

  useEffect(() => {
    fetchReport()
  }, [startDate, endDate, groupBy, providerId, status])

  const fetchProviders = async () => {
    try {
      const response = await fetch('/api/providers')
      const data = await response.json()
      if (response.ok) {
        setProviders(data.providers)
      }
    } catch (err) {
      console.error('Error fetching providers:', err)
    }
  }

  const fetchReport = async () => {
    try {
      setLoading(true)
      let url = `/api/reports/purchases?startDate=${startDate}&endDate=${endDate}&groupBy=${groupBy}`
      if (providerId) url += `&providerId=${providerId}`
      if (status !== 'all') url += `&status=${status}`

      const response = await fetch(url)
      const data = await response.json()
      if (response.ok) {
        setReportData(data)
      }
    } catch (error) {
      console.error('Error fetching purchase report:', error)
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
        { header: 'Total Pembelian', dataKey: 'purchase' },
        { header: 'Jumlah PO', dataKey: 'pos' },
        { header: 'Items', dataKey: 'items' },
      ]
    : []

  const exportData = reportData
    ? reportData.data.map((row) => ({
        period: row.period,
        purchase: formatCurrency(row.purchase),
        pos: row.pos,
        items: row.items,
      }))
    : []

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Laporan Pembelian</h2>

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
                <SelectItem value="provider">Provider</SelectItem>
                <SelectItem value="product">Produk</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Provider</Label>
            <AutocompleteSelect
              options={providers.map((p) => ({ id: p.id, name: p.name }))}
              value={providerId}
              onValueChange={setProviderId}
              placeholder="Semua Provider"
              searchPlaceholder="Cari provider..."
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
                      <p className="text-sm text-gray-600">Total Pembelian</p>
                      <InfoTooltip content="Total nilai pembelian dari semua Purchase Order (PO) dalam periode yang dipilih." />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(reportData.summary.totalPurchase)}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-sm text-gray-600">Total PO</p>
                      <InfoTooltip content="Jumlah total Purchase Order (PO) yang dibuat dalam periode yang dipilih." />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {reportData.summary.totalPOs}
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
                      <InfoTooltip content="Total jumlah unit produk yang dipesan (quantity) dari semua PO dalam periode yang dipilih." />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {reportData.summary.totalItems}
                    </p>
                  </div>
                  <Package className="h-8 w-8 text-purple-600" />
                </div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-sm text-gray-600">Rata-rata PO</p>
                      <InfoTooltip content="Nilai rata-rata per Purchase Order. Dihitung dengan rumus: Total Pembelian dibagi Total PO." />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(reportData.summary.averagePO)}
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
                filename={`laporan-pembelian-${startDate}-${endDate}`}
                title="Laporan Pembelian"
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
                      Total Pembelian
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Jumlah PO
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
                        {formatCurrency(row.purchase)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.pos}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.items}
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

