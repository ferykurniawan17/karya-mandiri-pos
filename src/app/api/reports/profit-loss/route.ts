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
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const groupBy = searchParams.get('groupBy') || 'day'

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate dan endDate harus diisi' },
        { status: 400 }
      )
    }

    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    // Fetch transactions with paid status only
    const transactions = await prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
        paymentStatus: 'paid', // Only count paid transactions for revenue
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    })

    // Calculate revenue, COGS, profit
    let totalRevenue = 0
    let totalCOGS = 0

    const groupedData: Record<string, {
      period: string
      revenue: number
      cogs: number
      profit: number
      margin: number
    }> = {}

    transactions.forEach((transaction) => {
      const revenue = Number(transaction.total)
      totalRevenue += revenue

      // Calculate COGS for this transaction
      let transactionCOGS = 0
      transaction.items.forEach((item) => {
        const purchasePrice = item.product.purchasePrice
          ? Number(item.product.purchasePrice)
          : 0
        transactionCOGS += purchasePrice * item.quantity
      })
      totalCOGS += transactionCOGS

      // Group data
      let periodKey = ''
      switch (groupBy) {
        case 'day':
          periodKey = transaction.createdAt.toISOString().split('T')[0]
          break
        case 'month':
          const month = transaction.createdAt.toISOString().substring(0, 7)
          periodKey = month
          break
        case 'category':
          // Group by categories in transaction items
          transaction.items.forEach((item) => {
            const catName = item.product.category.name
            if (!groupedData[catName]) {
              groupedData[catName] = {
                period: catName,
                revenue: 0,
                cogs: 0,
                profit: 0,
                margin: 0,
              }
            }
            const itemRevenue = Number(item.subtotal)
            const itemCOGS = (item.product.purchasePrice ? Number(item.product.purchasePrice) : 0) * item.quantity
            groupedData[catName].revenue += itemRevenue
            groupedData[catName].cogs += itemCOGS
            groupedData[catName].profit = groupedData[catName].revenue - groupedData[catName].cogs
            groupedData[catName].margin = groupedData[catName].revenue > 0
              ? (groupedData[catName].profit / groupedData[catName].revenue) * 100
              : 0
          })
          return // Skip default processing
        case 'product':
          // Group by products
          transaction.items.forEach((item) => {
            const productName = item.product.name
            if (!groupedData[productName]) {
              groupedData[productName] = {
                period: productName,
                revenue: 0,
                cogs: 0,
                profit: 0,
                margin: 0,
              }
            }
            const itemRevenue = Number(item.subtotal)
            const itemCOGS = (item.product.purchasePrice ? Number(item.product.purchasePrice) : 0) * item.quantity
            groupedData[productName].revenue += itemRevenue
            groupedData[productName].cogs += itemCOGS
            groupedData[productName].profit = groupedData[productName].revenue - groupedData[productName].cogs
            groupedData[productName].margin = groupedData[productName].revenue > 0
              ? (groupedData[productName].profit / groupedData[productName].revenue) * 100
              : 0
          })
          return // Skip default processing
        default:
          periodKey = transaction.createdAt.toISOString().split('T')[0]
      }

      if (groupBy !== 'category' && groupBy !== 'product') {
        if (!groupedData[periodKey]) {
          groupedData[periodKey] = {
            period: periodKey,
            revenue: 0,
            cogs: 0,
            profit: 0,
            margin: 0,
          }
        }
        groupedData[periodKey].revenue += revenue
        groupedData[periodKey].cogs += transactionCOGS
        groupedData[periodKey].profit = groupedData[periodKey].revenue - groupedData[periodKey].cogs
        groupedData[periodKey].margin = groupedData[periodKey].revenue > 0
          ? (groupedData[periodKey].profit / groupedData[periodKey].revenue) * 100
          : 0
      }
    })

    const totalProfit = totalRevenue - totalCOGS
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

    // Convert to array
    const data = Object.values(groupedData)

    // Sort by period (for day/month) or by revenue (for category/product)
    if (groupBy === 'day' || groupBy === 'month') {
      data.sort((a, b) => a.period.localeCompare(b.period))
    } else {
      data.sort((a, b) => b.revenue - a.revenue)
    }

    return NextResponse.json({
      summary: {
        totalRevenue,
        totalCOGS,
        totalProfit,
        profitMargin,
      },
      data,
    })
  } catch (error) {
    console.error('Profit/Loss report error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

