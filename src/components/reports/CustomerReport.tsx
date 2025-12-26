'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ExportButtons from './ExportButtons'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { Users, DollarSign, CreditCard, Calendar } from 'lucide-react'
import Link from 'next/link'

interface CustomerReportData {
  summary: {
    totalCustomers: number
    totalRevenue: number
    totalOutstandingCredit: number
  }
  customers: Array<{
    customerId: string
    customerName: string
    customerType: string
    totalTransactions: number
    totalRevenue: number
    outstandingCredit: number
    lastTransactionDate: Date | null
  }>
}

export default function CustomerReport() {
  const [reportData, setReportData] = useState<CustomerReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  useEffect(() => {
    fetchReport()
  }, [startDate, endDate])

  const fetchReport = async () => {
    try {
      setLoading(true)
      let url = '/api/reports/customers'
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      if (params.toString()) url += `?${params.toString()}`

      const response = await fetch(url)
      const data = await response.json()
      if (response.ok) {
        setReportData(data)
      }
    } catch (error) {
      console.error('Error fetching customer report:', error)
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

  const formatDate = (date: Date | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('id-ID')
  }

  const exportColumns = [
    { header: 'Customer', dataKey: 'customerName' },
    { header: 'Tipe', dataKey: 'customerType' },
    { header: 'Total Transaksi', dataKey: 'totalTransactions' },
    { header: 'Total Revenue', dataKey: 'totalRevenue' },
    { header: 'Outstanding Credit', dataKey: 'outstandingCredit' },
    { header: 'Last Transaction', dataKey: 'lastTransactionDate' },
  ]

  const exportData = reportData
    ? reportData.customers.map((row) => ({
        customerName: row.customerName,
        customerType: row.customerType === 'individual' ? 'Individu' : 'Institusi',
        totalTransactions: row.totalTransactions,
        totalRevenue: formatCurrency(row.totalRevenue),
        outstandingCredit: formatCurrency(row.outstandingCredit),
        lastTransactionDate: formatDate(row.lastTransactionDate),
      }))
    : []

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Laporan Customer</h2>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <Label>Tanggal Mulai (Opsional)</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Tanggal Akhir (Opsional)</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        {loading && <p className="text-gray-500">Memuat data...</p>}

        {reportData && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-sm text-gray-600">Total Customer</p>
                      <InfoTooltip content="Jumlah total pelanggan yang memiliki transaksi dalam periode yang dipilih." />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {reportData.summary.totalCustomers}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-sm text-gray-600">Total Revenue</p>
                      <InfoTooltip content="Total pendapatan dari semua transaksi pelanggan dalam periode yang dipilih." />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(reportData.summary.totalRevenue)}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-sm text-gray-600">Outstanding Credit</p>
                      <InfoTooltip content="Total piutang yang belum dibayar (unpaid) atau sebagian dibayar (partial) dari semua pelanggan." />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(reportData.summary.totalOutstandingCredit)}
                    </p>
                  </div>
                  <CreditCard className="h-8 w-8 text-yellow-600" />
                </div>
              </div>
            </div>

            {/* Export Buttons */}
            <div className="mb-4">
              <ExportButtons
                data={exportData}
                columns={exportColumns}
                filename={`laporan-customer-${new Date().toISOString().split('T')[0]}`}
                title="Laporan Customer"
              />
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipe
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Transaksi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Outstanding Credit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Transaction
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.customers.map((row, index) => (
                    <tr
                      key={index}
                      className={`hover:bg-gray-50 ${
                        row.outstandingCredit > 0 ? 'bg-yellow-50' : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <Link
                          href={`/customers/${row.customerId}`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          {row.customerName}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.customerType === 'individual' ? 'Individu' : 'Institusi'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.totalTransactions}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(row.totalRevenue)}
                      </td>
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                          row.outstandingCredit > 0 ? 'text-red-600' : 'text-gray-900'
                        }`}
                      >
                        {formatCurrency(row.outstandingCredit)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(row.lastTransactionDate)}
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

