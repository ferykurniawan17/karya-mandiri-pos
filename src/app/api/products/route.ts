import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const categoryId = searchParams.get('categoryId')

    // Build where clause for SQLite (no case-insensitive mode)
    const where: any = {}

    if (categoryId) {
      where.categoryId = categoryId
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Filter by search term (case-insensitive) if provided
    const filteredProducts = search
      ? products.filter(
          (product) =>
            product.name.toLowerCase().includes(search.toLowerCase()) ||
            (product.sku &&
              product.sku.toLowerCase().includes(search.toLowerCase())) ||
            (product.placement &&
              product.placement.toLowerCase().includes(search.toLowerCase()))
        )
      : products

    return NextResponse.json({ products: filteredProducts })
  } catch (error) {
    console.error('Get products error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan', details: error instanceof Error ? error.message : 'Unknown error' },
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

    const body = await request.json()
    const {
      name,
      sku,
      stock,
      minimalStock,
      unit,
      purchasePrice,
      sellingPrice,
      photo,
      placement,
      categoryId,
    } = body

    if (!name || !categoryId || !unit) {
      return NextResponse.json(
        { error: 'Data tidak lengkap' },
        { status: 400 }
      )
    }

    const product = await prisma.product.create({
      data: {
        name,
        sku: sku || undefined,
        stock: parseInt(stock) || 0,
        minimalStock: parseInt(minimalStock) || 0,
        unit,
        purchasePrice: parseFloat(purchasePrice),
        sellingPrice: parseFloat(sellingPrice),
        photo: photo || undefined,
        placement: placement || undefined,
        categoryId,
      },
      include: {
        category: true,
      },
    })

    return NextResponse.json({
      success: true,
      product,
    })
  } catch (error: any) {
    console.error('Create product error:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'SKU sudah digunakan' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}

