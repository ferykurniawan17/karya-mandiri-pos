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
import ExportButtons from './ExportButtons'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { Checkbox } from '@/components/ui/checkbox'
import { DollarSign, TrendingDown, TrendingUp, Percent } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface ProfitLossReportData {
  summary: {
    totalRevenue: number
    totalCOGS: number
    totalProfit: number
    profitMargin: number
  }
  data: Array<{
    period: string
    revenue: number
    cogs: number
    profit: number
    margin: number
  }>
}

export default function ProfitLossReport() {
  const [reportData, setReportData] = useState<ProfitLossReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
  )
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [groupBy, setGroupBy] = useState('day')
  const [chartItems, setChartItems] = useState({
    revenue: true,
    cogs: true,
    profit: true,
  })

  useEffect(() => {
    fetchReport()
  }, [startDate, endDate, groupBy])

  const fetchReport = async () => {
    try {
      setLoading(true)
      const url = `/api/reports/profit-loss?startDate=${startDate}&endDate=${endDate}&groupBy=${groupBy}`
      const response = await fetch(url)
      const data = await response.json()
      if (response.ok) {
        setReportData(data)
      }
    } catch (error) {
      console.error('Error fetching profit/loss report:', error)
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
        { header: 'COGS', dataKey: 'cogs' },
        { header: 'Profit', dataKey: 'profit' },
        { header: 'Margin (%)', dataKey: 'margin' },
      ]
    : []

  const exportData = reportData
    ? reportData.data.map((row) => ({
        period: row.period,
        revenue: formatCurrency(row.revenue),
        cogs: formatCurrency(row.cogs),
        profit: formatCurrency(row.profit),
        margin: `${row.margin.toFixed(2)}%`,
      }))
    : []

  const chartData = reportData
    ? reportData.data.map((row) => {
        const data: any = { period: row.period }
        if (chartItems.revenue) data.Revenue = row.revenue
        if (chartItems.cogs) data.COGS = row.cogs
        if (chartItems.profit) data.Profit = row.profit
        return data
      })
    : []

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Laporan Laba Rugi</h2>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                <SelectItem value="product">Produk</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading && <p className="text-gray-500">Memuat data...</p>}

        {reportData && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-sm text-gray-600">Total Revenue</p>
                      <InfoTooltip content="Total pendapatan dari semua transaksi penjualan yang sudah dibayar (paid) dalam periode yang dipilih." />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(reportData.summary.totalRevenue)}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-sm text-gray-600">Total COGS</p>
                      <InfoTooltip content="Cost of Goods Sold (Harga Pokok Penjualan): Total biaya pembelian produk yang terjual. Dihitung dari harga beli produk dikalikan jumlah yang terjual." />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(reportData.summary.totalCOGS)}
                    </p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-600" />
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-sm text-gray-600">Total Profit</p>
                      <InfoTooltip content="Laba bersih: Selisih antara Revenue (pendapatan) dikurangi COGS (harga pokok penjualan). Profit = Revenue - COGS" />
                    </div>
                    <p className={`text-2xl font-bold ${
                      reportData.summary.totalProfit >= 0 ? 'text-blue-900' : 'text-red-600'
                    }`}>
                      {formatCurrency(reportData.summary.totalProfit)}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-sm text-gray-600">Profit Margin</p>
                      <InfoTooltip content="Persentase laba dari pendapatan. Dihitung dengan rumus: (Profit / Revenue) × 100%. Semakin tinggi margin, semakin baik profitabilitas bisnis." />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {reportData.summary.profitMargin.toFixed(2)}%
                    </p>
                  </div>
                  <Percent className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Chart */}
            {chartData.length > 0 && (
              <div className="mb-6 bg-white p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Grafik Revenue vs COGS vs Profit</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="chart-revenue"
                        checked={chartItems.revenue}
                        onCheckedChange={(checked) =>
                          setChartItems({ ...chartItems, revenue: checked as boolean })
                        }
                      />
                      <label
                        htmlFor="chart-revenue"
                        className="text-sm font-medium text-gray-700 cursor-pointer flex items-center gap-1"
                      >
                        <div className="w-3 h-3 rounded bg-green-500"></div>
                        Revenue
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="chart-cogs"
                        checked={chartItems.cogs}
                        onCheckedChange={(checked) =>
                          setChartItems({ ...chartItems, cogs: checked as boolean })
                        }
                      />
                      <label
                        htmlFor="chart-cogs"
                        className="text-sm font-medium text-gray-700 cursor-pointer flex items-center gap-1"
                      >
                        <div className="w-3 h-3 rounded bg-red-500"></div>
                        COGS
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="chart-profit"
                        checked={chartItems.profit}
                        onCheckedChange={(checked) =>
                          setChartItems({ ...chartItems, profit: checked as boolean })
                        }
                      />
                      <label
                        htmlFor="chart-profit"
                        className="text-sm font-medium text-gray-700 cursor-pointer flex items-center gap-1"
                      >
                        <div className="w-3 h-3 rounded bg-blue-500"></div>
                        Profit
                      </label>
                    </div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    {chartItems.revenue && <Bar dataKey="Revenue" fill="#10b981" />}
                    {chartItems.cogs && <Bar dataKey="COGS" fill="#ef4444" />}
                    {chartItems.profit && <Bar dataKey="Profit" fill="#3b82f6" />}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Export Buttons */}
            <div className="mb-4">
              <ExportButtons
                data={exportData}
                columns={exportColumns}
                filename={`laporan-laba-rugi-${startDate}-${endDate}`}
                title="Laporan Laba Rugi"
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
                      <div className="flex items-center gap-1">
                        Revenue
                        <InfoTooltip content="Total pendapatan dari transaksi penjualan" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center gap-1">
                        COGS
                        <InfoTooltip content="Cost of Goods Sold: Total biaya pembelian produk yang terjual (Harga Beli × Jumlah Terjual)" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center gap-1">
                        Profit
                        <InfoTooltip content="Laba bersih: Revenue dikurangi COGS" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center gap-1">
                        Margin (%)
                        <InfoTooltip content="Persentase laba dari pendapatan: (Profit / Revenue) × 100%" />
                      </div>
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
                        {formatCurrency(row.cogs)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        row.profit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(row.profit)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.margin.toFixed(2)}%
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

