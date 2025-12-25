import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''

    // SQLite doesn't support case-insensitive mode, so we'll filter manually if needed
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Filter by search term (case-insensitive) if provided
    const filteredCategories = search
      ? categories.filter(
          (cat) =>
            cat.name.toLowerCase().includes(search.toLowerCase()) ||
            (cat.description &&
              cat.description.toLowerCase().includes(search.toLowerCase()))
        )
      : categories

    return NextResponse.json({ categories: filteredCategories })
  } catch (error) {
    console.error('Get categories error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error details:', errorMessage)
    return NextResponse.json(
      { 
        error: 'Terjadi kesalahan',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
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

    const { name, description } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: 'Nama kategori harus diisi' },
        { status: 400 }
      )
    }

    const category = await prisma.category.create({
      data: {
        name,
        description,
      },
    })

    return NextResponse.json({
      success: true,
      category,
    })
  } catch (error: any) {
    console.error('Create category error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}

