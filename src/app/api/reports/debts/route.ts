import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

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
    const customerId = searchParams.get('customerId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const paymentStatus = searchParams.get('paymentStatus') || 'unpaid' // unpaid, partial, all

    // Build where clause for transactions with outstanding credit
    const where: any = {
      OR: [
        { paymentStatus: 'unpaid' },
        { paymentStatus: 'partial' },
      ],
    }

    if (customerId) {
      where.customerId = customerId
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        where.createdAt.lte = end
      }
    }

    // If paymentStatus is 'all', include all transactions with credit > 0
    if (paymentStatus === 'all') {
      delete where.OR
      where.credit = {
        gt: 0,
      }
    }

    // Get transactions with outstanding credit
    const transactions = await prisma.transaction.findMany({
      where,
      include: {
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
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
            sellingUnit: {
              select: {
                id: true,
                name: true,
                unit: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Calculate summary statistics
    const totalDebt = transactions.reduce(
      (sum, t) => sum + Number(t.credit),
      0
    )
    const totalUnpaid = transactions
      .filter((t) => t.paymentStatus === 'unpaid')
      .reduce((sum, t) => sum + Number(t.credit), 0)
    const totalPartial = transactions
      .filter((t) => t.paymentStatus === 'partial')
      .reduce((sum, t) => sum + Number(t.credit), 0)

    // Group by customer
    const customerDebts = new Map<string, {
      customerId: string
      customerName: string
      customerType: string
      customerPhone: string | null
      customerEmail: string | null
      totalDebt: number
      transactionCount: number
      transactions: any[]
    }>()

    transactions.forEach((transaction) => {
      if (!transaction.customer) return

      const customerId = transaction.customer.id
      if (!customerDebts.has(customerId)) {
        customerDebts.set(customerId, {
          customerId,
          customerName: transaction.customer.name,
          customerType: transaction.customer.type,
          customerPhone: transaction.customer.phone,
          customerEmail: transaction.customer.email,
          totalDebt: 0,
          transactionCount: 0,
          transactions: [],
        })
      }

      const customerDebt = customerDebts.get(customerId)!
      customerDebt.totalDebt += Number(transaction.credit)
      customerDebt.transactionCount += 1
      customerDebt.transactions.push({
        id: transaction.id,
        invoiceNo: transaction.invoiceNo,
        total: Number(transaction.total),
        credit: Number(transaction.credit),
        cash: Number(transaction.cash),
        paymentStatus: transaction.paymentStatus,
        paymentMethod: transaction.paymentMethod,
        createdAt: transaction.createdAt,
        project: transaction.project,
        user: transaction.user,
        items: transaction.items.map((item: any) => ({
          id: item.id,
          product: item.product,
          sellingUnit: item.sellingUnit,
          quantity: Number(item.quantity),
          price: Number(item.price),
          subtotal: Number(item.subtotal),
        })),
      })
    })

    // Convert map to array and sort by total debt descending
    const customerDebtsArray = Array.from(customerDebts.values())
      .sort((a, b) => b.totalDebt - a.totalDebt)

    return NextResponse.json({
      summary: {
        totalDebt,
        totalUnpaid,
        totalPartial,
        totalTransactions: transactions.length,
        totalCustomers: customerDebtsArray.length,
      },
      transactions: transactions.map((t) => ({
        id: t.id,
        invoiceNo: t.invoiceNo,
        total: Number(t.total),
        credit: Number(t.credit),
        cash: Number(t.cash),
        paymentStatus: t.paymentStatus,
        paymentMethod: t.paymentMethod,
        createdAt: t.createdAt,
        customer: t.customer,
        project: t.project,
        user: t.user,
        items: t.items.map((item: any) => ({
          id: item.id,
          product: item.product,
          sellingUnit: item.sellingUnit,
          quantity: Number(item.quantity),
          price: Number(item.price),
          subtotal: Number(item.subtotal),
        })),
      })),
      customerDebts: customerDebtsArray,
    })
  } catch (error) {
    console.error('Debt report error:', error)
    return NextResponse.json(
      {
        error: 'Terjadi kesalahan',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

