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
import { DollarSign, CreditCard, Users, FileText, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface DebtReportData {
  summary: {
    totalDebt: number
    totalUnpaid: number
    totalPartial: number
    totalTransactions: number
    totalCustomers: number
  }
  transactions: Array<{
    id: string
    invoiceNo: string
    total: number
    credit: number
    cash: number
    paymentStatus: string
    paymentMethod: string | null
    createdAt: Date
    customer: {
      id: string
      name: string
      type: string
      phone: string | null
      email: string | null
    } | null
    project: {
      id: string
      name: string
    } | null
    user: {
      id: string
      name: string
      username: string
    }
    items: Array<{
      id: string
      product: {
        id: string
        name: string
        sku: string | null
      }
      sellingUnit: {
        id: string
        name: string
        unit: string
      } | null
      quantity: number
      price: number
      subtotal: number
    }>
  }>
  customerDebts: Array<{
    customerId: string
    customerName: string
    customerType: string
    customerPhone: string | null
    customerEmail: string | null
    totalDebt: number
    transactionCount: number
    transactions: any[]
  }>
}

export default function DebtReport() {
  const [reportData, setReportData] = useState<DebtReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [customerId, setCustomerId] = useState<string | undefined>()
  const [paymentStatus, setPaymentStatus] = useState<string>('unpaid')
  const [viewMode, setViewMode] = useState<'transactions' | 'customers'>('transactions')
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    fetchCustomers()
  }, [])

  useEffect(() => {
    fetchReport()
  }, [startDate, endDate, customerId, paymentStatus])

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
      let url = '/api/reports/debts'
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      if (customerId) params.append('customerId', customerId)
      if (paymentStatus) params.append('paymentStatus', paymentStatus)
      if (params.toString()) url += `?${params.toString()}`

      const response = await fetch(url)
      const data = await response.json()
      if (response.ok) {
        setReportData(data)
      }
    } catch (err) {
      console.error('Error fetching debt report:', err)
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

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const exportData = () => {
    if (!reportData) return []

    if (viewMode === 'transactions') {
      return reportData.transactions.map((t) => ({
        'No. Invoice': t.invoiceNo,
        'Tanggal': formatDate(t.createdAt),
        'Pelanggan': t.customer?.name || '-',
        'Tipe Pelanggan': t.customer?.type === 'individual' ? 'Perorangan' : 'Instansi',
        'Proyek': t.project?.name || '-',
        'Total': t.total,
        'Hutang': t.credit,
        'Status Pembayaran': t.paymentStatus === 'unpaid' ? 'Belum Lunas' : 'Sebagian',
        'Metode Pembayaran': t.paymentMethod || '-',
        'Kasir': t.user.name,
      }))
    } else {
      return reportData.customerDebts.map((c) => ({
        'Nama Pelanggan': c.customerName,
        'Tipe': c.customerType === 'individual' ? 'Perorangan' : 'Instansi',
        'Telepon': c.customerPhone || '-',
        'Email': c.customerEmail || '-',
        'Total Hutang': c.totalDebt,
        'Jumlah Transaksi': c.transactionCount,
      }))
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {reportData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Hutang</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {formatCurrency(reportData.summary.totalDebt)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-red-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Belum Lunas</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">
                  {formatCurrency(reportData.summary.totalUnpaid)}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sebagian Lunas</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">
                  {formatCurrency(reportData.summary.totalPartial)}
                </p>
              </div>
              <CreditCard className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Transaksi</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {reportData.summary.totalTransactions}
                </p>
              </div>
              <FileText className="h-8 w-8 text-gray-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Pelanggan</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {reportData.summary.totalCustomers}
                </p>
              </div>
              <Users className="h-8 w-8 text-gray-500" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <Label htmlFor="startDate">Tanggal Mulai</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="endDate">Tanggal Akhir</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="customer">Pelanggan</Label>
            <AutocompleteSelect
              options={customers.map((c) => ({ id: c.id, name: c.name }))}
              value={customerId}
              onValueChange={setCustomerId}
              placeholder="Semua pelanggan"
              searchPlaceholder="Cari pelanggan..."
            />
          </div>
          <div>
            <Label htmlFor="paymentStatus">Status Pembayaran</Label>
            <Select value={paymentStatus} onValueChange={setPaymentStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unpaid">Belum Lunas</SelectItem>
                <SelectItem value="partial">Sebagian Lunas</SelectItem>
                <SelectItem value="all">Semua Hutang</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="viewMode">Tampilan</Label>
            <Select value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transactions">Per Transaksi</SelectItem>
                <SelectItem value="customers">Per Pelanggan</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Export Buttons */}
      {reportData && (
        <div className="flex justify-end">
          <ExportButtons data={exportData()} filename="laporan-hutang" />
        </div>
      )}

      {/* Data Table */}
      {loading ? (
        <div className="text-center py-8">Memuat data...</div>
      ) : reportData ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {viewMode === 'transactions' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      No. Invoice
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tanggal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pelanggan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Proyek
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hutang
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kasir
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <Link
                          href={`/transactions?invoice=${transaction.invoiceNo}`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          {transaction.invoiceNo}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(transaction.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.customer ? (
                          <Link
                            href={`/customers/${transaction.customer.id}`}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            {transaction.customer.name}
                          </Link>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transaction.project?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {formatCurrency(transaction.total)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-red-600">
                        {formatCurrency(transaction.credit)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            transaction.paymentStatus === 'unpaid'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {transaction.paymentStatus === 'unpaid' ? 'Belum Lunas' : 'Sebagian'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transaction.user.name}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pelanggan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipe
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kontak
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Hutang
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Jumlah Transaksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.customerDebts.map((customer) => (
                    <tr key={customer.customerId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <Link
                          href={`/customers/${customer.customerId}`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          {customer.customerName}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {customer.customerType === 'individual' ? 'Perorangan' : 'Instansi'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>
                          {customer.customerPhone && (
                            <div>{customer.customerPhone}</div>
                          )}
                          {customer.customerEmail && (
                            <div className="text-xs text-gray-400">{customer.customerEmail}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-red-600">
                        {formatCurrency(customer.totalDebt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {customer.transactionCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">Tidak ada data</div>
      )}
    </div>
  )
}

