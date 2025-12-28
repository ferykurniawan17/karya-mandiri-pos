import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { calculateStockDeduction, getEffectiveStock, convertFromBaseUnit } from '@/lib/product-units'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const customerId = searchParams.get('customerId')
    const projectId = searchParams.get('projectId')
    const paymentStatus = searchParams.get('paymentStatus')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const search = searchParams.get('search')

    const where: any = {}

    if (customerId) {
      where.customerId = customerId
    }

    if (projectId) {
      where.projectId = projectId
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        // Add one day to include the entire end date
        const end = new Date(endDate)
        end.setDate(end.getDate() + 1)
        where.createdAt.lt = end
      }
    }

    if (search) {
      // SQLite doesn't support case-insensitive mode
      where.invoiceNo = { contains: search }
    }

    const transactions = await prisma.transaction.findMany({
      where,
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        customer: true,
        project: true,
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

    const total = await prisma.transaction.count({ where })

    return NextResponse.json({
      transactions,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Get transactions error:', error)
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
    const { 
      items, 
      cash, 
      credit, 
      customerId, 
      projectId, 
      projectName, 
      paymentStatus, 
      paymentMethod, 
      note 
    } = body

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
      
      // Quantity from cart is already in base unit
      let quantityInBaseUnit = item.quantity
      
      if (item.sellingUnitId) {
        sellingUnit = product.sellingUnits?.find(
          (su) => su.id === item.sellingUnitId && su.isActive
        )
        
        if (!sellingUnit) {
          return NextResponse.json(
            { error: `Selling unit tidak ditemukan untuk produk ${product.name}` },
            { status: 400 }
          )
        }
        
        // Quantity is already in base unit from cart
        // No need to convert
      }

      // Check stock availability (use baseStock if available, otherwise stock)
      const effectiveStock = getEffectiveStock(product)
      
      if (effectiveStock < quantityInBaseUnit) {
        return NextResponse.json(
          { error: `Stok ${product.name} tidak mencukupi. Stok tersedia: ${effectiveStock}, Dibutuhkan: ${quantityInBaseUnit}` },
          { status: 400 }
        )
      }

      // Use custom price if provided, otherwise use selling unit price or product selling price
      let itemPrice = item.customPrice !== undefined 
        ? Number(item.customPrice) 
        : (sellingUnit ? Number(sellingUnit.sellingPrice) : Number(product.sellingPrice))
      
      // For subtotal calculation: if price-based, use priceBasedAmount, otherwise calculate from base quantity
      let subtotal = 0
      if (item.priceBasedAmount) {
        subtotal = item.priceBasedAmount
      } else if (sellingUnit) {
        // Convert base quantity back to selling unit for price calculation
        const quantityInSellingUnit = convertFromBaseUnit(quantityInBaseUnit, sellingUnit)
        subtotal = quantityInSellingUnit * itemPrice
      } else {
        subtotal = quantityInBaseUnit * itemPrice
      }
      total += subtotal

      transactionItems.push({
        productId: product.id,
        sellingUnitId: sellingUnit?.id || null,
        quantity: quantityInBaseUnit, // Store in base unit
        price: itemPrice,  // Custom or original price
        subtotal,
        status: item.status || null,
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
    const change = finalPaymentStatus === 'paid' && cashAmount > total 
      ? cashAmount - total 
      : 0

    // Validate customer and project relationship
    let finalProjectId = projectId
    if (customerId && !projectId) {
      // Auto-select default project if customer is selected but project is not
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
      // Verify project belongs to customer
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

    // Generate invoice number
    const invoiceNo = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    // Create transaction with items
    const transaction = await prisma.transaction.create({
      data: {
        invoiceNo,
        total,
        cash: cashAmount,
        credit: creditAmount,
        change,
        paymentStatus: finalPaymentStatus,
        paymentMethod: paymentMethod || null,
        customerId: customerId || null,
        projectId: finalProjectId || null,
        projectName: projectName || null, // Keep for backward compatibility
        note: note || null,
        userId: user.id,
        items: {
          create: transactionItems,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        customer: true,
        project: true,
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
      },
    })

    // Update product stocks
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: {
          sellingUnits: {
            where: { isActive: true },
          },
        },
      })

      if (!product) continue

      // Quantity is already in base unit from transaction items
      const stockDeduction = item.quantity

      // Update stock - use baseStock if available, otherwise stock
      const updateData: any = {}
      if (product.baseStock !== null && product.baseStock !== undefined) {
        updateData.baseStock = {
          decrement: stockDeduction,
        }
      } else {
        // Fallback to old stock field for backward compatibility
        updateData.stock = {
          decrement: Math.round(stockDeduction),
        }
      }

      await prisma.product.update({
        where: { id: item.productId },
        data: updateData,
      })
    }

    return NextResponse.json({
      success: true,
      transaction,
    })
  } catch (error: any) {
    console.error('Create transaction error:', error)
    console.error('Error details:', error.message, error.stack)
    return NextResponse.json(
      { error: 'Terjadi kesalahan', details: error.message },
      { status: 500 }
    )
  }
}

