import { NextResponse } from 'next/server'
import { initializeDatabase } from '@/lib/init-database'
import { prisma } from '@/lib/db'

export async function POST() {
  try {
    // Try to initialize database (create default users)
    const result = await initializeDatabase()
    
    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error: any) {
    console.error('Init database error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to initialize database',
        needsSchema: error.code === 'P2021' || error.message?.includes('does not exist') || error.code === 'P2003'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Check if database is initialized
    const adminUser = await prisma.user.findUnique({
      where: { username: 'admin' },
    })
    
    return NextResponse.json({
      initialized: !!adminUser,
    })
  } catch (error: any) {
    // If error, database might not be initialized or schema doesn't exist
    console.error('Check database error:', error)
    return NextResponse.json({
      initialized: false,
      needsSchema: error.code === 'P2021' || error.message?.includes('does not exist') || error.code === 'P2003',
      error: error.message,
    })
  }
}

