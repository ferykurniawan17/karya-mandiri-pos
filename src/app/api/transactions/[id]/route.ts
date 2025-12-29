import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            type: true,
            phone: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
            sellingUnit: true,
          },
        },
        payments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
          },
          orderBy: {
            paymentDate: "desc",
          },
        },
        allocations: {
          include: {
            payment: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaksi tidak ditemukan' },
        { status: 404 }
      )
    }

    // Serialize Decimal fields
    const serializedTransaction = {
      ...transaction,
      total: transaction.total.toNumber(),
      cash: transaction.cash.toNumber(),
      credit: transaction.credit.toNumber(),
      change: transaction.change.toNumber(),
      items: transaction.items.map((item) => ({
        ...item,
        quantity: item.quantity.toNumber(),
        price: item.price.toNumber(),
        subtotal: item.subtotal.toNumber(),
      })),
      payments: transaction.payments.map((payment) => ({
        ...payment,
        amount: payment.amount.toNumber(),
      })),
      allocations: transaction.allocations.map((alloc) => ({
        ...alloc,
        amount: alloc.amount.toNumber(),
        payment: {
          ...alloc.payment,
          amount: alloc.payment.amount.toNumber(),
        },
      })),
    }

    return NextResponse.json({ transaction: serializedTransaction })
  } catch (error) {
    console.error('Get transaction error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}

