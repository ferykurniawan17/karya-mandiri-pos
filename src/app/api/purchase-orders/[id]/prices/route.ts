import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { Prisma } from '@prisma/client'

export async function PATCH(
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
    const { items } = body // Array of { itemId, purchasePrice }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Item tidak boleh kosong' },
        { status: 400 }
      )
    }

    // Check if PO exists
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id: params.id },
      include: {
        items: true,
      },
    })

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: 'Purchase Order tidak ditemukan' },
        { status: 404 }
      )
    }

    // Allow edit prices if status is draft or approved
    if (purchaseOrder.status !== 'draft' && purchaseOrder.status !== 'approved') {
      return NextResponse.json(
        { error: 'Harga beli hanya dapat diubah pada PO dengan status draft atau approved' },
        { status: 400 }
      )
    }

    // Validate items
    for (const priceItem of items) {
      const poItem = purchaseOrder.items.find(
        (item) => item.id === priceItem.itemId
      )

      if (!poItem) {
        return NextResponse.json(
          { error: `Item dengan ID ${priceItem.itemId} tidak ditemukan` },
          { status: 400 }
        )
      }

      if (!priceItem.purchasePrice || Number(priceItem.purchasePrice) <= 0) {
        return NextResponse.json(
          {
            error: `Harga beli untuk item ${poItem.productId} harus lebih dari 0`,
          },
          { status: 400 }
        )
      }
    }

    // Update purchase prices and recalculate subtotals
    let newTotal = 0
    for (const priceItem of items) {
      const poItem = purchaseOrder.items.find(
        (item) => item.id === priceItem.itemId
      )!

      const purchasePrice = new Prisma.Decimal(priceItem.purchasePrice)
      const subtotal = new Prisma.Decimal(
        poItem.quantity * Number(priceItem.purchasePrice)
      )

      await prisma.purchaseOrderItem.update({
        where: { id: priceItem.itemId },
        data: {
          purchasePrice,
          subtotal,
        },
      })

      newTotal += Number(subtotal)
    }

    // Update PO total
    const updatedPO = await prisma.purchaseOrder.update({
      where: { id: params.id },
      data: {
        total: new Prisma.Decimal(newTotal),
      },
      include: {
        provider: true,
        user: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        items: {
          include: {
            product: {
              include: {
                category: true,
                brand: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      purchaseOrder: updatedPO,
    })
  } catch (error: any) {
    console.error('Update purchase prices error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan', details: error.message },
      { status: 500 }
    )
  }
}

