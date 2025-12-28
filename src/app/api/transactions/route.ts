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
      // SQLite doesn't support case-insensitive mode
      where.invoiceNo = { contains: search };
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

    // For each transaction, fetch items with raw SQL to get correct quantity values
    // This is necessary because Prisma might not read REAL values correctly from SQLite
    for (const transaction of transactions) {
      if (transaction.items && transaction.items.length > 0) {
        const itemIds = transaction.items.map((item: any) => item.id);
        if (itemIds.length > 0) {
          // Build the query with proper parameter placeholders
          const placeholders = itemIds.map(() => "?").join(",");
          // Fetch quantities using raw SQL to ensure correct values
          const quantityMap = (await prisma.$queryRawUnsafe(
            `SELECT id, CAST(quantity AS REAL) as quantity FROM TransactionItem WHERE id IN (${placeholders})`,
            ...itemIds
          )) as Array<{ id: string; quantity: number }>;

          // Update quantities in transaction items
          for (const item of transaction.items) {
            const rawItem = quantityMap.find((r: any) => r.id === item.id);
            if (rawItem) {
              // Replace the quantity with the raw SQL value
              const rawQty =
                typeof rawItem.quantity === "number"
                  ? rawItem.quantity
                  : parseFloat(String(rawItem.quantity)) || 0;
              item.quantity = rawQty;
              console.log(
                `[DEBUG GET] Updated quantity from raw SQL - itemId: ${item.id}, Prisma qty: ${item.quantity}, Raw SQL qty: ${rawQty}`
              );
            }
          }
        }
      }
    }

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

      // Build response object explicitly to ensure customer and project are included
      const responseObj = {
        id: transaction.id,
        invoiceNo: transaction.invoiceNo,
        total: toNumber(transaction.total),
        cash: toNumber(transaction.cash),
        credit: toNumber(transaction.credit),
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

    // Create transaction first (without items to avoid nested create issues with Decimal)
    const transaction = await prisma.transaction.create({
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
        projectName: projectName || null, // Keep for backward compatibility
        note: note || null,
        userId: user.id,
      },
    });

    // Create transaction items separately to ensure Decimal values are preserved correctly
    console.log(
      `[DEBUG] Creating ${transactionItems.length} transaction items...`
    );
    for (const item of transactionItems) {
      // Get the numeric values (they should already be numbers from the array)
      const qtyValue = Number(item.quantity);
      const priceValue = Number(item.price);
      const subtotalValue = Number(item.subtotal);

      console.log(
        `[DEBUG] Creating item - qtyValue: ${qtyValue}, priceValue: ${priceValue}, subtotalValue: ${subtotalValue}`
      );

      // Validate quantity
      if (isNaN(qtyValue) || qtyValue <= 0) {
        console.error(
          `[ERROR] Invalid quantity: ${qtyValue} for product ${item.productId}`
        );
        return NextResponse.json(
          { error: `Quantity tidak valid: ${qtyValue}` },
          { status: 400 }
        );
      }

      // For SQLite, we need to use raw SQL to ensure decimal precision is preserved
      // SQLite stores Decimal as REAL, and Prisma's nested create might have issues
      const itemId = randomUUID();

      console.log(
        `[DEBUG] Using raw SQL insert - ID: ${itemId}, qtyValue: ${qtyValue} (type: ${typeof qtyValue}), priceValue: ${priceValue}, subtotalValue: ${subtotalValue}`
      );

      // Convert to string with proper decimal format for SQLite
      // SQLite will automatically convert string numbers to REAL
      const qtyStr = qtyValue.toString();
      const priceStr = priceValue.toString();
      const subtotalStr = subtotalValue.toString();

      console.log(
        `[DEBUG] String values - qty: "${qtyStr}", price: "${priceStr}", subtotal: "${subtotalStr}"`
      );

      // Use raw SQL with explicit CAST to REAL to ensure proper storage
      await prisma.$executeRawUnsafe(
        `INSERT INTO TransactionItem (id, transactionId, productId, sellingUnitId, quantity, price, subtotal, status)
         VALUES (?, ?, ?, ?, CAST(? AS REAL), CAST(? AS REAL), CAST(? AS REAL), ?)`,
        itemId,
        transaction.id,
        item.productId,
        item.sellingUnitId || null,
        qtyStr, // Pass as string - SQLite will CAST to REAL
        priceStr,
        subtotalStr,
        item.status || null
      );

      console.log(
        `[DEBUG] Item inserted with raw SQL - ID: ${itemId}, quantity: ${qtyStr}`
      );

      // Fetch back to verify using raw SQL to see what's actually stored
      const verifyResult = (await prisma.$queryRawUnsafe(
        `SELECT id, quantity, typeof(quantity) as qty_type FROM TransactionItem WHERE id = ?`,
        itemId
      )) as any[];

      if (verifyResult && verifyResult.length > 0) {
        const stored = verifyResult[0];
        console.log(
          `[DEBUG] Raw SQL verification - quantity: ${stored.quantity}, type: ${stored.qty_type}`
        );
      }

      // Also fetch using Prisma to see what Prisma returns
      const verifyItem = await prisma.transactionItem.findUnique({
        where: { id: itemId },
        select: { quantity: true, price: true, subtotal: true },
      });

      if (verifyItem) {
        const verifyQty =
          verifyItem.quantity instanceof Prisma.Decimal
            ? verifyItem.quantity.toNumber()
            : Number(verifyItem.quantity);
        console.log(
          `[DEBUG] Prisma verification - quantity: ${verifyQty} (type: ${typeof verifyItem.quantity}), expected: ${qtyValue}`
        );
        if (Math.abs(verifyQty - qtyValue) > 0.0001) {
          console.error(
            `[ERROR] Quantity mismatch! Expected: ${qtyValue}, Stored: ${verifyQty}, Diff: ${Math.abs(
              verifyQty - qtyValue
            )}`
          );
        }
      } else {
        console.error(
          `[ERROR] Failed to fetch inserted item with ID: ${itemId}`
        );
      }
    }

    // Fetch the complete transaction with items
    const transactionWithItems = await prisma.transaction.findUnique({
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
      return NextResponse.json(
        { error: "Gagal membuat transaksi" },
        { status: 500 }
      );
    }

    // Fix quantity values using raw SQL (same issue as GET endpoint)
    // Prisma doesn't read REAL values correctly from SQLite
    if (transactionWithItems.items && transactionWithItems.items.length > 0) {
      const itemIds = transactionWithItems.items.map((item: any) => item.id);
      if (itemIds.length > 0) {
        // Fetch quantities using raw SQL to ensure correct values
        const placeholders = itemIds.map(() => "?").join(",");
        const quantityMap = (await prisma.$queryRawUnsafe(
          `SELECT id, CAST(quantity AS REAL) as quantity FROM TransactionItem WHERE id IN (${placeholders})`,
          ...itemIds
        )) as Array<{ id: string; quantity: number }>;

        // Update quantities in transaction items
        for (const item of transactionWithItems.items) {
          const rawItem = quantityMap.find((r: any) => r.id === item.id);
          if (rawItem) {
            const rawQty =
              typeof rawItem.quantity === "number"
                ? rawItem.quantity
                : parseFloat(String(rawItem.quantity)) || 0;
            item.quantity = rawQty;
            console.log(
              `[DEBUG POST] Updated quantity from raw SQL - itemId: ${item.id}, Prisma qty: ${item.quantity}, Raw SQL qty: ${rawQty}`
            );
          }
        }
      }
    }

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

    // Update product stocks
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: {
          sellingUnits: {
            where: { isActive: true },
          },
        },
      });

      if (!product) continue;

      // Quantity is already in base unit from transaction items
      const stockDeduction = item.quantity;

      // Update stock - use baseStock if available, otherwise stock
      const updateData: any = {};
      if (product.baseStock !== null && product.baseStock !== undefined) {
        updateData.baseStock = {
          decrement: stockDeduction,
        };
      } else {
        // Fallback to old stock field for backward compatibility
        updateData.stock = {
          decrement: Math.round(stockDeduction),
        };
      }

      await prisma.product.update({
        where: { id: item.productId },
        data: updateData,
      });
    }

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
