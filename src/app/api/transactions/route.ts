import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const transactions = await prisma.transaction.findMany({
      take: limit,
      skip: offset,
      include: {
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
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const total = await prisma.transaction.count()

    return NextResponse.json({
      transactions,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Get transactions error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan' },
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
    const { items, cash, projectName, note } = body

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Keranjang kosong' },
        { status: 400 }
      )
    }

    if (!cash || cash < 0) {
      return NextResponse.json(
        { error: 'Jumlah pembayaran tidak valid' },
        { status: 400 }
      )
    }

    // Calculate total
    let total = 0
    const transactionItems = []

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      })

      if (!product) {
        return NextResponse.json(
          { error: `Produk ${item.productId} tidak ditemukan` },
          { status: 400 }
        )
      }

      if (product.stock < item.quantity) {
        return NextResponse.json(
          { error: `Stok ${product.name} tidak mencukupi` },
          { status: 400 }
        )
      }

      // Use custom price if provided, otherwise use product selling price
      const itemPrice = item.customPrice !== undefined 
        ? Number(item.customPrice) 
        : Number(product.sellingPrice)
      const subtotal = itemPrice * item.quantity
      total += subtotal

      transactionItems.push({
        productId: product.id,
        quantity: item.quantity,
        price: itemPrice,  // Custom or original price
        subtotal,
        status: item.status || null,
      })
    }

    if (cash < total) {
      return NextResponse.json(
        { error: 'Jumlah pembayaran kurang' },
        { status: 400 }
      )
    }

    const change = Number(cash) - total

    // Generate invoice number
    const invoiceNo = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    // Create transaction with items
    const transaction = await prisma.transaction.create({
      data: {
        invoiceNo,
        total,
        cash: Number(cash),
        change,
        projectName: projectName || null,
        note: note || null,
        userId: user.id,
        items: {
          create: transactionItems,
        },
      },
      include: {
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
              },
            },
          },
        },
      },
    })

    // Update product stocks
    for (const item of items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      })
    }

    return NextResponse.json({
      success: true,
      transaction,
    })
  } catch (error: any) {
    console.error('Create transaction error:', error)
    console.error('Error details:', error.message, error.stack)
    return NextResponse.json(
      { error: 'Terjadi kesalahan', details: error.message },
      { status: 500 }
    )
  }
}

