import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  calculateStockDeduction,
  getEffectiveStock,
  convertFromBaseUnit,
  calculateQuantityFromPrice,
} from "@/lib/product-units";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const customerId = searchParams.get("customerId");
    const projectId = searchParams.get("projectId");
    const paymentStatus = searchParams.get("paymentStatus");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search");

    const where: any = {};

    if (customerId) {
      where.customerId = customerId;
    }

    if (projectId) {
      where.projectId = projectId;
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // Add one day to include the entire end date
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        where.createdAt.lt = end;
      }
    }

    if (search) {
      // PostgreSQL case-insensitive search
      where.invoiceNo = { mode: 'insensitive', contains: search };
    }

    // First, get transactions with basic info
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
        allocations: {
          select: {
            id: true,
            amount: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Debug: Check if customer is included
    if (transactions.length > 0) {
      const sample = transactions[0];
      console.log(
        `[DEBUG GET] Sample transaction - invoiceNo: ${sample.invoiceNo}, customerId: ${sample.customerId}`
      );
      console.log(
        `[DEBUG GET] Customer object:`,
        JSON.stringify(sample.customer, null, 2)
      );
      console.log(
        `[DEBUG GET] Project object:`,
        JSON.stringify(sample.project, null, 2)
      );
    }

    // PostgreSQL handles Decimal types correctly, no raw SQL needed

    const total = await prisma.transaction.count({ where });

    // Serialize Decimal fields to numbers for JSON response
    const serializedTransactions = transactions.map((transaction: any) => {
      // Helper function to convert Prisma Decimal to number
      const toNumber = (value: any): number => {
        if (value === null || value === undefined) return 0;
        if (typeof value === "number") return value;
        if (typeof value === "string") return parseFloat(value) || 0;
        // If it's a Prisma Decimal object
        if (value && typeof value.toNumber === "function") {
          return value.toNumber();
        }
        // Try direct conversion
        return Number(value) || 0;
      };

      // Ensure customer and project are properly included
      // Serialize customer explicitly to ensure it's included in response
      const serializedCustomer = transaction.customer
        ? {
            id: transaction.customer.id,
            name: transaction.customer.name,
            type: transaction.customer.type,
            phone: transaction.customer.phone || null,
            email: transaction.customer.email || null,
            address: transaction.customer.address || null,
          }
        : null;

      // Serialize project explicitly to ensure it's included in response
      const serializedProject = transaction.project
        ? {
            id: transaction.project.id,
            name: transaction.project.name,
            customerId: transaction.project.customerId,
            isDefault: transaction.project.isDefault || false,
          }
        : null;

      // Debug log
      console.log(
        `[DEBUG GET] Serializing transaction ${transaction.invoiceNo}`
      );
      console.log(`[DEBUG GET] - customerId: ${transaction.customerId}`);
      console.log(`[DEBUG GET] - customer object (raw):`, transaction.customer);
      console.log(`[DEBUG GET] - serializedCustomer:`, serializedCustomer);
      if (transaction.customerId && !serializedCustomer) {
        console.log(
          `[DEBUG GET] WARNING: Transaction ${transaction.invoiceNo} has customerId ${transaction.customerId} but customer is null!`
        );
      }

      // Map items first
      const serializedItems = transaction.items.map((item: any) => {
        // Convert quantity with more robust handling
        // SQLite returns Decimal as objects, but instanceof might not work
        // Try multiple methods to extract the numeric value
        let quantity = 0;

        if (item.quantity !== null && item.quantity !== undefined) {
          // First, check if it has toNumber method (Prisma Decimal)
          if (item.quantity && typeof item.quantity.toNumber === "function") {
            quantity = item.quantity.toNumber();
          }
          // Check if it's already a Prisma Decimal instance
          else if (item.quantity instanceof Prisma.Decimal) {
            quantity = item.quantity.toNumber();
          }
          // Check if it's a number
          else if (typeof item.quantity === "number") {
            quantity = item.quantity;
          }
          // Check if it's a string representation
          else if (typeof item.quantity === "string") {
            quantity = parseFloat(item.quantity) || 0;
          }
          // Check if it's an object with value property (some Decimal implementations)
          else if (
            item.quantity &&
            typeof item.quantity === "object" &&
            "valueOf" in item.quantity
          ) {
            quantity = Number(item.quantity.valueOf());
          }
          // Last resort: try direct conversion
          else {
            const num = Number(item.quantity);
            quantity = isNaN(num) ? 0 : num;
          }
        }

        // Additional debug: log the actual structure
        console.log(
          `[DEBUG GET] Item quantity - raw: ${JSON.stringify(
            item.quantity
          )}, type: ${typeof item.quantity}, constructor: ${
            item.quantity?.constructor?.name
          }, hasToNumber: ${
            typeof item.quantity?.toNumber === "function"
          }, converted: ${quantity}`
        );

        return {
          ...item,
          quantity: quantity,
          price: toNumber(item.price),
          subtotal: toNumber(item.subtotal),
        };
      });

      // Calculate remaining credit (credit - total payments)
      const totalPaid = transaction.allocations
        ? transaction.allocations.reduce(
            (sum: number, alloc: any) =>
              sum + toNumber(alloc.amount),
            0
          )
        : 0;
      const remainingCredit = Math.max(
        0,
        toNumber(transaction.credit) - totalPaid
      );

      // Build response object explicitly to ensure customer and project are included
      const responseObj = {
        id: transaction.id,
        invoiceNo: transaction.invoiceNo,
        total: toNumber(transaction.total),
        cash: toNumber(transaction.cash),
        credit: toNumber(transaction.credit),
        remainingCredit: remainingCredit, // Add remaining credit
        change: toNumber(transaction.change),
        paymentStatus: transaction.paymentStatus,
        paymentMethod: transaction.paymentMethod || null,
        customerId: transaction.customerId || null,
        projectId: transaction.projectId || null,
        projectName: transaction.projectName || null,
        note: transaction.note || null,
        user: transaction.user,
        customer: serializedCustomer,
        project: serializedProject,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
        items: serializedItems,
      };

      // Final debug check
      if (responseObj.customerId && !responseObj.customer) {
        console.log(
          `[DEBUG GET] FINAL WARNING: Response object for ${responseObj.invoiceNo} has customerId but customer is null!`
        );
      }

      return responseObj;
    });

    return NextResponse.json({
      transactions: serializedTransactions,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Get transactions error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
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
    } = body;

    // Debug: Log received customer and project data
    console.log("[DEBUG POST] Received transaction data:", {
      customerId,
      projectId,
      projectName,
      customerIdType: typeof customerId,
      projectIdType: typeof projectId,
    });

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Keranjang kosong" }, { status: 400 });
    }

    // Validate payment amounts
    const cashAmount = Number(cash) || 0;
    const creditAmount = Number(credit) || 0;

    if (cashAmount < 0 || creditAmount < 0) {
      return NextResponse.json(
        { error: "Jumlah pembayaran tidak valid" },
        { status: 400 }
      );
    }

    // Calculate total
    let total = 0;
    const transactionItems = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: {
          sellingUnits: {
            where: { isActive: true },
          },
        },
      });

      if (!product) {
        return NextResponse.json(
          { error: `Produk ${item.productId} tidak ditemukan` },
          { status: 400 }
        );
      }

      // Get selling unit if provided
      let sellingUnit = null;

      // Determine quantity in base unit
      let quantityInBaseUnit = 0;

      if (item.sellingUnitId) {
        sellingUnit = product.sellingUnits?.find(
          (su) => su.id === item.sellingUnitId && su.isActive
        );

        if (!sellingUnit) {
          return NextResponse.json(
            {
              error: `Selling unit tidak ditemukan untuk produk ${product.name}`,
            },
            { status: 400 }
          );
        }

        // If price-based sales, calculate quantity from price
        if (item.priceBasedAmount && sellingUnit.allowPriceBased) {
          const priceAmount = Number(item.priceBasedAmount);
          if (priceAmount > 0) {
            quantityInBaseUnit = calculateQuantityFromPrice(
              priceAmount,
              sellingUnit
            );
            console.log(
              `[DEBUG] Price-based: priceAmount=${priceAmount}, quantityInBaseUnit=${quantityInBaseUnit}, sellingPrice=${sellingUnit.sellingPrice}, conversionFactor=${sellingUnit.conversionFactor}`
            );
          } else {
            return NextResponse.json(
              {
                error: `Price based amount tidak valid untuk produk ${product.name}`,
              },
              { status: 400 }
            );
          }
        } else {
          // Quantity from cart is already in base unit
          // Ensure it's a number (handle both string and number)
          const qty =
            typeof item.quantity === "string"
              ? parseFloat(item.quantity)
              : Number(item.quantity);
          quantityInBaseUnit = isNaN(qty) ? 0 : qty;
          console.log(
            `[DEBUG] Normal: item.quantity=${item.quantity}, qty=${qty}, quantityInBaseUnit=${quantityInBaseUnit}`
          );
        }
      } else {
        // No selling unit, quantity is in base unit
        // Ensure it's a number (handle both string and number)
        const qty =
          typeof item.quantity === "string"
            ? parseFloat(item.quantity)
            : Number(item.quantity);
        quantityInBaseUnit = isNaN(qty) ? 0 : qty;
      }

      if (isNaN(quantityInBaseUnit) || quantityInBaseUnit <= 0) {
        return NextResponse.json(
          {
            error: `Quantity tidak valid untuk produk ${product.name}. Quantity: ${quantityInBaseUnit}, Original: ${item.quantity}`,
          },
          { status: 400 }
        );
      }

      // Ensure quantity is a proper number before converting to Decimal
      quantityInBaseUnit = Number(quantityInBaseUnit);

      // Check stock availability (use baseStock if available, otherwise stock)
      const effectiveStock = getEffectiveStock(product);

      if (effectiveStock < quantityInBaseUnit) {
        return NextResponse.json(
          {
            error: `Stok ${product.name} tidak mencukupi. Stok tersedia: ${effectiveStock}, Dibutuhkan: ${quantityInBaseUnit}`,
          },
          { status: 400 }
        );
      }

      // Use custom price if provided, otherwise use selling unit price or product selling price
      let itemPrice =
        item.customPrice !== undefined
          ? Number(item.customPrice)
          : sellingUnit
          ? Number(sellingUnit.sellingPrice)
          : Number(product.sellingPrice);

      // For subtotal calculation: if price-based, use priceBasedAmount, otherwise calculate from base quantity
      let subtotal = 0;
      if (item.priceBasedAmount) {
        subtotal = item.priceBasedAmount;
      } else if (sellingUnit) {
        // Convert base quantity back to selling unit for price calculation
        const quantityInSellingUnit = convertFromBaseUnit(
          quantityInBaseUnit,
          sellingUnit
        );
        subtotal = quantityInSellingUnit * itemPrice;
      } else {
        subtotal = quantityInBaseUnit * itemPrice;
      }
      total += subtotal;

      // Store quantity, price, and subtotal as numbers in the array
      // We'll convert to Decimal when creating the database records
      transactionItems.push({
        productId: product.id,
        sellingUnitId: sellingUnit?.id || null,
        quantity: quantityInBaseUnit, // Store as number, will convert to Decimal later
        price: itemPrice,
        subtotal: subtotal,
        status: item.status || null,
      });

      console.log(
        `[DEBUG] TransactionItem prepared - quantity: ${quantityInBaseUnit}, price: ${itemPrice}, subtotal: ${subtotal}`
      );
    }

    // Validate payment: cash + credit must equal total
    if (cashAmount + creditAmount !== total) {
      return NextResponse.json(
        { error: "Jumlah pembayaran (tunai + hutang) harus sama dengan total" },
        { status: 400 }
      );
    }

    // Auto-calculate payment status if not provided
    let finalPaymentStatus = paymentStatus;
    if (!finalPaymentStatus) {
      if (cashAmount === total) {
        finalPaymentStatus = "paid";
      } else if (cashAmount === 0) {
        finalPaymentStatus = "unpaid";
      } else {
        finalPaymentStatus = "partial";
      }
    }

    // Calculate change (only if paid fully with cash)
    const change =
      finalPaymentStatus === "paid" && cashAmount > total
        ? cashAmount - total
        : 0;

    // Validate customer and project relationship
    let finalProjectId = projectId;
    if (customerId && !projectId) {
      // Auto-select default project if customer is selected but project is not
      const defaultProject = await prisma.project.findFirst({
        where: {
          customerId,
          isDefault: true,
        },
      });
      if (defaultProject) {
        finalProjectId = defaultProject.id;
      }
    }

    if (customerId && finalProjectId) {
      // Verify project belongs to customer
      const project = await prisma.project.findUnique({
        where: { id: finalProjectId },
      });
      if (!project || project.customerId !== customerId) {
        return NextResponse.json(
          { error: "Proyek tidak sesuai dengan pelanggan yang dipilih" },
          { status: 400 }
        );
      }
    }

    // Generate invoice number
    const invoiceNo = `INV-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)
      .toUpperCase()}`;

    // Use Prisma transaction to ensure atomicity
    // All operations (create transaction, create items, update stocks) must succeed together
    const result = await prisma.$transaction(async (tx) => {
      // Create transaction first
      const transaction = await tx.transaction.create({
        data: {
          invoiceNo,
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
          userId: user.id,
        },
      });

      // Create transaction items
      console.log(
        `[DEBUG] Creating ${transactionItems.length} transaction items...`
      );
      for (const item of transactionItems) {
        const qtyValue = Number(item.quantity);
        const priceValue = Number(item.price);
        const subtotalValue = Number(item.subtotal);

        console.log(
          `[DEBUG] Creating item - qtyValue: ${qtyValue}, priceValue: ${priceValue}, subtotalValue: ${subtotalValue}`
        );

        if (isNaN(qtyValue) || qtyValue <= 0) {
          throw new Error(`Quantity tidak valid: ${qtyValue} untuk produk ${item.productId}`);
        }

        await tx.transactionItem.create({
          data: {
            id: randomUUID(),
            transactionId: transaction.id,
            productId: item.productId,
            sellingUnitId: item.sellingUnitId || null,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal,
            status: item.status || null,
          },
        });
      }

      // Update product stocks - MUST be done within the same transaction
      console.log(`[DEBUG] ========== STARTING STOCK UPDATE ==========`);
      console.log(`[DEBUG] Updating stocks for ${transactionItems.length} products...`);
      for (const item of transactionItems) {
        console.log(`[DEBUG] Processing item: productId=${item.productId}, quantity=${item.quantity}`);
        
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new Error(`Produk ${item.productId} tidak ditemukan untuk update stok`);
        }

        console.log(`[DEBUG] Product found: ${product.name}`);
        console.log(`[DEBUG] - baseUnit: ${product.baseUnit}`);
        console.log(`[DEBUG] - baseStock: ${product.baseStock} (type: ${typeof product.baseStock})`);
        console.log(`[DEBUG] - stock: ${product.stock}`);

        const stockDeduction = Number(item.quantity);
        if (isNaN(stockDeduction) || stockDeduction <= 0) {
          throw new Error(`Invalid stock deduction: ${stockDeduction} untuk produk ${item.productId}`);
        }

        console.log(`[DEBUG] Stock deduction amount: ${stockDeduction}`);

        // Check if product uses baseStock
        // Use same logic as edit transaction endpoint
        // Check both baseStock and baseUnit to be safe
        const hasBaseStock = (product.baseStock !== null && product.baseStock !== undefined) || 
                            (product.baseUnit !== null && product.baseUnit !== undefined);
        
        console.log(`[DEBUG] hasBaseStock: ${hasBaseStock}`);
        
        const updateData: any = {};
        if (hasBaseStock) {
          // For baseStock, use direct number (Prisma will handle Decimal conversion)
          updateData.baseStock = {
            decrement: stockDeduction,
          };
          const currentBaseStock = product.baseStock 
            ? (typeof product.baseStock === 'object' && 'toNumber' in product.baseStock 
                ? product.baseStock.toNumber() 
                : Number(product.baseStock))
            : 0;
          console.log(
            `[DEBUG] Updating baseStock for ${product.name} (ID: ${product.id}): current=${currentBaseStock}, decrement=${stockDeduction}, expected_new=${currentBaseStock - stockDeduction}`
          );
        } else {
          updateData.stock = {
            decrement: Math.round(stockDeduction),
          };
          console.log(
            `[DEBUG] Updating stock for ${product.name} (ID: ${product.id}): current=${product.stock}, decrement=${Math.round(stockDeduction)}, expected_new=${product.stock - Math.round(stockDeduction)}`
          );
        }

        console.log(`[DEBUG] Update data:`, JSON.stringify(updateData, null, 2));
        
        const updatedProduct = await tx.product.update({
          where: { id: item.productId },
          data: updateData,
        });

        // Verify update
        if (hasBaseStock) {
          const newBaseStock = updatedProduct.baseStock 
            ? (typeof updatedProduct.baseStock === 'object' && 'toNumber' in updatedProduct.baseStock 
                ? updatedProduct.baseStock.toNumber() 
                : Number(updatedProduct.baseStock))
            : 0;
          const oldBaseStock = product.baseStock 
            ? (typeof product.baseStock === 'object' && 'toNumber' in product.baseStock 
                ? product.baseStock.toNumber() 
                : Number(product.baseStock))
            : 0;
          console.log(`[DEBUG] ✅ Stock updated: ${product.name}`);
          console.log(`[DEBUG]    - OLD baseStock: ${oldBaseStock}`);
          console.log(`[DEBUG]    - NEW baseStock: ${newBaseStock}`);
          console.log(`[DEBUG]    - Difference: ${oldBaseStock - newBaseStock} (expected: ${stockDeduction})`);
        } else {
          const oldStock = product.stock || 0;
          const newStock = updatedProduct.stock || 0;
          console.log(`[DEBUG] ✅ Stock updated: ${product.name}`);
          console.log(`[DEBUG]    - OLD stock: ${oldStock}`);
          console.log(`[DEBUG]    - NEW stock: ${newStock}`);
          console.log(`[DEBUG]    - Difference: ${oldStock - newStock} (expected: ${Math.round(stockDeduction)})`);
        }
        console.log(`[DEBUG] ========== END STOCK UPDATE FOR ${product.name} ==========`);
      }

      // Fetch complete transaction with items for response
      const transactionWithItems = await tx.transaction.findUnique({
        where: { id: transaction.id },
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
        },
      });

      if (!transactionWithItems) {
        throw new Error("Gagal mengambil transaksi yang dibuat");
      }

      return transactionWithItems;
    });

    // transactionWithItems is now returned from the Prisma transaction
    const transactionWithItems = result;

    // Debug: Verify quantity after create
    console.log(`[DEBUG] Transaction created. Verifying items:`);
    if (transactionWithItems.items && transactionWithItems.items.length > 0) {
      transactionWithItems.items.forEach((item: any, idx: number) => {
        console.log(
          `[DEBUG] Item ${idx} from DB: quantity=${
            item.quantity?.toString() || item.quantity
          }, type=${typeof item.quantity}`
        );
      });
    }

    // Stock update is already done inside the Prisma transaction above
    // No need to update again here

    // Serialize Decimal fields to numbers for JSON response
    const serializedTransaction = {
      ...transactionWithItems,
      total: Number(transactionWithItems.total),
      cash: Number(transactionWithItems.cash),
      credit: Number(transactionWithItems.credit),
      change: Number(transactionWithItems.change),
      items: transactionWithItems.items.map((item: any) => ({
        ...item,
        quantity: Number(item.quantity),
        price: Number(item.price),
        subtotal: Number(item.subtotal),
      })),
    };

    return NextResponse.json({
      success: true,
      transaction: serializedTransaction,
    });
  } catch (error: any) {
    console.error("Create transaction error:", error);
    console.error("Error details:", error.message, error.stack);
    return NextResponse.json(
      { error: "Terjadi kesalahan", details: error.message },
      { status: 500 }
    );
  }
}
