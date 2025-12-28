import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
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
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Produk tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json({ product })
  } catch (error) {
    console.error('Get product error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // For backward compatibility
    const effectiveBaseUnit = baseUnit || unit
    const effectiveBaseStock = baseStock !== undefined ? parseFloat(baseStock) : (parseInt(stock) || 0)
    const effectiveMinimalBaseStock = minimalBaseStock !== undefined ? parseFloat(minimalBaseStock) : (parseInt(minimalStock) || 0)
    const effectiveProductType = productType || 'SIMPLE'

    if (!name || !categoryId || !effectiveBaseUnit) {
      return NextResponse.json(
        { error: 'Data tidak lengkap' },
        { status: 400 }
      )
    }

    // Get current product to preserve SKU and handle tags update
    const currentProduct = await prisma.product.findUnique({
      where: { id: params.id },
      include: { tags: true },
    })

    if (!currentProduct) {
      return NextResponse.json(
        { error: 'Produk tidak ditemukan' },
        { status: 404 }
      )
    }

    // SKU cannot be changed during edit - use existing SKU
    const finalSku = currentProduct.sku || sku || undefined

    // If SKU is being changed, check uniqueness
    if (sku && sku !== currentProduct.sku) {
      const existingProduct = await prisma.product.findFirst({
        where: { 
          sku,
          id: { not: params.id }
        },
      })
      if (existingProduct) {
        return NextResponse.json(
          { error: 'SKU sudah digunakan' },
          { status: 400 }
        )
      }
    }

    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        name,
        aliasName: aliasName || undefined,
        sku: finalSku, // Keep existing SKU, don't allow changes
        // Keep old fields for backward compatibility
        stock: parseInt(stock) || 0,
        minimalStock: parseInt(minimalStock) || 0,
        unit: effectiveBaseUnit,
        // New multi-unit fields
        productType: effectiveProductType,
        baseUnit: effectiveBaseUnit,
        baseStock: effectiveBaseStock,
        minimalBaseStock: effectiveMinimalBaseStock,
        purchaseUnit: purchaseUnit || null,
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
        sellingPrice: parseFloat(sellingPrice),
        photo: photo || undefined,
        placement: placement || undefined,
        categoryId,
        brandId: brandId || null,
        tags: {
          set: tagIds && tagIds.length > 0 
            ? tagIds.map((id: string) => ({ id }))
            : [],
        },
      },
      include: {
        category: true,
        brand: true,
        tags: true,
        sellingUnits: true,
      },
    })

    // Update selling units if provided
    if (sellingUnits && Array.isArray(sellingUnits)) {
      // Delete existing selling units (we'll recreate them)
      await prisma.productSellingUnit.deleteMany({
        where: { productId: params.id },
      })

      // Create new selling units
      if (sellingUnits.length > 0) {
        await prisma.productSellingUnit.createMany({
          data: sellingUnits.map((su: any, index: number) => ({
            productId: params.id,
            name: su.name,
            unit: su.unit,
            conversionFactor: parseFloat(su.conversionFactor) || 1,
            sellingPrice: parseFloat(su.sellingPrice) || parseFloat(sellingPrice),
            isDefault: su.isDefault || (index === 0 && !sellingUnits.some((s: any) => s.isDefault)),
            allowPriceBased: su.allowPriceBased || false,
            isActive: su.isActive !== undefined ? su.isActive : true,
            displayOrder: su.displayOrder !== undefined ? parseInt(su.displayOrder) : index,
          })),
        })
      }
    }

    // Fetch updated product with selling units
    const updatedProduct = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        brand: true,
        tags: true,
        sellingUnits: {
          orderBy: {
            displayOrder: 'asc',
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      product: updatedProduct,
    })
  } catch (error: any) {
    console.error('Update product error:', error)
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Produk tidak ditemukan' },
        { status: 404 }
      )
    }
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await prisma.product.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete product error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}

