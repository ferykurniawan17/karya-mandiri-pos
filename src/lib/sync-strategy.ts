/**
 * Sync strategy for conflict resolution
 */

export interface ConflictResolution {
  strategy: 'last-write-wins' | 'merge' | 'manual'
  resolved: boolean
  data: any
}

/**
 * Last-write-wins conflict resolution
 * Uses timestamp to determine which version wins
 */
export function lastWriteWins(
  localData: any,
  serverData: any,
  localTimestamp?: string,
  serverTimestamp?: string
): any {
  const localTime = localTimestamp
    ? new Date(localTimestamp).getTime()
    : localData.updatedAt
    ? new Date(localData.updatedAt).getTime()
    : 0

  const serverTime = serverTimestamp
    ? new Date(serverTimestamp).getTime()
    : serverData.updatedAt
    ? new Date(serverData.updatedAt).getTime()
    : 0

  // Server wins if timestamps are equal (server is source of truth)
  return serverTime >= localTime ? serverData : localData
}

/**
 * Merge strategy for complex data
 * Merges non-conflicting fields, uses last-write-wins for conflicts
 */
export function mergeData(
  localData: any,
  serverData: any,
  localTimestamp?: string,
  serverTimestamp?: string
): any {
  const merged = { ...localData }

  // Merge all fields from server
  for (const key in serverData) {
    if (serverData[key] !== undefined && serverData[key] !== null) {
      // For arrays, merge unique items
      if (Array.isArray(serverData[key]) && Array.isArray(localData[key])) {
        const localArray = localData[key] || []
        const serverArray = serverData[key] || []
        // Merge arrays, keeping unique items
        merged[key] = [
          ...localArray,
          ...serverArray.filter(
            (item: any) => !localArray.find((local: any) => local.id === item.id)
          ),
        ]
      } else {
        // Use last-write-wins for scalar values
        const localTime = localData[`${key}UpdatedAt`]
          ? new Date(localData[`${key}UpdatedAt`]).getTime()
          : localTimestamp
          ? new Date(localTimestamp).getTime()
          : 0

        const serverTime = serverData[`${key}UpdatedAt`]
          ? new Date(serverData[`${key}UpdatedAt`]).getTime()
          : serverTimestamp
          ? new Date(serverTimestamp).getTime()
          : 0

        if (serverTime >= localTime) {
          merged[key] = serverData[key]
        }
      }
    }
  }

  return merged
}

/**
 * Detect conflicts between local and server data
 */
export function detectConflict(
  localData: any,
  serverData: any,
  localTimestamp?: string,
  serverTimestamp?: string
): boolean {
  if (!localData || !serverData) {
    return false
  }

  const localTime = localTimestamp
    ? new Date(localTimestamp).getTime()
    : localData.updatedAt
    ? new Date(localData.updatedAt).getTime()
    : 0

  const serverTime = serverTimestamp
    ? new Date(serverTimestamp).getTime()
    : serverData.updatedAt
    ? new Date(serverData.updatedAt).getTime()
    : 0

  // Conflict if both have been modified and timestamps are close
  const timeDiff = Math.abs(serverTime - localTime)
  const conflictThreshold = 1000 // 1 second

  return (
    localTime > 0 &&
    serverTime > 0 &&
    timeDiff < conflictThreshold &&
    JSON.stringify(localData) !== JSON.stringify(serverData)
  )
}

/**
 * Resolve conflict based on strategy
 */
export function resolveConflict(
  localData: any,
  serverData: any,
  strategy: 'last-write-wins' | 'merge' = 'last-write-wins',
  localTimestamp?: string,
  serverTimestamp?: string
): ConflictResolution {
  const hasConflict = detectConflict(localData, serverData, localTimestamp, serverTimestamp)

  if (!hasConflict) {
    // No conflict, use server data (it's the source of truth)
    return {
      strategy,
      resolved: true,
      data: serverData,
    }
  }

  let resolvedData: any

  switch (strategy) {
    case 'merge':
      resolvedData = mergeData(localData, serverData, localTimestamp, serverTimestamp)
      break
    case 'last-write-wins':
    default:
      resolvedData = lastWriteWins(localData, serverData, localTimestamp, serverTimestamp)
      break
  }

  return {
    strategy,
    resolved: true,
    data: resolvedData,
  }
}

