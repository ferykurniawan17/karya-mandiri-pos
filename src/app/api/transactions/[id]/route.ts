import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { Prisma } from '@prisma/client'
import {
  calculateStockDeduction,
  getEffectiveStock,
  convertFromBaseUnit,
  calculateQuantityFromPrice,
} from '@/lib/product-units'
import { randomUUID } from 'crypto'

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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      items,
      cash,
      credit,
      customerId,
      projectId,
      projectName,
      paymentStatus,
      paymentMethod,
      note,
    } = body

    // Check if transaction exists
    const existingTransaction = await prisma.transaction.findUnique({
      where: { id: params.id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        payments: true,
        allocations: true,
      },
    })

    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Transaksi tidak ditemukan' },
        { status: 404 }
      )
    }

    // Check if transaction has payments - if yes, restrict editing credit amount
    const hasPayments = existingTransaction.payments.length > 0
    const totalPaid = existingTransaction.payments.reduce(
      (sum, p) => sum + p.amount.toNumber(),
      0
    )

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Keranjang kosong' },
        { status: 400 }
      )
    }

    // Validate payment amounts
    const cashAmount = Number(cash) || 0
    const creditAmount = Number(credit) || 0

    if (cashAmount < 0 || creditAmount < 0) {
      return NextResponse.json(
        { error: 'Jumlah pembayaran tidak valid' },
        { status: 400 }
      )
    }

    // If transaction has payments, validate that new credit is not less than total paid
    if (hasPayments && creditAmount < totalPaid) {
      return NextResponse.json(
        {
          error: `Tidak dapat mengurangi hutang menjadi kurang dari total pembayaran yang sudah dilakukan (${totalPaid.toLocaleString('id-ID')})`,
        },
        { status: 400 }
      )
    }

    // Calculate total
    let total = 0
    const transactionItems = []

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: {
          sellingUnits: {
            where: { isActive: true },
          },
        },
      })

      if (!product) {
        return NextResponse.json(
          { error: `Produk ${item.productId} tidak ditemukan` },
          { status: 400 }
        )
      }

      // Get selling unit if provided
      let sellingUnit = null
      let quantityInBaseUnit = 0

      if (item.sellingUnitId) {
        sellingUnit = product.sellingUnits?.find(
          (su) => su.id === item.sellingUnitId && su.isActive
        )

        if (!sellingUnit) {
          return NextResponse.json(
            {
              error: `Selling unit tidak ditemukan untuk produk ${product.name}`,
            },
            { status: 400 }
          )
        }

        // If price-based sales, calculate quantity from price
        if (item.priceBasedAmount && sellingUnit.allowPriceBased) {
          const priceAmount = Number(item.priceBasedAmount)
          if (priceAmount > 0) {
            quantityInBaseUnit = calculateQuantityFromPrice(
              priceAmount,
              sellingUnit
            )
          } else {
            return NextResponse.json(
              {
                error: `Price based amount tidak valid untuk produk ${product.name}`,
              },
              { status: 400 }
            )
          }
        } else {
          const qty =
            typeof item.quantity === 'string'
              ? parseFloat(item.quantity)
              : Number(item.quantity)
          quantityInBaseUnit = isNaN(qty) ? 0 : qty
        }
      } else {
        const qty =
          typeof item.quantity === 'string'
            ? parseFloat(item.quantity)
            : Number(item.quantity)
        quantityInBaseUnit = isNaN(qty) ? 0 : qty
      }

      if (isNaN(quantityInBaseUnit) || quantityInBaseUnit <= 0) {
        return NextResponse.json(
          {
            error: `Quantity tidak valid untuk produk ${product.name}`,
          },
          { status: 400 }
        )
      }

      quantityInBaseUnit = Number(quantityInBaseUnit)

      // Calculate stock difference for this item
      const oldItem = existingTransaction.items.find(
        (i) => i.id === item.id || i.productId === item.productId
      )
      const oldQuantity = oldItem ? oldItem.quantity.toNumber() : 0
      const stockDifference = quantityInBaseUnit - oldQuantity

      // Check stock availability (only if increasing quantity)
      if (stockDifference > 0) {
        const effectiveStock = getEffectiveStock(product)
        if (effectiveStock < stockDifference) {
          return NextResponse.json(
            {
              error: `Stok ${product.name} tidak mencukupi. Stok tersedia: ${effectiveStock}, Dibutuhkan tambahan: ${stockDifference}`,
            },
            { status: 400 }
          )
        }
      }

      // Use custom price if provided, otherwise use selling unit price or product selling price
      let itemPrice =
        item.customPrice !== undefined
          ? Number(item.customPrice)
          : sellingUnit
          ? Number(sellingUnit.sellingPrice)
          : Number(product.sellingPrice)

      // Calculate subtotal
      let subtotal = 0
      if (item.priceBasedAmount) {
        subtotal = item.priceBasedAmount
      } else if (sellingUnit) {
        const quantityInSellingUnit = convertFromBaseUnit(
          quantityInBaseUnit,
          sellingUnit
        )
        subtotal = quantityInSellingUnit * itemPrice
      } else {
        subtotal = quantityInBaseUnit * itemPrice
      }
      total += subtotal

      transactionItems.push({
        id: item.id || randomUUID(), // Use existing ID if editing, otherwise generate new
        productId: product.id,
        sellingUnitId: sellingUnit?.id || null,
        quantity: quantityInBaseUnit,
        price: itemPrice,
        subtotal: subtotal,
        status: item.status || null,
        stockDifference, // Store for later stock update
      })
    }

    // Validate payment: cash + credit must equal total
    if (cashAmount + creditAmount !== total) {
      return NextResponse.json(
        { error: 'Jumlah pembayaran (tunai + hutang) harus sama dengan total' },
        { status: 400 }
      )
    }

    // Auto-calculate payment status if not provided
    let finalPaymentStatus = paymentStatus
    if (!finalPaymentStatus) {
      if (cashAmount === total) {
        finalPaymentStatus = 'paid'
      } else if (cashAmount === 0) {
        finalPaymentStatus = 'unpaid'
      } else {
        finalPaymentStatus = 'partial'
      }
    }

    // Calculate change (only if paid fully with cash)
    const change =
      finalPaymentStatus === 'paid' && cashAmount > total
        ? cashAmount - total
        : 0

    // Validate customer and project relationship
    let finalProjectId = projectId
    if (customerId && !projectId) {
      const defaultProject = await prisma.project.findFirst({
        where: {
          customerId,
          isDefault: true,
        },
      })
      if (defaultProject) {
        finalProjectId = defaultProject.id
      }
    }

    if (customerId && finalProjectId) {
      const project = await prisma.project.findUnique({
        where: { id: finalProjectId },
      })
      if (!project || project.customerId !== customerId) {
        return NextResponse.json(
          { error: 'Proyek tidak sesuai dengan pelanggan yang dipilih' },
          { status: 400 }
        )
      }
    }

    // Restore stock from old items
    for (const oldItem of existingTransaction.items) {
      const product = await prisma.product.findUnique({
        where: { id: oldItem.productId },
      })

      if (!product) continue

      const oldQuantity = oldItem.quantity.toNumber()
      const updateData: any = {}
      if (product.baseStock !== null && product.baseStock !== undefined) {
        updateData.baseStock = {
          increment: oldQuantity,
        }
      } else {
        updateData.stock = {
          increment: Math.round(oldQuantity),
        }
      }

      await prisma.product.update({
        where: { id: oldItem.productId },
        data: updateData,
      })
    }

    // Delete old transaction items
    await prisma.transactionItem.deleteMany({
      where: { transactionId: params.id },
    })

    // Update transaction
    const updatedTransaction = await prisma.transaction.update({
      where: { id: params.id },
      data: {
        total: new Prisma.Decimal(total),
        cash: new Prisma.Decimal(cashAmount),
        credit: new Prisma.Decimal(creditAmount),
        change: new Prisma.Decimal(change),
        paymentStatus: finalPaymentStatus,
        paymentMethod: paymentMethod || null,
        customerId: customerId || null,
        projectId: finalProjectId || null,
        projectName: projectName || null,
        note: note || null,
      },
    })

    // Create new transaction items
    for (const item of transactionItems) {
      await prisma.transactionItem.create({
        data: {
          id: item.id,
          transactionId: params.id,
          productId: item.productId,
          sellingUnitId: item.sellingUnitId || null,
          quantity: new Prisma.Decimal(item.quantity),
          price: new Prisma.Decimal(item.price),
          subtotal: new Prisma.Decimal(item.subtotal),
          status: item.status || null,
        },
      })

      // Update stock for new items (deduct)
      if (item.stockDifference !== 0) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        })

        if (product) {
          const updateData: any = {}
          if (product.baseStock !== null && product.baseStock !== undefined) {
            updateData.baseStock = {
              decrement: Math.abs(item.stockDifference),
            }
          } else {
            updateData.stock = {
              decrement: Math.round(Math.abs(item.stockDifference)),
            }
          }

          await prisma.product.update({
            where: { id: item.productId },
            data: updateData,
          })
        }
      }
    }

    // Fetch updated transaction with all relations
    const transactionWithItems = await prisma.transaction.findUnique({
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
            address: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            customerId: true,
            isDefault: true,
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
        },
      },
    })

    if (!transactionWithItems) {
      return NextResponse.json(
        { error: 'Gagal mengupdate transaksi' },
        { status: 500 }
      )
    }

    // Serialize Decimal fields
    const serializedTransaction = {
      ...transactionWithItems,
      total: transactionWithItems.total.toNumber(),
      cash: transactionWithItems.cash.toNumber(),
      credit: transactionWithItems.credit.toNumber(),
      change: transactionWithItems.change.toNumber(),
      items: transactionWithItems.items.map((item: any) => ({
        ...item,
        quantity: item.quantity.toNumber(),
        price: item.price.toNumber(),
        subtotal: item.subtotal.toNumber(),
      })),
      payments: transactionWithItems.payments.map((payment: any) => ({
        ...payment,
        amount: payment.amount.toNumber(),
      })),
      allocations: transactionWithItems.allocations.map((alloc: any) => ({
        ...alloc,
        amount: alloc.amount.toNumber(),
        payment: {
          ...alloc.payment,
          amount: alloc.payment.amount.toNumber(),
        },
      })),
    }

    return NextResponse.json({
      success: true,
      transaction: serializedTransaction,
    })
  } catch (error: any) {
    console.error('Update transaction error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan', details: error.message },
      { status: 500 }
    )
  }
}

