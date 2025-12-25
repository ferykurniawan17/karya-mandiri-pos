'use client'

import { useState, useEffect } from 'react'

interface Transaction {
  id: string
  invoiceNo: string
  total: number
  cash: number
  change: number
  user: {
    name: string
  }
  items: {
    id: string
    product: {
      name: string
    }
    quantity: number
    price: number
    subtotal: number
  }[]
  createdAt: Date
}

export default function TransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)

  useEffect(() => {
    fetchTransactions()
  }, [])

  const fetchTransactions = async () => {
    try {
      const response = await fetch('/api/transactions?limit=100')
      const data = await response.json()
      if (response.ok) {
        setTransactions(data.transactions)
      }
      setLoading(false)
    } catch (err) {
      console.error('Error fetching transactions:', err)
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

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Memuat...</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {transactions.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            Belum ada transaksi
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {transactions.map((transaction) => (
              <li key={transaction.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {transaction.invoiceNo}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(transaction.createdAt).toLocaleString('id-ID')} • {transaction.user.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {transaction.items.length} item
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(transaction.total)}
                    </p>
                    <button
                      onClick={() => setSelectedTransaction(transaction)}
                      className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                    >
                      Detail
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Detail Transaksi</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>No. Invoice:</span>
                <span className="font-semibold">{selectedTransaction.invoiceNo}</span>
              </div>
              <div className="flex justify-between">
                <span>Tanggal:</span>
                <span>{new Date(selectedTransaction.createdAt).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span>Kasir:</span>
                <span>{selectedTransaction.user.name}</span>
              </div>
              <hr className="my-3" />
              {selectedTransaction.items.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <div>
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-xs text-gray-500">
                      {item.quantity} x {formatCurrency(item.price)}
                    </p>
                  </div>
                  <span>{formatCurrency(item.subtotal)}</span>
                </div>
              ))}
              <hr className="my-3" />
              <div className="flex justify-between font-semibold">
                <span>Total:</span>
                <span>{formatCurrency(selectedTransaction.total)}</span>
              </div>
              <div className="flex justify-between">
                <span>Bayar:</span>
                <span>{formatCurrency(selectedTransaction.cash)}</span>
              </div>
              <div className="flex justify-between font-semibold text-lg">
                <span>Kembalian:</span>
                <span>{formatCurrency(selectedTransaction.change)}</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedTransaction(null)}
              className="mt-6 w-full bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

