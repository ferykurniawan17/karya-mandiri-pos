import { getDB, dbOperations } from './indexeddb'
import { addToSyncQueue } from './sync-queue'

/**
 * Check if device is online
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine
}

/**
 * Data store that abstracts IndexedDB vs API
 * Implements offline-first pattern
 */
export class DataStore {
  /**
   * Get data from IndexedDB or API
   * Offline-first: Try IndexedDB first, then API if online
   */
  async get<T>(
    storeName: string,
    key: string,
    fetchFromAPI?: () => Promise<T>
  ): Promise<T | null> {
    // Always try IndexedDB first (offline-first)
    const cached = await dbOperations.get(storeName as any, key)
    if (cached) {
      // If online and we have a fetch function, update in background
      if (isOnline() && fetchFromAPI) {
        fetchFromAPI()
          .then((data) => {
            if (data) {
              dbOperations.put(storeName as any, {
                ...data,
                syncedAt: new Date().toISOString(),
                syncStatus: 'synced',
              } as any)
            }
          })
          .catch(console.error)
      }
      return cached as T
    }

    // If not in cache and online, fetch from API
    if (isOnline() && fetchFromAPI) {
      try {
        const data = await fetchFromAPI()
        if (data) {
          await dbOperations.put(storeName as any, {
            ...data,
            syncedAt: new Date().toISOString(),
            syncStatus: 'synced',
          } as any)
        }
        return data
      } catch (error) {
        console.error(`Error fetching ${storeName}/${key} from API:`, error)
        return null
      }
    }

    return null
  }

  /**
   * Get all items from store
   */
  async getAll<T>(storeName: string): Promise<T[]> {
    return (await dbOperations.getAll(storeName as any)) as T[]
  }

  /**
   * Save data to IndexedDB and queue for sync
   */
  async save<T>(
    storeName: string,
    data: T & { id: string },
    syncToAPI?: (data: T) => Promise<T>
  ): Promise<T> {
    // Save to IndexedDB immediately
    await dbOperations.put(storeName as any, {
      ...data,
      syncStatus: 'pending',
    } as any)

    // If online, sync immediately
    if (isOnline() && syncToAPI) {
      try {
        const syncedData = await syncToAPI(data)
        await dbOperations.put(storeName as any, {
          ...syncedData,
          syncedAt: new Date().toISOString(),
          syncStatus: 'synced',
        } as any)
        return syncedData
      } catch (error) {
        console.error(`Error syncing ${storeName}/${(data as any).id}:`, error)
        // Queue for later sync
        await addToSyncQueue('update', storeName, (data as any).id, data)
        throw error
      }
    } else {
      // Queue for sync when online
      await addToSyncQueue('update', storeName, (data as any).id, data)
    }

    return data
  }

  /**
   * Create new item
   */
  async create<T>(
    storeName: string,
    data: T & { id: string },
    createInAPI?: (data: T) => Promise<T>
  ): Promise<T> {
    // Save to IndexedDB immediately
    await dbOperations.put(storeName as any, {
      ...data,
      syncStatus: 'pending',
    } as any)

    // If online, create in API immediately
    if (isOnline() && createInAPI) {
      try {
        const createdData = await createInAPI(data)
        await dbOperations.put(storeName as any, {
          ...createdData,
          syncedAt: new Date().toISOString(),
          syncStatus: 'synced',
        } as any)
        return createdData
      } catch (error) {
        console.error(`Error creating ${storeName}:`, error)
        // Queue for later sync
        await addToSyncQueue('create', storeName, (data as any).id, data)
        throw error
      }
    } else {
      // Queue for sync when online
      await addToSyncQueue('create', storeName, (data as any).id, data)
    }

    return data
  }

  /**
   * Delete item
   */
  async delete(
    storeName: string,
    key: string,
    deleteFromAPI?: (key: string) => Promise<void>
  ): Promise<void> {
    // Delete from IndexedDB immediately
    await dbOperations.delete(storeName as any, key)

    // If online, delete from API immediately
    if (isOnline() && deleteFromAPI) {
      try {
        await deleteFromAPI(key)
      } catch (error) {
        console.error(`Error deleting ${storeName}/${key}:`, error)
        // Queue for later sync
        await addToSyncQueue('delete', storeName, key, { id: key })
        throw error
      }
    } else {
      // Queue for sync when online
      await addToSyncQueue('delete', storeName, key, { id: key })
    }
  }

  /**
   * Sync all pending items
   */
  async syncPending(): Promise<void> {
    if (!isOnline()) {
      return
    }

    const { getPendingSyncQueue, markSyncQueueProcessing, markSyncQueueCompleted, markSyncQueueFailed } = await import('./sync-queue')
    const pending = await getPendingSyncQueue()

    for (const item of pending) {
      await markSyncQueueProcessing(item.id!)
      try {
        // Sync logic will be handled by api-client
        // This is just a placeholder
        await markSyncQueueCompleted(item.id!)
      } catch (error: any) {
        await markSyncQueueFailed(item.id!, error.message)
      }
    }
  }
}

// Singleton instance
export const dataStore = new DataStore()

