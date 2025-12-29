import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  allocatePaymentFIFO,
  allocatePaymentManual,
  applyPaymentAllocations,
  calculateRemainingCredit,
} from "@/lib/payment-service";
import { Prisma } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      amount,
      paymentDate,
      paymentMethod,
      note,
      customerId,
      transactionId,
      allocationMode,
      allocations, // For manual allocation: [{ transactionId, amount }]
    } = body;

    // Validation
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Amount harus lebih dari 0" },
        { status: 400 }
      );
    }

    if (!paymentMethod) {
      return NextResponse.json(
        { error: "Payment method harus diisi" },
        { status: 400 }
      );
    }

    if (!customerId && !transactionId) {
      return NextResponse.json(
        { error: "Customer ID atau Transaction ID harus diisi" },
        { status: 400 }
      );
    }

    const paymentAmount = new Prisma.Decimal(amount);
    const paymentDateObj = paymentDate
      ? new Date(paymentDate)
      : new Date();

    let finalAllocations: Array<{
      transactionId: string;
      amount: Prisma.Decimal;
    }> = [];

    // Determine allocation strategy
    if (transactionId) {
      // Per-transaction payment
      const remainingCredit = await calculateRemainingCredit(transactionId);
      if (paymentAmount.gt(remainingCredit)) {
        return NextResponse.json(
          {
            error: `Jumlah pembayaran melebihi sisa hutang. Sisa hutang: ${remainingCredit.toString()}`,
          },
          { status: 400 }
        );
      }

      finalAllocations = [
        {
          transactionId,
          amount: paymentAmount,
        },
      ];
    } else if (customerId) {
      // Aggregate payment
      if (allocationMode === "fifo") {
        // FIFO allocation
        finalAllocations = await allocatePaymentFIFO(
          paymentAmount,
          customerId
        );
      } else if (allocationMode === "manual" && allocations) {
        // Manual allocation
        const manualAllocations = allocations.map(
          (alloc: { transactionId: string; amount: number }) => ({
            transactionId: alloc.transactionId,
            amount: new Prisma.Decimal(alloc.amount),
          })
        );

        await allocatePaymentManual(paymentAmount, manualAllocations);
        finalAllocations = manualAllocations;
      } else {
        return NextResponse.json(
          { error: "Allocation mode harus 'fifo' atau 'manual' dengan allocations" },
          { status: 400 }
        );
      }
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        amount: paymentAmount,
        paymentDate: paymentDateObj,
        paymentMethod,
        note: note || null,
        customerId: customerId || null,
        transactionId: transactionId || null,
        userId: user.id,
      },
    });

    // Create payment allocations
    for (const allocation of finalAllocations) {
      await prisma.paymentAllocation.create({
        data: {
          paymentId: payment.id,
          transactionId: allocation.transactionId,
          amount: allocation.amount,
        },
      });
    }

    // Apply allocations (update transaction statuses)
    await applyPaymentAllocations(finalAllocations);

    // Fetch complete payment with relations
    const paymentWithRelations = await prisma.payment.findUnique({
      where: { id: payment.id },
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
          },
        },
        transaction: {
          select: {
            id: true,
            invoiceNo: true,
          },
        },
        allocations: {
          include: {
            transaction: {
              select: {
                id: true,
                invoiceNo: true,
                total: true,
                credit: true,
                paymentStatus: true,
              },
            },
          },
        },
      },
    });

    // Serialize Decimal fields
    const serializedPayment = {
      ...paymentWithRelations,
      amount: paymentWithRelations!.amount.toNumber(),
      allocations: paymentWithRelations!.allocations.map((alloc) => ({
        ...alloc,
        amount: alloc.amount.toNumber(),
        transaction: {
          ...alloc.transaction,
          total: alloc.transaction.total.toNumber(),
          credit: alloc.transaction.credit.toNumber(),
        },
      })),
    };

    return NextResponse.json(
      { payment: serializedPayment, message: "Pembayaran berhasil dicatat" },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create payment error:", error);
    return NextResponse.json(
      { error: error.message || "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const customerId = searchParams.get("customerId");
    const transactionId = searchParams.get("transactionId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: any = {};

    if (customerId && customerId.trim() !== "") {
      // Filter by customerId - this includes payments made for a customer (aggregate payments)
      // and payments made for transactions that belong to this customer
      where.OR = [
        { customerId: customerId.trim() },
        {
          transaction: {
            customerId: customerId.trim(),
          },
        },
      ];
    }

    if (transactionId && transactionId.trim() !== "") {
      // If transactionId is also provided, we need to combine with customerId filter
      if (where.OR) {
        // If customerId filter exists, we need to combine both
        where.AND = [
          { OR: where.OR },
          { transactionId: transactionId.trim() },
        ];
        delete where.OR;
      } else {
        where.transactionId = transactionId.trim();
      }
    }

    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) {
        where.paymentDate.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        where.paymentDate.lt = end;
      }
    }

    const payments = await prisma.payment.findMany({
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
          },
        },
        transaction: {
          select: {
            id: true,
            invoiceNo: true,
            customerId: true,
            customer: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
        allocations: {
          include: {
            transaction: {
              select: {
                id: true,
                invoiceNo: true,
                total: true,
                credit: true,
                paymentStatus: true,
                customerId: true,
                customer: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        paymentDate: "desc",
      },
    });

    const total = await prisma.payment.count({ where });

    // Serialize Decimal fields
    const serializedPayments = payments.map((payment) => ({
      ...payment,
      amount: payment.amount.toNumber(),
      allocations: payment.allocations.map((alloc) => ({
        ...alloc,
        amount: alloc.amount.toNumber(),
        transaction: {
          ...alloc.transaction,
          total: alloc.transaction.total.toNumber(),
          credit: alloc.transaction.credit.toNumber(),
        },
      })),
    }));

    return NextResponse.json({
      payments: serializedPayments,
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error("Get payments error:", error);
    return NextResponse.json(
      { error: error.message || "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}

