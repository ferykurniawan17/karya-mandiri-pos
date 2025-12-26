import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { Prisma } from '@prisma/client'

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
    const { items } = body // Array of { itemId, receivedQuantity, purchasePrice }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Item tidak boleh kosong' },
        { status: 400 }
      )
    }

    // Check if PO exists and is approved
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

    if (purchaseOrder.status !== 'approved') {
      return NextResponse.json(
        { error: 'Hanya PO dengan status approved yang dapat diterima' },
        { status: 400 }
      )
    }

    // Validate received quantities
    for (const receivedItem of items) {
      const poItem = purchaseOrder.items.find(
        (item) => item.id === receivedItem.itemId
      )

      if (!poItem) {
        return NextResponse.json(
          { error: `Item dengan ID ${receivedItem.itemId} tidak ditemukan` },
          { status: 400 }
        )
      }

      if (
        receivedItem.receivedQuantity < 0 ||
        receivedItem.receivedQuantity > poItem.quantity
      ) {
        return NextResponse.json(
          {
            error: `Received quantity untuk item ${poItem.productId} tidak valid`,
          },
          { status: 400 }
        )
      }

      if (!receivedItem.purchasePrice || Number(receivedItem.purchasePrice) <= 0) {
        return NextResponse.json(
          {
            error: `Harga beli untuk item ${poItem.productId} harus diisi dan lebih dari 0`,
          },
          { status: 400 }
        )
      }
    }

    // Update product stock and PO items
    for (const receivedItem of items) {
      const poItem = purchaseOrder.items.find(
        (item) => item.id === receivedItem.itemId
      )!

      // Update product stock and purchase price (from latest PO)
      await prisma.product.update({
        where: { id: poItem.productId },
        data: {
          stock: {
            increment: receivedItem.receivedQuantity,
          },
          purchasePrice: new Prisma.Decimal(receivedItem.purchasePrice),
        },
      })

      // Update PO item received quantity and purchase price
      await prisma.purchaseOrderItem.update({
        where: { id: receivedItem.itemId },
        data: {
          receivedQuantity: receivedItem.receivedQuantity,
          purchasePrice: new Prisma.Decimal(receivedItem.purchasePrice),
          subtotal: new Prisma.Decimal(
            receivedItem.receivedQuantity * Number(receivedItem.purchasePrice)
          ),
        },
      })
    }

    // Recalculate total based on received items
    let newTotal = 0
    for (const receivedItem of items) {
      const poItem = purchaseOrder.items.find(
        (item) => item.id === receivedItem.itemId
      )!
      newTotal += receivedItem.receivedQuantity * Number(receivedItem.purchasePrice)
    }

    // Update PO status to received and recalculate total
    const updatedPO = await prisma.purchaseOrder.update({
      where: { id: params.id },
      data: {
        status: 'received',
        receivedAt: new Date(),
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
    console.error('Receive purchase order error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan', details: error.message },
      { status: 500 }
    )
  }
}

