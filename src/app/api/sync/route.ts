import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { resolveConflict } from '@/lib/sync-strategy'

export interface SyncMetadata {
  timestamp: string
  deviceId?: string
  lastSyncAt?: string
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { 
      direction = 'push',
      entity,
      data,
      metadata,
      conflicts 
    } = body

    // Handle bulk sync
    if (entity && Array.isArray(data)) {
      return await handleBulkSync(entity, data, metadata)
    }

    // Handle incremental sync
    if (metadata?.lastSyncAt) {
      return await handleIncrementalSync(metadata)
    }

    // Handle conflict resolution
    if (conflicts && Array.isArray(conflicts)) {
      return await handleConflictResolution(conflicts)
    }

    return NextResponse.json({
      status: 'success',
      message: 'Sync completed',
    })
  } catch (error: any) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan saat sync' },
      { status: 500 }
    )
  }
}

async function handleBulkSync(entity: string, data: any[], metadata?: SyncMetadata) {
  const results = {
    created: 0,
    updated: 0,
    errors: [] as string[],
  }

  for (const item of data) {
    try {
      // Check if item exists
      const existing = await (prisma as any)[entity].findUnique({
        where: { id: item.id },
      })

      if (existing) {
        // Resolve conflicts if metadata provided
        if (metadata && existing.updatedAt && item.updatedAt) {
          const resolution = resolveConflict(
            existing,
            item,
            'last-write-wins',
            existing.updatedAt,
            item.updatedAt
          )
          await (prisma as any)[entity].update({
            where: { id: item.id },
            data: resolution.data,
          })
          results.updated++
        } else {
          await (prisma as any)[entity].update({
            where: { id: item.id },
            data: item,
          })
          results.updated++
        }
      } else {
        await (prisma as any)[entity].create({
          data: item,
        })
        results.created++
      }
    } catch (error: any) {
      results.errors.push(`Error syncing ${entity}/${item.id}: ${error.message}`)
    }
  }

  return NextResponse.json({
    status: 'success',
    results,
  })
}

async function handleIncrementalSync(metadata: SyncMetadata) {
  const lastSyncAt = new Date(metadata.lastSyncAt!)
  const entities = ['products', 'categories', 'tags', 'brands', 'customers', 'projects', 'transactions']
  const changes: Record<string, any[]> = {}

  for (const entity of entities) {
    try {
      const updated = await (prisma as any)[entity].findMany({
        where: {
          updatedAt: {
            gt: lastSyncAt,
          },
        },
      })
      changes[entity] = updated
    } catch (error) {
      console.error(`Error fetching ${entity} changes:`, error)
    }
  }

  return NextResponse.json({
    status: 'success',
    changes,
    syncTimestamp: new Date().toISOString(),
  })
}

async function handleConflictResolution(conflicts: any[]) {
  const resolved: any[] = []

  for (const conflict of conflicts) {
    try {
      const { entity, localData, serverData, strategy = 'last-write-wins' } = conflict
      const resolution = resolveConflict(
        localData,
        serverData,
        strategy,
        localData.updatedAt,
        serverData.updatedAt
      )

      if (resolution.resolved) {
        await (prisma as any)[entity].update({
          where: { id: localData.id },
          data: resolution.data,
        })
        resolved.push({ entity, id: localData.id, strategy })
      }
    } catch (error: any) {
      console.error('Conflict resolution error:', error)
    }
  }

  return NextResponse.json({
    status: 'success',
    resolved,
  })
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const lastSyncAt = searchParams.get('lastSyncAt')

    if (lastSyncAt) {
      // Return incremental sync data
      return await handleIncrementalSync({ lastSyncAt, timestamp: new Date().toISOString() })
    }

    // Return sync status
    return NextResponse.json({
      status: 'idle',
      lastSync: null,
      syncVersion: 1,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}

