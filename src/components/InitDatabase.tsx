'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function InitDatabase() {
  const router = useRouter()
  const [initializing, setInitializing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    checkAndInitialize()
  }, [])

  const checkAndInitialize = async () => {
    try {
      // Check if database is initialized
      const checkResponse = await fetch('/api/init-db')
      const checkData = await checkResponse.json()

      if (checkData.initialized) {
        setInitializing(false)
        setChecking(false)
        return
      }

      // If needs schema, try to initialize it
      // In production, this should not happen if template database is bundled
      if (checkData.needsSchema) {
        // Try to push schema via API (if possible)
        // For now, show helpful error message
        setError('Database schema tidak ditemukan. Silakan restart aplikasi atau hubungi administrator.')
        setInitializing(false)
        setChecking(false)
        return
      }

      setChecking(false)
      
      // Initialize database (create default users)
      const initResponse = await fetch('/api/init-db', {
        method: 'POST',
      })
      const initData = await initResponse.json()

      if (initData.success) {
        setInitializing(false)
        // Small delay to ensure database is ready
        setTimeout(() => {
          router.refresh()
        }, 500)
      } else {
        setError(initData.error || 'Gagal menginisialisasi database')
        setInitializing(false)
      }
    } catch (err: any) {
      setError(err.message || 'Gagal menginisialisasi database')
      setInitializing(false)
      setChecking(false)
    }
  }

  if (checking || initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {checking ? 'Memeriksa database...' : 'Menginisialisasi database...'}
          </p>
          <p className="mt-2 text-sm text-gray-500">
            {checking ? '' : 'Membuat user default (admin/cashier)...'}
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-6 rounded-lg shadow-md">
          <div className="text-center">
            <div className="text-red-600 text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Error Inisialisasi Database</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

