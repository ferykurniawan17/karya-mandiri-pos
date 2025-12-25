import { prisma } from './db'

export interface SyncConfig {
  cloudUrl: string
  apiKey?: string
}

export interface SyncStatus {
  status: 'idle' | 'syncing' | 'success' | 'error'
  lastSync?: Date
  error?: string
  syncedItems?: {
    products: number
    categories: number
    transactions: number
  }
}

// Default sync config - should be configured via environment variables
const defaultSyncConfig: SyncConfig = {
  cloudUrl: process.env.NEXT_PUBLIC_SYNC_URL || '',
  apiKey: process.env.SYNC_API_KEY || '',
}

export async function syncToCloud(config: SyncConfig = defaultSyncConfig): Promise<SyncStatus> {
  if (!config.cloudUrl) {
    return {
      status: 'error',
      error: 'Cloud URL tidak dikonfigurasi',
    }
  }

  try {
    // Fetch all data to sync
    const [products, categories, transactions] = await Promise.all([
      prisma.product.findMany({
        include: {
          category: true,
        },
      }),
      prisma.category.findMany(),
      prisma.transaction.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
          items: {
            include: {
              product: {
                include: {
                  category: true,
                },
              },
            },
          },
        },
      }),
    ])

    // Prepare sync payload
    const payload = {
      products,
      categories,
      transactions,
      timestamp: new Date().toISOString(),
    }

    // Send to cloud server
    const response = await fetch(`${config.cloudUrl}/api/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` }),
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      return {
        status: 'error',
        error: errorData.error || `HTTP ${response.status}`,
      }
    }

    const result = await response.json()

    // Handle conflicts if any
    if (result.conflicts && result.conflicts.length > 0) {
      // Resolve conflicts (for now, we'll use local data)
      // In production, you might want to implement more sophisticated conflict resolution
      console.warn('Conflicts detected:', result.conflicts)
    }

    return {
      status: 'success',
      lastSync: new Date(),
      syncedItems: {
        products: products.length,
        categories: categories.length,
        transactions: transactions.length,
      },
    }
  } catch (error: any) {
    return {
      status: 'error',
      error: error.message || 'Gagal melakukan sync',
    }
  }
}

export async function syncFromCloud(config: SyncConfig = defaultSyncConfig): Promise<SyncStatus> {
  if (!config.cloudUrl) {
    return {
      status: 'error',
      error: 'Cloud URL tidak dikonfigurasi',
    }
  }

  try {
    // Fetch data from cloud
    const response = await fetch(`${config.cloudUrl}/api/sync/pull`, {
      method: 'GET',
      headers: {
        ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` }),
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      return {
        status: 'error',
        error: errorData.error || `HTTP ${response.status}`,
      }
    }

    const data = await response.json()

    // Apply updates (with conflict resolution)
    // This is a simplified version - in production, you'd want more sophisticated merging
    if (data.products) {
      for (const product of data.products) {
        await prisma.product.upsert({
          where: { id: product.id },
          update: product,
          create: product,
        })
      }
    }

    if (data.categories) {
      for (const category of data.categories) {
        await prisma.category.upsert({
          where: { id: category.id },
          update: category,
          create: category,
        })
      }
    }

    return {
      status: 'success',
      lastSync: new Date(),
    }
  } catch (error: any) {
    return {
      status: 'error',
      error: error.message || 'Gagal melakukan sync',
    }
  }
}

