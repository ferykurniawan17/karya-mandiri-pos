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

    // Build where clause for transactions
    const transactionWhere: any = {}
    if (customerId) {
      transactionWhere.customerId = customerId
    }
    if (startDate || endDate) {
      transactionWhere.createdAt = {}
      if (startDate) {
        transactionWhere.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        transactionWhere.createdAt.lte = end
      }
    }

    if (customerId) {
      // Get detail for single customer
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        include: {
          transactions: {
            where: transactionWhere,
            include: {
              items: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      })

      if (!customer) {
        return NextResponse.json(
          { error: 'Customer tidak ditemukan' },
          { status: 404 }
        )
      }

      const totalTransactions = customer.transactions.length
      const totalRevenue = customer.transactions.reduce(
        (sum, t) => sum + Number(t.total),
        0
      )
      const outstandingCredit = customer.transactions
        .filter((t) => t.paymentStatus !== 'paid')
        .reduce((sum, t) => sum + Number(t.credit), 0)
      const lastTransactionDate =
        customer.transactions.length > 0
          ? customer.transactions[0].createdAt
          : null

      return NextResponse.json({
        customer: {
          id: customer.id,
          name: customer.name,
          type: customer.type,
          phone: customer.phone,
          email: customer.email,
          address: customer.address,
        },
        statistics: {
          totalTransactions,
          totalRevenue,
          outstandingCredit,
          lastTransactionDate,
        },
        transactions: customer.transactions,
      })
    } else {
      // Get all customers with statistics
      const customers = await prisma.customer.findMany({
        include: {
          transactions: {
            where: transactionWhere,
          },
        },
      })

      const customersWithStats = customers.map((customer) => {
        const totalTransactions = customer.transactions.length
        const totalRevenue = customer.transactions.reduce(
          (sum, t) => sum + Number(t.total),
          0
        )
        const outstandingCredit = customer.transactions
          .filter((t) => t.paymentStatus !== 'paid')
          .reduce((sum, t) => sum + Number(t.credit), 0)
        const lastTransaction =
          customer.transactions.length > 0
            ? customer.transactions.sort(
                (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
              )[0]
            : null

        return {
          customerId: customer.id,
          customerName: customer.name,
          customerType: customer.type,
          totalTransactions,
          totalRevenue,
          outstandingCredit,
          lastTransactionDate: lastTransaction?.createdAt || null,
        }
      })

      // Calculate summary
      const totalCustomers = customersWithStats.length
      const totalRevenue = customersWithStats.reduce(
        (sum, c) => sum + c.totalRevenue,
        0
      )
      const totalOutstandingCredit = customersWithStats.reduce(
        (sum, c) => sum + c.outstandingCredit,
        0
      )

      // Sort by total revenue descending
      customersWithStats.sort((a, b) => b.totalRevenue - a.totalRevenue)

      return NextResponse.json({
        summary: {
          totalCustomers,
          totalRevenue,
          totalOutstandingCredit,
        },
        customers: customersWithStats,
      })
    }
  } catch (error) {
    console.error('Customer report error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

