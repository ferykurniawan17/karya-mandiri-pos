import { openDB, DBSchema, IDBPDatabase } from 'idb'

// IndexedDB Schema
interface POSDatabase extends DBSchema {
  products: {
    key: string
    value: {
      id: string
      name: string
      aliasName?: string | null
      sku?: string | null
      stock: number
      minimalStock: number
      unit: string
      productType: string
      baseUnit?: string | null
      baseStock?: number | null
      minimalBaseStock?: number | null
      purchaseUnit?: string | null
      purchasePrice?: number | null
      sellingPrice: number
      photo?: string | null
      placement?: string | null
      categoryId: string
      brandId?: string | null
      tagIds: string[]
      sellingUnits?: any[]
      createdAt: string
      updatedAt: string
      syncedAt?: string
      syncStatus?: 'pending' | 'synced' | 'error'
    }
    indexes: { 'by-sku': string; 'by-category': string; 'by-synced': string }
  }
  categories: {
    key: string
    value: {
      id: string
      name: string
      description?: string | null
      createdAt: string
      syncedAt?: string
      syncStatus?: 'pending' | 'synced' | 'error'
    }
    indexes: { 'by-synced': string }
  }
  tags: {
    key: string
    value: {
      id: string
      name: string
      createdAt: string
      syncedAt?: string
      syncStatus?: 'pending' | 'synced' | 'error'
    }
    indexes: { 'by-synced': string }
  }
  brands: {
    key: string
    value: {
      id: string
      name: string
      photo?: string | null
      createdAt: string
      syncedAt?: string
      syncStatus?: 'pending' | 'synced' | 'error'
    }
    indexes: { 'by-synced': string }
  }
  customers: {
    key: string
    value: {
      id: string
      name: string
      type: string
      phone?: string | null
      email?: string | null
      address?: string | null
      notes?: string | null
      createdAt: string
      updatedAt: string
      syncedAt?: string
      syncStatus?: 'pending' | 'synced' | 'error'
    }
    indexes: { 'by-synced': string }
  }
  projects: {
    key: string
    value: {
      id: string
      name: string
      customerId: string
      isDefault: boolean
      description?: string | null
      createdAt: string
      updatedAt: string
      syncedAt?: string
      syncStatus?: 'pending' | 'synced' | 'error'
    }
    indexes: { 'by-customer': string; 'by-synced': string }
  }
  transactions: {
    key: string
    value: {
      id: string
      invoiceNo: string
      total: number
      cash: number
      credit: number
      change: number
      paymentStatus: string
      paymentMethod?: string | null
      customerId?: string | null
      projectId?: string | null
      projectName?: string | null
      note?: string | null
      userId: string
      items: any[]
      createdAt: string
      updatedAt: string
      syncedAt?: string
      syncStatus?: 'pending' | 'synced' | 'error'
    }
    indexes: { 'by-invoice': string; 'by-synced': string; 'by-date': string }
  }
  purchaseOrders: {
    key: string
    value: {
      id: string
      poNumber: string
      providerId?: string | null
      status: string
      total: number
      note?: string | null
      userId: string
      items: any[]
      receivedAt?: string | null
      createdAt: string
      updatedAt: string
      syncedAt?: string
      syncStatus?: 'pending' | 'synced' | 'error'
    }
    indexes: { 'by-po-number': string; 'by-synced': string }
  }
  syncQueue: {
    key: number
    value: {
      id: number
      operation: 'create' | 'update' | 'delete'
      entity: string
      entityId: string
      data: any
      timestamp: string
      retries: number
      status: 'pending' | 'processing' | 'completed' | 'failed'
      error?: string
    }
    indexes: { 'by-status': string; 'by-entity': string }
  }
  syncMetadata: {
    key: string
    value: {
      key: string
      lastSyncAt?: string | null
      syncVersion: number
    }
  }
}

const DB_NAME = 'pos-karya-mandiri'
const DB_VERSION = 1

let dbInstance: IDBPDatabase<POSDatabase> | null = null

/**
 * Initialize IndexedDB database
 */
