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
    const reportType = searchParams.get('reportType') || 'low-stock'
    const categoryId = searchParams.get('categoryId')
    const brandId = searchParams.get('brandId')

    // Build where clause
    const where: any = {}

    if (categoryId) {
      where.categoryId = categoryId
    }

    if (brandId) {
      where.brandId = brandId
    }

    let products: any[] = []
    let data: any[] = []

    switch (reportType) {
      case 'low-stock':
        // Get all products and filter in JavaScript (SQLite limitation)
        const allProducts = await prisma.product.findMany({
          where,
          include: {
            category: true,
            brand: true,
          },
        })
        products = allProducts.filter((p) => p.stock <= p.minimalStock)
        data = products.map((p) => ({
          productId: p.id,
          productName: p.name,
          sku: p.sku,
          category: p.category.name,
          brand: p.brand?.name || '-',
          stock: p.stock,
          minimalStock: p.minimalStock,
          unit: p.unit,
          purchasePrice: p.purchasePrice ? Number(p.purchasePrice) : 0,
          sellingPrice: Number(p.sellingPrice),
        }))
        break

      case 'fast-moving':
        // Products with highest sales in last 30 days
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const recentTransactions = await prisma.transaction.findMany({
          where: {
            createdAt: {
              gte: thirtyDaysAgo,
            },
          },
          include: {
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

        const productSales: Record<string, {
          productId: string
          productName: string
          sku: string | null
          category: string
          brand: string | null
          quantity: number
          revenue: number
        }> = {}

        recentTransactions.forEach((t) => {
          t.items.forEach((item) => {
            const pid = item.productId
            if (!productSales[pid]) {
              productSales[pid] = {
                productId: pid,
                productName: item.product.name,
                sku: item.product.sku,
                category: item.product.category.name,
                brand: item.product.brand?.name || null,
                quantity: 0,
                revenue: 0,
              }
            }
            productSales[pid].quantity += item.quantity
            productSales[pid].revenue += Number(item.subtotal)
          })
        })

        data = Object.values(productSales)
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 50) // Top 50
        break

      case 'slow-moving':
        // Products with no/low sales in last 90 days
        const ninetyDaysAgo = new Date()
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

        const oldTransactions = await prisma.transaction.findMany({
          where: {
            createdAt: {
              gte: ninetyDaysAgo,
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

        const soldProductIds = new Set<string>()
        oldTransactions.forEach((t) => {
          t.items.forEach((item) => {
            soldProductIds.add(item.productId)
          })
        })

        const allProductsSlow = await prisma.product.findMany({
          where,
          include: {
            category: true,
            brand: true,
          },
        })

        products = allProductsSlow.filter((p) => !soldProductIds.has(p.id))
        data = products.map((p) => ({
          productId: p.id,
          productName: p.name,
          sku: p.sku,
          category: p.category.name,
          brand: p.brand?.name || '-',
          stock: p.stock,
          unit: p.unit,
          purchasePrice: p.purchasePrice ? Number(p.purchasePrice) : 0,
          sellingPrice: Number(p.sellingPrice),
        }))
        break

      case 'valuation':
        // Total inventory value
        const allProductsVal = await prisma.product.findMany({
          where,
          include: {
            category: true,
            brand: true,
          },
        })

        data = allProductsVal.map((p) => {
          const purchasePrice = p.purchasePrice ? Number(p.purchasePrice) : 0
          const valuation = p.stock * purchasePrice
          return {
            productId: p.id,
            productName: p.name,
            sku: p.sku,
            category: p.category.name,
            brand: p.brand?.name || '-',
            stock: p.stock,
            unit: p.unit,
            purchasePrice,
            valuation,
          }
        })

        // Sort by valuation descending
        data.sort((a, b) => b.valuation - a.valuation)
        break

      default:
        return NextResponse.json(
          { error: 'Invalid reportType' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      reportType,
      data,
      total: data.length,
    })
  } catch (error) {
    console.error('Stock report error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

