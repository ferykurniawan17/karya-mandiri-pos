import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { syncToCloud, syncFromCloud } from '@/lib/sync'

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
    const { direction = 'push' } = body

    let result

    if (direction === 'push') {
      result = await syncToCloud()
    } else if (direction === 'pull') {
      result = await syncFromCloud()
    } else {
      return NextResponse.json(
        { error: 'Direction harus push atau pull' },
        { status: 400 }
      )
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan saat sync' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Return sync status
    // In a real app, you'd store this in a database or file
    return NextResponse.json({
      status: 'idle',
      lastSync: null,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}

