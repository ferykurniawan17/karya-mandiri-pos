import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET: Get all selling units for a product
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sellingUnits = await prisma.productSellingUnit.findMany({
      where: {
        productId: params.id,
      },
      orderBy: {
        displayOrder: 'asc',
      },
    })

    return NextResponse.json({ sellingUnits })
  } catch (error) {
    console.error('Get selling units error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}

// POST: Create new selling unit
export async function POST(
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

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: params.id },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Produk tidak ditemukan' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const {
      name,
      unit,
      conversionFactor,
      sellingPrice,
      isDefault,
      allowPriceBased,
      isActive,
      displayOrder,
    } = body

    if (!name || !unit || conversionFactor === undefined || sellingPrice === undefined) {
      return NextResponse.json(
        { error: 'Data tidak lengkap' },
        { status: 400 }
      )
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.productSellingUnit.updateMany({
        where: {
          productId: params.id,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      })
    }

    const sellingUnit = await prisma.productSellingUnit.create({
      data: {
        productId: params.id,
        name,
        unit,
        conversionFactor: parseFloat(conversionFactor),
        sellingPrice: parseFloat(sellingPrice),
        isDefault: isDefault || false,
        allowPriceBased: allowPriceBased || false,
        isActive: isActive !== undefined ? isActive : true,
        displayOrder: displayOrder !== undefined ? parseInt(displayOrder) : 0,
      },
    })

    return NextResponse.json({
      success: true,
      sellingUnit,
    })
  } catch (error: any) {
    console.error('Create selling unit error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}

// PUT: Update selling unit (by unitId in body)
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
      sellingUnitId,
      name,
      unit,
      conversionFactor,
      sellingPrice,
      isDefault,
      allowPriceBased,
      isActive,
      displayOrder,
    } = body

    if (!sellingUnitId) {
      return NextResponse.json(
        { error: 'sellingUnitId diperlukan' },
        { status: 400 }
      )
    }

    // Verify selling unit belongs to product
    const existingUnit = await prisma.productSellingUnit.findFirst({
      where: {
        id: sellingUnitId,
        productId: params.id,
      },
    })

    if (!existingUnit) {
      return NextResponse.json(
        { error: 'Selling unit tidak ditemukan' },
        { status: 404 }
      )
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.productSellingUnit.updateMany({
        where: {
          productId: params.id,
          isDefault: true,
          id: { not: sellingUnitId },
        },
        data: {
          isDefault: false,
        },
      })
    }

    const sellingUnit = await prisma.productSellingUnit.update({
      where: { id: sellingUnitId },
      data: {
        name: name !== undefined ? name : existingUnit.name,
        unit: unit !== undefined ? unit : existingUnit.unit,
        conversionFactor: conversionFactor !== undefined ? parseFloat(conversionFactor) : existingUnit.conversionFactor,
        sellingPrice: sellingPrice !== undefined ? parseFloat(sellingPrice) : existingUnit.sellingPrice,
        isDefault: isDefault !== undefined ? isDefault : existingUnit.isDefault,
        allowPriceBased: allowPriceBased !== undefined ? allowPriceBased : existingUnit.allowPriceBased,
        isActive: isActive !== undefined ? isActive : existingUnit.isActive,
        displayOrder: displayOrder !== undefined ? parseInt(displayOrder) : existingUnit.displayOrder,
      },
    })

    return NextResponse.json({
      success: true,
      sellingUnit,
    })
  } catch (error: any) {
    console.error('Update selling unit error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}

// DELETE: Soft delete selling unit (set isActive = false)
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

    const searchParams = request.nextUrl.searchParams
    const sellingUnitId = searchParams.get('sellingUnitId')

    if (!sellingUnitId) {
      return NextResponse.json(
        { error: 'sellingUnitId diperlukan' },
        { status: 400 }
      )
    }

    // Verify selling unit belongs to product
    const existingUnit = await prisma.productSellingUnit.findFirst({
      where: {
        id: sellingUnitId,
        productId: params.id,
      },
    })

    if (!existingUnit) {
      return NextResponse.json(
        { error: 'Selling unit tidak ditemukan' },
        { status: 404 }
      )
    }

    // Soft delete by setting isActive = false
    await prisma.productSellingUnit.update({
      where: { id: sellingUnitId },
      data: {
        isActive: false,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete selling unit error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}

