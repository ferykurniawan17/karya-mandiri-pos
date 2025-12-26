import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

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

    const body = await request.json()
    const { adjustment, note } = body

    // Validate adjustment
    if (adjustment === undefined || adjustment === null) {
      return NextResponse.json(
        { error: 'Adjustment amount harus diisi' },
        { status: 400 }
      )
    }

    const adjustmentValue = Number(adjustment)
    if (isNaN(adjustmentValue) || adjustmentValue === 0) {
      return NextResponse.json(
        { error: 'Adjustment amount tidak valid (tidak boleh 0)' },
        { status: 400 }
      )
    }

    // Get current product
    const product = await prisma.product.findUnique({
      where: { id: params.id },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Produk tidak ditemukan' },
        { status: 404 }
      )
    }

    // Calculate new stock
    const currentStock = product.stock
    const newStock = currentStock + adjustmentValue

    // Validate new stock cannot be negative
    if (newStock < 0) {
      return NextResponse.json(
        { 
          error: `Stock tidak boleh negatif. Stock saat ini: ${currentStock}, adjustment: ${adjustmentValue > 0 ? '+' : ''}${adjustmentValue}` 
        },
        { status: 400 }
      )
    }

    // Update stock using increment/decrement for atomic operation
    const updatedProduct = await prisma.product.update({
      where: { id: params.id },
      data: {
        stock: {
          increment: adjustmentValue,
        },
      },
      include: {
        category: true,
        brand: true,
        tags: true,
      },
    })

    // Note: We don't store the note since there's no history tracking requirement
    // If needed in the future, we could add a StockAdjustment model

    return NextResponse.json({
      success: true,
      product: updatedProduct,
      adjustment: adjustmentValue,
      previousStock: currentStock,
      newStock: updatedProduct.stock,
    })
  } catch (error: any) {
    console.error('Adjust stock error:', error)
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Produk tidak ditemukan' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Terjadi kesalahan', details: error.message },
      { status: 500 }
    )
  }
}

