import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const categoryId = searchParams.get('categoryId')

    // Build where clause for PostgreSQL
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

    // PostgreSQL case-insensitive search
    if (search) {
      where.OR = [
        { name: { mode: 'insensitive', contains: search } },
        { aliasName: { mode: 'insensitive', contains: search } },
        { sku: { mode: 'insensitive', contains: search } },
      ]
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        brand: true,
        tags: true,
        sellingUnits: {
          where: {
            isActive: true,
          },
          orderBy: {
            displayOrder: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // No need for manual filtering with PostgreSQL - already filtered in query
    const filteredProducts = products

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
      productType,
      baseUnit,
      baseStock,
      minimalBaseStock,
      purchaseUnit,
      purchasePrice,
      sellingPrice,
      photo,
      placement,
      categoryId,
      brandId,
      tagIds,
      sellingUnits,
    } = body

    // Use baseUnit directly - it's required now
    const effectiveBaseUnit = baseUnit
    const effectiveBaseStock = baseStock !== undefined ? parseFloat(baseStock) : (parseInt(stock) || 0)
    const effectiveMinimalBaseStock = minimalBaseStock !== undefined ? parseFloat(minimalBaseStock) : (parseInt(minimalStock) || 0)
    const effectiveProductType = productType || 'SIMPLE'

    if (!name || !categoryId || !effectiveBaseUnit) {
      return NextResponse.json(
        { error: 'Data tidak lengkap. Base Unit wajib diisi.' },
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

    // Create product with new fields
    const product = await prisma.product.create({
      data: {
        name,
        aliasName: aliasName || undefined,
        sku: sku || undefined,
        // Keep old fields for backward compatibility
        stock: parseInt(stock) || 0,
        minimalStock: parseInt(minimalStock) || 0,
        unit: effectiveBaseUnit,
        // New multi-unit fields
        productType: effectiveProductType,
        baseUnit: effectiveBaseUnit,
        baseStock: effectiveBaseStock,
        minimalBaseStock: effectiveMinimalBaseStock,
        purchaseUnit: purchaseUnit || undefined,
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
        sellingPrice: parseFloat(sellingPrice),
        photo: photo || undefined,
        placement: placement || undefined,
        categoryId,
        brandId: brandId || undefined,
        tags: tagIds && tagIds.length > 0 ? {
          connect: tagIds.map((id: string) => ({ id })),
        } : undefined,
        // Create selling units if provided
        sellingUnits: sellingUnits && Array.isArray(sellingUnits) && sellingUnits.length > 0 ? {
          create: sellingUnits.map((su: any, index: number) => ({
            name: su.name,
            unit: su.unit,
            conversionFactor: parseFloat(su.conversionFactor) || 1,
            sellingPrice: parseFloat(su.sellingPrice) || parseFloat(sellingPrice),
            isDefault: su.isDefault || (index === 0 && !sellingUnits.some((s: any) => s.isDefault)),
            allowPriceBased: su.allowPriceBased || false,
            isActive: su.isActive !== undefined ? su.isActive : true,
            displayOrder: su.displayOrder !== undefined ? parseInt(su.displayOrder) : index,
          })),
        } : undefined,
      },
      include: {
        category: true,
        brand: true,
        tags: true,
        sellingUnits: true,
      },
    })

    // If no selling units provided, create default one
    if (!sellingUnits || !Array.isArray(sellingUnits) || sellingUnits.length === 0) {
      await prisma.productSellingUnit.create({
        data: {
          productId: product.id,
          name: `Per ${effectiveBaseUnit}`,
          unit: effectiveBaseUnit,
          conversionFactor: 1,
          sellingPrice: parseFloat(sellingPrice),
          isDefault: true,
          isActive: true,
          displayOrder: 0,
        },
      })
    }

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

