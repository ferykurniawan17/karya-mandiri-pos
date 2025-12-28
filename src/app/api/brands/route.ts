import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''

    const where: any = {}
    
    // PostgreSQL case-insensitive search
    if (search) {
      where.name = { mode: 'insensitive', contains: search }
    }

    const brands = await prisma.brand.findMany({
      where,
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json({ brands })
  } catch (error: any) {
    console.error('Get brands error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    )
  }
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

    const { name, photo } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: 'Nama brand harus diisi' },
        { status: 400 }
      )
    }

    const brand = await prisma.brand.create({
      data: {
        name: name.trim(),
        photo: photo || undefined,
      },
    })

    return NextResponse.json({
      success: true,
      brand,
    })
  } catch (error: any) {
    console.error('Create brand error:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Brand dengan nama ini sudah ada' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Terjadi kesalahan', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    )
  }
}

