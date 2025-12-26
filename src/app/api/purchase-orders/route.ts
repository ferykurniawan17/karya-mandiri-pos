import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { Prisma } from '@prisma/client'

function generatePONumber(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const random = Math.random().toString(36).substring(2, 7).toUpperCase()
  return `PO-${year}${month}${day}-${random}`
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status')
    const providerId = searchParams.get('providerId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const search = searchParams.get('search')

    const where: any = {}

    if (status) {
      where.status = status
    }

    if (providerId) {
      where.providerId = providerId
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setDate(end.getDate() + 1)
        where.createdAt.lt = end
      }
    }

    if (search) {
      where.poNumber = { contains: search }
    }

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where,
      take: limit,
      skip: offset,
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
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const total = await prisma.purchaseOrder.count({ where })

    return NextResponse.json({
      purchaseOrders,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Get purchase orders error:', error)
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

      // Purchase price bisa 0 saat create, akan diisi saat receive
      // if (Number(item.purchasePrice) <= 0) {
      //   return NextResponse.json(
      //     { error: 'Harga pembelian harus lebih dari 0' },
      //     { status: 400 }
      //   )
      // }

      // Check if product exists
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

    // Generate PO number
    let poNumber = generatePONumber()
    let retries = 0
    while (retries < 10) {
      const existing = await prisma.purchaseOrder.findUnique({
        where: { poNumber },
      })
      if (!existing) break
      poNumber = generatePONumber()
      retries++
    }

    if (retries >= 10) {
      return NextResponse.json(
        { error: 'Gagal generate PO number, coba lagi' },
        { status: 500 }
      )
    }

    // Calculate total (purchase price bisa 0 saat create)
    const total = items.reduce((sum: number, item: any) => {
      const price = Number(item.purchasePrice) || 0
      return sum + (Number(item.quantity) * price)
    }, 0)

    // Create PO with items
    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        providerId: providerId || null,
        userId: user.id,
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
    console.error('Create purchase order error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan', details: error.message },
      { status: 500 }
    )
  }
}