export async function initDB(): Promise<IDBPDatabase<POSDatabase>> {
  if (dbInstance) {
    return dbInstance
  }

  dbInstance = await openDB<POSDatabase>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Products store
      if (!db.objectStoreNames.contains('products')) {
        const productStore = db.createObjectStore('products', { keyPath: 'id' })
        productStore.createIndex('by-sku', 'sku', { unique: true })
        productStore.createIndex('by-category', 'categoryId')
        productStore.createIndex('by-synced', 'syncStatus')
      }

      // Categories store
      if (!db.objectStoreNames.contains('categories')) {
        const categoryStore = db.createObjectStore('categories', { keyPath: 'id' })
        categoryStore.createIndex('by-synced', 'syncStatus')
      }

      // Tags store
      if (!db.objectStoreNames.contains('tags')) {
        const tagStore = db.createObjectStore('tags', { keyPath: 'id' })
        tagStore.createIndex('by-synced', 'syncStatus')
      }

      // Brands store
      if (!db.objectStoreNames.contains('brands')) {
        const brandStore = db.createObjectStore('brands', { keyPath: 'id' })
        brandStore.createIndex('by-synced', 'syncStatus')
      }

      // Customers store
      if (!db.objectStoreNames.contains('customers')) {
        const customerStore = db.createObjectStore('customers', { keyPath: 'id' })
        customerStore.createIndex('by-synced', 'syncStatus')
      }

      // Projects store
      if (!db.objectStoreNames.contains('projects')) {
        const projectStore = db.createObjectStore('projects', { keyPath: 'id' })
        projectStore.createIndex('by-customer', 'customerId')
        projectStore.createIndex('by-synced', 'syncStatus')
      }

      // Transactions store
      if (!db.objectStoreNames.contains('transactions')) {
        const transactionStore = db.createObjectStore('transactions', { keyPath: 'id' })
        transactionStore.createIndex('by-invoice', 'invoiceNo', { unique: true })
        transactionStore.createIndex('by-synced', 'syncStatus')
        transactionStore.createIndex('by-date', 'createdAt')
      }

      // Purchase Orders store
      if (!db.objectStoreNames.contains('purchaseOrders')) {
        const poStore = db.createObjectStore('purchaseOrders', { keyPath: 'id' })
        poStore.createIndex('by-po-number', 'poNumber', { unique: true })
        poStore.createIndex('by-synced', 'syncStatus')
      }

      // Sync Queue store
      if (!db.objectStoreNames.contains('syncQueue')) {
        const queueStore = db.createObjectStore('syncQueue', {
          keyPath: 'id',
          autoIncrement: true,
        })
        queueStore.createIndex('by-status', 'status')
        queueStore.createIndex('by-entity', 'entity')
      }

      // Sync Metadata store
      if (!db.objectStoreNames.contains('syncMetadata')) {
        db.createObjectStore('syncMetadata', { keyPath: 'key' })
      }
    },
  })

  return dbInstance
}

/**
 * Get database instance
 */
export async function getDB(): Promise<IDBPDatabase<POSDatabase>> {
  if (!dbInstance) {
    return await initDB()
  }
  return dbInstance
}

/**
 * Generic CRUD operations for IndexedDB
 */
export const dbOperations = {
  // Get all items from a store
  async getAll<T extends keyof POSDatabase>(
    storeName: T
  ): Promise<POSDatabase[T]['value'][]> {
    const db = await getDB()
    return await db.getAll(storeName)
  },

  // Get item by key
  async get<T extends keyof POSDatabase>(
    storeName: T,
    key: POSDatabase[T]['key']
  ): Promise<POSDatabase[T]['value'] | undefined> {
    const db = await getDB()
    return await db.get(storeName, key)
  },

  // Add or update item
  async put<T extends keyof POSDatabase>(
    storeName: T,
    value: POSDatabase[T]['value']
  ): Promise<POSDatabase[T]['key']> {
    const db = await getDB()
    return await db.put(storeName, value)
  },

  // Delete item
  async delete<T extends keyof POSDatabase>(
    storeName: T,
    key: POSDatabase[T]['key']
  ): Promise<void> {
    const db = await getDB()
    return await db.delete(storeName, key)
  },

  // Get items by index
  async getByIndex<T extends keyof POSDatabase>(
    storeName: T,
    indexName: string,
    value: any
  ): Promise<POSDatabase[T]['value'][]> {
    const db = await getDB()
    const index = db.transaction(storeName).store.index(indexName)
    return await index.getAll(value)
  },

  // Clear all items from a store
  async clear<T extends keyof POSDatabase>(storeName: T): Promise<void> {
    const db = await getDB()
    return await db.clear(storeName)
  },
}

