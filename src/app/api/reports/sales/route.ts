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
    const categoryId = searchParams.get('categoryId')
    const customerId = searchParams.get('customerId')
    const paymentStatus = searchParams.get('paymentStatus')

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

    // Build where clause
    const where: any = {
      createdAt: {
        gte: start,
        lte: end,
      },
    }

    if (categoryId) {
      where.items = {
        some: {
          product: {
            categoryId,
          },
        },
      }
    }

    if (customerId) {
      where.customerId = customerId
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus
    }

    // Fetch transactions
    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
        customer: true,
      },
    })

    // Calculate summary
    const totalRevenue = transactions.reduce(
      (sum, t) => sum + Number(t.total),
      0
    )
    const totalTransactions = transactions.length
    const totalItems = transactions.reduce(
      (sum, t) => sum + t.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0
    )
    const averageTransaction =
      totalTransactions > 0 ? totalRevenue / totalTransactions : 0

    // Group data based on groupBy
    const groupedData: Record<string, {
      period: string
      revenue: number
      transactions: number
      items: number
    }> = {}

    transactions.forEach((transaction) => {
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
                transactions: new Set<string>(),
                items: 0,
              } as any
            }
            groupedData[catName].revenue += Number(item.subtotal)
            ;(groupedData[catName].transactions as Set<string>).add(transaction.id)
            groupedData[catName].items += item.quantity
          })
          return // Skip default processing for category
        case 'customer':
          periodKey = transaction.customer?.name || 'Tanpa Customer'
          break
        case 'product':
          // Group by products in transaction items
          transaction.items.forEach((item) => {
            const productName = item.product.name
            if (!groupedData[productName]) {
              groupedData[productName] = {
                period: productName,
                revenue: 0,
                transactions: new Set<string>(),
                items: 0,
              } as any
            }
            groupedData[productName].revenue += Number(item.subtotal)
            ;(groupedData[productName].transactions as Set<string>).add(transaction.id)
            groupedData[productName].items += item.quantity
          })
          return // Skip default processing for product
        default:
          periodKey = transaction.createdAt.toISOString().split('T')[0]
      }

      if (groupBy !== 'category' && groupBy !== 'product') {
        if (!groupedData[periodKey]) {
          groupedData[periodKey] = {
            period: periodKey,
            revenue: 0,
            transactions: 0,
            items: 0,
          }
        }
        groupedData[periodKey].revenue += Number(transaction.total)
        groupedData[periodKey].transactions += 1
        groupedData[periodKey].items += transaction.items.reduce(
          (sum, item) => sum + item.quantity,
          0
        )
      }
    })

    // Convert to array and format
    const data = Object.values(groupedData).map((item) => ({
      period: item.period,
      revenue: typeof item.transactions === 'number' 
        ? item.revenue 
        : item.revenue,
      transactions: typeof item.transactions === 'number'
        ? item.transactions
        : (item.transactions as Set<string>).size,
      items: item.items,
    }))

    // Sort by period (for day/month) or by revenue (for category/customer/product)
    if (groupBy === 'day' || groupBy === 'month') {
      data.sort((a, b) => a.period.localeCompare(b.period))
    } else {
      data.sort((a, b) => b.revenue - a.revenue)
    }

    // Chart data for visualization
    const chartData = data.map((item) => ({
      label: item.period,
      value: item.revenue,
    }))

    return NextResponse.json({
      summary: {
        totalRevenue,
        totalTransactions,
        totalItems,
        averageTransaction,
      },
      data,
      chartData,
    })
  } catch (error) {
    console.error('Sales report error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

