'use client'

import { useState, useEffect } from 'react'

interface SyncStatus {
  status: 'idle' | 'syncing' | 'success' | 'error'
  lastSync?: string
  error?: string
  syncedItems?: {
    products: number
    categories: number
    transactions: number
  }
}

export default function SyncStatus() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ status: 'idle' })
  const [isSyncing, setIsSyncing] = useState(false)

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/sync')
      const data = await response.json()
      if (response.ok) {
        setSyncStatus(data)
      }
    } catch (err) {
      console.error('Error fetching sync status:', err)
    }
  }

  useEffect(() => {
    fetchStatus()
    // Check sync status every 5 minutes
    const interval = setInterval(fetchStatus, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const handleSync = async (direction: 'push' | 'pull' = 'push') => {
    setIsSyncing(true)
    setSyncStatus({ status: 'syncing' })

    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ direction }),
      })

      const data = await response.json()

      if (response.ok) {
        setSyncStatus(data)
        if (data.status === 'success') {
          // Refresh the page to show updated data
          setTimeout(() => {
            window.location.reload()
          }, 1000)
        }
      } else {
        setSyncStatus({
          status: 'error',
          error: data.error || 'Gagal melakukan sync',
        })
      }
    } catch (err: any) {
      setSyncStatus({
        status: 'error',
        error: err.message || 'Terjadi kesalahan',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const getStatusColor = () => {
    switch (syncStatus.status) {
      case 'syncing':
        return 'text-yellow-600'
      case 'success':
        return 'text-green-600'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusIcon = () => {
    switch (syncStatus.status) {
      case 'syncing':
        return '⏳'
      case 'success':
        return '✓'
      case 'error':
        return '✗'
      default:
        return '○'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className={getStatusColor()}>{getStatusIcon()}</span>
          <h3 className="font-semibold text-gray-900">Sync Status</h3>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => handleSync('push')}
            disabled={isSyncing}
            className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSyncing ? 'Syncing...' : 'Sync Up'}
          </button>
          <button
            onClick={() => handleSync('pull')}
            disabled={isSyncing}
            className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
          >
            {isSyncing ? 'Syncing...' : 'Sync Down'}
          </button>
        </div>
      </div>

      {syncStatus.lastSync && (
        <p className="text-xs text-gray-500 mb-2">
          Last sync: {new Date(syncStatus.lastSync).toLocaleString('id-ID')}
        </p>
      )}

      {syncStatus.error && (
        <p className="text-xs text-red-600 mb-2">{syncStatus.error}</p>
      )}

      {syncStatus.syncedItems && (
        <div className="text-xs text-gray-600 space-y-1">
          <p>Synced: {syncStatus.syncedItems.products} products, {syncStatus.syncedItems.categories} categories, {syncStatus.syncedItems.transactions} transactions</p>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-2">
        Sync akan berjalan otomatis setiap hari pada pukul 00:00
      </p>
    </div>
  )
}

