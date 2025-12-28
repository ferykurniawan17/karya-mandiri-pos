import { getDB, dbOperations } from './indexeddb'

export interface SyncQueueItem {
  id?: number
  operation: 'create' | 'update' | 'delete'
  entity: string
  entityId: string
  data: any
  timestamp: string
  retries: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error?: string
}

const MAX_RETRIES = 3

/**
 * Add operation to sync queue
 */
export async function addToSyncQueue(
  operation: 'create' | 'update' | 'delete',
  entity: string,
  entityId: string,
  data: any
): Promise<number> {
  const db = await getDB()
  const queueItem: Omit<SyncQueueItem, 'id'> = {
    operation,
    entity,
    entityId,
    data,
    timestamp: new Date().toISOString(),
    retries: 0,
    status: 'pending',
  }
  const id = await db.add('syncQueue', queueItem as any)
  return id as number
}

/**
 * Get all pending sync queue items
 */
export async function getPendingSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await getDB()
  const index = db.transaction('syncQueue').store.index('by-status')
  const items = await index.getAll('pending')
  return items as SyncQueueItem[]
}

/**
 * Get sync queue items by entity
 */
export async function getSyncQueueByEntity(
  entity: string
): Promise<SyncQueueItem[]> {
  const db = await getDB()
  const index = db.transaction('syncQueue').store.index('by-entity')
  const items = await index.getAll(entity)
  return items.filter((item) => item.status === 'pending') as SyncQueueItem[]
}

/**
 * Update sync queue item status
 */
export async function updateSyncQueueItem(
  id: number,
  updates: Partial<SyncQueueItem>
): Promise<void> {
  const db = await getDB()
  const item = await db.get('syncQueue', id)
  if (item) {
    await db.put('syncQueue', { ...item, ...updates } as any)
  }
}

/**
 * Mark sync queue item as processing
 */
export async function markSyncQueueProcessing(id: number): Promise<void> {
  await updateSyncQueueItem(id, { status: 'processing' })
}

/**
 * Mark sync queue item as completed
 */
export async function markSyncQueueCompleted(id: number): Promise<void> {
  const db = await getDB()
  await db.delete('syncQueue', id)
}

/**
 * Mark sync queue item as failed
 */
export async function markSyncQueueFailed(
  id: number,
  error: string
): Promise<void> {
  const db = await getDB()
  const item = await db.get('syncQueue', id)
  if (item) {
    const retries = (item.retries || 0) + 1
    if (retries >= MAX_RETRIES) {
      // Max retries reached, mark as failed permanently
      await db.put('syncQueue', {
        ...item,
        status: 'failed',
        retries,
        error,
      } as any)
    } else {
      // Retry again later
      await db.put('syncQueue', {
        ...item,
        status: 'pending',
        retries,
        error,
      } as any)
    }
  }
}

/**
 * Get sync queue statistics
 */
export async function getSyncQueueStats(): Promise<{
  pending: number
  processing: number
  failed: number
}> {
  const db = await getDB()
  const allItems = await db.getAll('syncQueue')
  return {
    pending: allItems.filter((item) => item.status === 'pending').length,
    processing: allItems.filter((item) => item.status === 'processing').length,
    failed: allItems.filter((item) => item.status === 'failed').length,
  }
}

/**
 * Clear completed sync queue items
 */
export async function clearCompletedSyncQueue(): Promise<void> {
  const db = await getDB()
  const allItems = await db.getAll('syncQueue')
  const completedItems = allItems.filter(
    (item) => item.status === 'completed'
  )
  for (const item of completedItems) {
    await db.delete('syncQueue', item.id!)
  }
}

/**
 * Retry failed sync queue items
 */
export async function retryFailedSyncQueue(): Promise<void> {
  const db = await getDB()
  const allItems = await db.getAll('syncQueue')
  const failedItems = allItems.filter((item) => item.status === 'failed')
  for (const item of failedItems) {
    if (item.retries < MAX_RETRIES) {
      await db.put('syncQueue', {
        ...item,
        status: 'pending',
        error: undefined,
      } as any)
    }
  }
}

