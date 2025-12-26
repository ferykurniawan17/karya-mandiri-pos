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

    const tagIds = searchParams.get('tagIds')?.split(',').filter(Boolean) || []
    const brandIds = searchParams.get('brandIds')?.split(',').filter(Boolean) || []

    // Build where clause for tags and brands
    if (tagIds.length > 0) {
      where.tags = {
        some: {
          id: { in: tagIds },
        },
      }
    }

    if (brandIds.length > 0) {
      where.brandId = { in: brandIds }
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        brand: true,
        tags: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Filter by search term (case-insensitive) if provided
    const filteredProducts = search
      ? products.filter(
          (product) => {
            const lowerSearch = search.toLowerCase()
            // Search by product name
            const matchesName = product.name.toLowerCase().includes(lowerSearch)
            // Search by alias name (nama lain)
            const matchesAliasName = product.aliasName?.toLowerCase().includes(lowerSearch) || false
            // Search by SKU
            const matchesSku = product.sku?.toLowerCase().includes(lowerSearch) || false
            // Search by placement
            const matchesPlacement = product.placement?.toLowerCase().includes(lowerSearch) || false
            // Search by tags
            const matchesTags = product.tags?.some(tag => 
              tag.name.toLowerCase().includes(lowerSearch)
            ) || false
            // Search by brand name
            const matchesBrand = product.brand?.name.toLowerCase().includes(lowerSearch) || false
            
            return matchesName || matchesAliasName || matchesSku || matchesPlacement || matchesTags || matchesBrand
          }
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
      aliasName,
      sku,
      stock,
      minimalStock,
      unit,
      purchasePrice,
      sellingPrice,
      photo,
      placement,
      categoryId,
      brandId,
      tagIds,
    } = body

    if (!name || !categoryId || !unit) {
      return NextResponse.json(
        { error: 'Data tidak lengkap' },
        { status: 400 }
      )
    }

    // Check if SKU is unique (if provided)
    if (sku) {
      const existingProduct = await prisma.product.findFirst({
        where: { sku },
      })
      if (existingProduct) {
        return NextResponse.json(
          { error: 'SKU sudah digunakan' },
          { status: 400 }
        )
      }
    }

    const product = await prisma.product.create({
      data: {
        name,
        aliasName: aliasName || undefined,
        sku: sku || undefined,
        stock: parseInt(stock) || 0,
        minimalStock: parseInt(minimalStock) || 0,
        unit,
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
        sellingPrice: parseFloat(sellingPrice),
        photo: photo || undefined,
        placement: placement || undefined,
        categoryId,
        brandId: brandId || undefined,
        tags: tagIds && tagIds.length > 0 ? {
          connect: tagIds.map((id: string) => ({ id })),
        } : undefined,
      },
      include: {
        category: true,
        brand: true,
        tags: true,
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

