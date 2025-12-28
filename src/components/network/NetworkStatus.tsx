'use client'

import { useState, useEffect } from 'react'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { getSyncQueueStats } from '@/lib/sync-queue'
import { apiClient } from '@/lib/api-client'

export default function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStats, setSyncStats] = useState({
    pending: 0,
    processing: 0,
    failed: 0,
  })
  const [lastSync, setLastSync] = useState<Date | null>(null)

  useEffect(() => {
    // Initial online status
    setIsOnline(navigator.onLine)

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true)
      // Auto-sync when coming back online
      handleSync()
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Load sync stats
    loadSyncStats()

    // Poll sync stats every 5 seconds
    const interval = setInterval(loadSyncStats, 5000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  const loadSyncStats = async () => {
    try {
      const stats = await getSyncQueueStats()
      setSyncStats(stats)
    } catch (error) {
      console.error('Error loading sync stats:', error)
    }
  }

  const handleSync = async () => {
    if (!isOnline || isSyncing) return

    setIsSyncing(true)
    try {
      await apiClient.syncQueue()
      setLastSync(new Date())
      await loadSyncStats()
    } catch (error) {
      console.error('Sync error:', error)
    } finally {
      setIsSyncing(false)
    }
  }

  const totalPending = syncStats.pending + syncStats.processing

  return (
    <div className="flex items-center gap-2 text-sm">
      {isOnline ? (
        <Wifi className="h-4 w-4 text-green-600" />
      ) : (
        <WifiOff className="h-4 w-4 text-red-600" />
      )}
      <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
        {isOnline ? 'Online' : 'Offline'}
      </span>
      {totalPending > 0 && (
        <>
          <span className="text-gray-400">•</span>
          <span className="text-yellow-600">
            {totalPending} pending sync
          </span>
          {isOnline && (
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="ml-2 p-1 hover:bg-gray-100 rounded transition-colors"
              title="Sync now"
            >
              <RefreshCw
                className={`h-4 w-4 text-blue-600 ${
                  isSyncing ? 'animate-spin' : ''
                }`}
              />
            </button>
          )}
        </>
      )}
      {syncStats.failed > 0 && (
        <>
          <span className="text-gray-400">•</span>
          <span className="text-red-600">{syncStats.failed} failed</span>
        </>
      )}
      {lastSync && (
        <>
          <span className="text-gray-400">•</span>
          <span className="text-gray-500 text-xs">
            Last sync: {lastSync.toLocaleTimeString()}
          </span>
        </>
      )}
    </div>
  )
}

