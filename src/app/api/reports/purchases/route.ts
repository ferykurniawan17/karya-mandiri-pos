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
    const providerId = searchParams.get('providerId')
    const status = searchParams.get('status')

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

    if (providerId) {
      where.providerId = providerId
    }

    if (status) {
      where.status = status
    }

    // Fetch purchase orders
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        provider: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    })

    // Calculate summary
    const totalPurchase = purchaseOrders.reduce(
      (sum, po) => sum + Number(po.total),
      0
    )
    const totalPOs = purchaseOrders.length
    const totalItems = purchaseOrders.reduce(
      (sum, po) => sum + po.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0
    )
    const averagePO = totalPOs > 0 ? totalPurchase / totalPOs : 0

    // Group data based on groupBy
    const groupedData: Record<string, {
      period: string
      purchase: number
      pos: number
      items: number
    }> = {}

    purchaseOrders.forEach((po) => {
      let periodKey = ''

      switch (groupBy) {
        case 'day':
          periodKey = po.createdAt.toISOString().split('T')[0]
          break
        case 'month':
          const month = po.createdAt.toISOString().substring(0, 7)
          periodKey = month
          break
        case 'provider':
          periodKey = po.provider?.name || 'Tanpa Provider'
          break
        case 'product':
          // Group by products in PO items
          po.items.forEach((item) => {
            const productName = item.product.name
            if (!groupedData[productName]) {
              groupedData[productName] = {
                period: productName,
                purchase: 0,
                pos: new Set<string>(),
                items: 0,
              } as any
            }
            groupedData[productName].purchase += Number(item.subtotal)
            ;(groupedData[productName].pos as Set<string>).add(po.id)
            groupedData[productName].items += item.quantity
          })
          return // Skip default processing for product
        default:
          periodKey = po.createdAt.toISOString().split('T')[0]
      }

      if (groupBy !== 'product') {
        if (!groupedData[periodKey]) {
          groupedData[periodKey] = {
            period: periodKey,
            purchase: 0,
            pos: 0,
            items: 0,
          }
        }
        groupedData[periodKey].purchase += Number(po.total)
        groupedData[periodKey].pos += 1
        groupedData[periodKey].items += po.items.reduce(
          (sum, item) => sum + item.quantity,
          0
        )
      }
    })

    // Convert to array and format
    const data = Object.values(groupedData).map((item) => ({
      period: item.period,
      purchase: typeof item.pos === 'number' ? item.purchase : item.purchase,
      pos: typeof item.pos === 'number' ? item.pos : (item.pos as Set<string>).size,
      items: item.items,
    }))

    // Sort by period (for day/month) or by purchase (for provider/product)
    if (groupBy === 'day' || groupBy === 'month') {
      data.sort((a, b) => a.period.localeCompare(b.period))
    } else {
      data.sort((a, b) => b.purchase - a.purchase)
    }

    return NextResponse.json({
      summary: {
        totalPurchase,
        totalPOs,
        totalItems,
        averagePO,
      },
      data,
    })
  } catch (error) {
    console.error('Purchase report error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

