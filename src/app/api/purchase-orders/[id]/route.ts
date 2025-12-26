import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { Prisma } from '@prisma/client'

export async function GET(
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

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id: params.id },
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

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: 'Purchase Order tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json({ purchaseOrder })
  } catch (error) {
    console.error('Get purchase order error:', error)
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

    // Check if PO exists and is in draft status
    const currentPO = await prisma.purchaseOrder.findUnique({
      where: { id: params.id },
    })

    if (!currentPO) {
      return NextResponse.json(
        { error: 'Purchase Order tidak ditemukan' },
        { status: 404 }
      )
    }

    // Allow edit if status is draft or approved (approved can only edit prices)
    if (currentPO.status !== 'draft' && currentPO.status !== 'approved') {
      return NextResponse.json(
        { error: 'Hanya PO dengan status draft atau approved yang dapat diubah' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { providerId, items, note } = body

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Item PO tidak boleh kosong' },
        { status: 400 }
      )
    }

    // Validate items
    for (const item of items) {
      if (!item.productId || !item.quantity) {
        return NextResponse.json(
          { error: 'Product dan quantity wajib diisi' },
          { status: 400 }
        )
      }

      if (item.quantity <= 0) {
        return NextResponse.json(
          { error: 'Quantity harus lebih dari 0' },
          { status: 400 }
        )
      }

      // Purchase price tidak wajib saat create/edit, akan diisi saat receive
      // if (Number(item.purchasePrice) <= 0) {
      //   return NextResponse.json(
      //     { error: 'Harga pembelian harus lebih dari 0' },
      //     { status: 400 }
      //   )
      // }

      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      })

      if (!product) {
        return NextResponse.json(
          { error: `Product dengan ID ${item.productId} tidak ditemukan` },
          { status: 400 }
        )
      }
    }

    // Calculate total (purchase price bisa 0 saat create/edit)
    const total = items.reduce((sum: number, item: any) => {
      const price = Number(item.purchasePrice) || 0
      return sum + (Number(item.quantity) * price)
    }, 0)

    // Delete existing items and create new ones
    await prisma.purchaseOrderItem.deleteMany({
      where: { purchaseOrderId: params.id },
    })

    const purchaseOrder = await prisma.purchaseOrder.update({
      where: { id: params.id },
      data: {
        providerId: providerId || null,
        total: new Prisma.Decimal(total),
        note: note || null,
        items: {
          create: items.map((item: any) => {
            const price = Number(item.purchasePrice) || 0
            return {
              productId: item.productId,
              quantity: parseInt(item.quantity),
              purchasePrice: new Prisma.Decimal(price),
              subtotal: new Prisma.Decimal(
                Number(item.quantity) * price
              ),
            }
          }),
        },
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
      purchaseOrder,
    })
  } catch (error: any) {
    console.error('Update purchase order error:', error)
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Purchase Order tidak ditemukan' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Terjadi kesalahan', details: error.message },
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

    // Check if PO exists and is in draft status
    const currentPO = await prisma.purchaseOrder.findUnique({
      where: { id: params.id },
    })

    if (!currentPO) {
      return NextResponse.json(
        { error: 'Purchase Order tidak ditemukan' },
        { status: 404 }
      )
    }

    if (currentPO.status !== 'draft') {
      return NextResponse.json(
        { error: 'Hanya PO dengan status draft yang dapat dihapus' },
        { status: 400 }
      )
    }

    await prisma.purchaseOrder.delete({
      where: { id: params.id },
    })

    return NextResponse.json({
      success: true,
      message: 'Purchase Order berhasil dihapus',
    })
  } catch (error: any) {
    console.error('Delete purchase order error:', error)
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Purchase Order tidak ditemukan' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Terjadi kesalahan', details: error.message },
      { status: 500 }
    )
  }
}

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
    const { action } = body // "approve" or "cancel"

    if (!action || (action !== 'approve' && action !== 'cancel')) {
      return NextResponse.json(
        { error: 'Action tidak valid' },
        { status: 400 }
      )
    }

    const currentPO = await prisma.purchaseOrder.findUnique({
      where: { id: params.id },
    })

    if (!currentPO) {
      return NextResponse.json(
        { error: 'Purchase Order tidak ditemukan' },
        { status: 404 }
      )
    }

    let newStatus: string

    if (action === 'approve') {
      if (currentPO.status !== 'draft') {
        return NextResponse.json(
          { error: 'Hanya PO dengan status draft yang dapat di-approve' },
          { status: 400 }
        )
      }
      newStatus = 'approved'
    } else {
      // cancel
      if (currentPO.status === 'received') {
        return NextResponse.json(
          { error: 'PO yang sudah diterima tidak dapat dibatalkan' },
          { status: 400 }
        )
      }
      newStatus = 'cancelled'
    }

    const purchaseOrder = await prisma.purchaseOrder.update({
      where: { id: params.id },
      data: {
        status: newStatus,
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
      purchaseOrder,
    })
  } catch (error: any) {
    console.error('Update PO status error:', error)
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Purchase Order tidak ditemukan' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Terjadi kesalahan', details: error.message },
      { status: 500 }
    )
  }
}

