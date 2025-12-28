import { isOnline } from './data-store'
import { addToSyncQueue, getPendingSyncQueue, markSyncQueueCompleted, markSyncQueueFailed, markSyncQueueProcessing } from './sync-queue'
import { dbOperations } from './indexeddb'

export interface APIResponse<T> {
  data?: T
  error?: string
  offline?: boolean
}

/**
 * API Client that handles offline/online scenarios
 */
export class APIClient {
  private baseURL: string

  constructor(baseURL: string = '') {
    this.baseURL = baseURL
  }

  /**
   * Generic fetch wrapper with offline handling
   */
  async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    const url = `${this.baseURL}${endpoint}`
    
    // If offline, return cached data or queue request
    if (!isOnline()) {
      // Try to get from IndexedDB cache
      const cacheKey = `api:${endpoint}:${JSON.stringify(options)}`
      // For now, return offline indicator
      // Actual caching will be handled by service worker
      return {
        error: 'Offline',
        offline: true,
      } as APIResponse<T>
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: `HTTP ${response.status}`,
        }))
        return {
          error: errorData.error || `HTTP ${response.status}`,
        } as APIResponse<T>
      }

      const data = await response.json()
      return { data } as APIResponse<T>
    } catch (error: any) {
      console.error(`API Error [${endpoint}]:`, error)
      
      // If network error and we have a queue, add to queue
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        // Queue for retry
        if (options.method && options.method !== 'GET') {
          const body = options.body ? JSON.parse(options.body as string) : {}
          await addToSyncQueue(
            options.method === 'DELETE' ? 'delete' : 'update',
            endpoint.split('/')[2] || 'unknown',
            body.id || 'unknown',
            body
          )
        }
      }

      return {
        error: error.message || 'Network error',
        offline: !isOnline(),
      } as APIResponse<T>
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<APIResponse<T>> {
    return this.fetch<T>(endpoint, { method: 'GET' })
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data: any): Promise<APIResponse<T>> {
    if (!isOnline()) {
      // Queue for sync
      await addToSyncQueue('create', endpoint.split('/')[2] || 'unknown', data.id || 'temp', data)
      return { data: data as T, offline: true } as APIResponse<T>
    }

    return this.fetch<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data: any): Promise<APIResponse<T>> {
    if (!isOnline()) {
      // Queue for sync
      await addToSyncQueue('update', endpoint.split('/')[2] || 'unknown', data.id, data)
      return { data: data as T, offline: true } as APIResponse<T>
    }

    return this.fetch<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, id: string): Promise<APIResponse<T>> {
    if (!isOnline()) {
      // Queue for sync
      await addToSyncQueue('delete', endpoint.split('/')[2] || 'unknown', id, { id })
      return { offline: true } as APIResponse<T>
    }

    return this.fetch<T>(`${endpoint}/${id}`, {
      method: 'DELETE',
    })
  }

  /**
   * Sync pending queue items
   */
  async syncQueue(): Promise<void> {
    if (!isOnline()) {
      return
    }

    const pending = await getPendingSyncQueue()

    for (const item of pending) {
      await markSyncQueueProcessing(item.id!)
      try {
        let response: APIResponse<any>

        switch (item.operation) {
          case 'create':
            response = await this.post(`/api/${item.entity}`, item.data)
            break
          case 'update':
            response = await this.put(`/api/${item.entity}/${item.entityId}`, item.data)
            break
          case 'delete':
            response = await this.delete(`/api/${item.entity}`, item.entityId)
            break
        }

        if (response.error && !response.offline) {
          throw new Error(response.error)
        }

        await markSyncQueueCompleted(item.id!)
      } catch (error: any) {
        await markSyncQueueFailed(item.id!, error.message)
      }
    }
  }
}

// Singleton instance
export const apiClient = new APIClient()

