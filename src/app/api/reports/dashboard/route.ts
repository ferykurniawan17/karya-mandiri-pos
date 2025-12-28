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
    const dateParam = searchParams.get('date')
    
    // Default to today, or use provided date
    const targetDate = dateParam ? new Date(dateParam) : new Date()
    const startOfDay = new Date(targetDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(targetDate)
    endOfDay.setHours(23, 59, 59, 999)

    // Get sales today
    const transactionsToday = await prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    })

    // Calculate sales statistics
    const totalRevenue = transactionsToday.reduce(
      (sum, t) => sum + Number(t.total),
      0
    )
    const totalTransactions = transactionsToday.length
    const averageTransaction =
      totalTransactions > 0 ? totalRevenue / totalTransactions : 0
    const cashRevenue = transactionsToday.reduce(
      (sum, t) => sum + Number(t.cash),
      0
    )
    const creditRevenue = transactionsToday.reduce(
      (sum, t) => sum + Number(t.credit),
      0
    )

    // Get top products (by quantity sold today)
    const productSales: Record<
      string,
      { productId: string; productName: string; quantity: number; revenue: number }
    > = {}

    transactionsToday.forEach((transaction) => {
      transaction.items.forEach((item) => {
        const productId = item.productId
        if (!productSales[productId]) {
          productSales[productId] = {
            productId,
            productName: item.product.name,
            quantity: 0,
            revenue: 0,
          }
        }
        productSales[productId].quantity += item.quantity
        productSales[productId].revenue += Number(item.subtotal)
      })
    })

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)

    // PostgreSQL column comparison - use raw query
    const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM "Product"
      WHERE stock <= "minimalStock"
    `
    const lowStockCount = Number(result[0]?.count || 0)

    // Get pending credit (sum of credit where paymentStatus != 'paid')
    const pendingCreditTransactions = await prisma.transaction.findMany({
      where: {
        paymentStatus: {
          not: 'paid',
        },
      },
    })
    const pendingCredit = pendingCreditTransactions.reduce(
      (sum, t) => sum + Number(t.credit),
      0
    )

    return NextResponse.json({
      salesToday: {
        totalRevenue,
        totalTransactions,
        averageTransaction,
        cashRevenue,
        creditRevenue,
      },
      topProducts,
      lowStockCount,
      pendingCredit,
    })
  } catch (error) {
    console.error('Dashboard statistics error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

