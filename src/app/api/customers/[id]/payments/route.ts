import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { calculateRemainingCredit } from "@/lib/payment-service";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all payments for this customer
    const payments = await prisma.payment.findMany({
      where: { customerId: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
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
      orderBy: {
        paymentDate: "desc",
      },
    });

    // Get all unpaid/partial transactions for this customer
    const unpaidTransactions = await prisma.transaction.findMany({
      where: {
        customerId: params.id,
        OR: [
          { paymentStatus: "unpaid" },
          { paymentStatus: "partial" },
        ],
      },
      include: {
        allocations: true,
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc", // Oldest first for FIFO
      },
    });

    // Calculate remaining credit for each transaction
    const transactionsWithRemainingCredit = await Promise.all(
      unpaidTransactions.map(async (transaction) => {
        const remainingCredit = await calculateRemainingCredit(transaction.id);
        return {
          ...transaction,
          remainingCredit: remainingCredit.toNumber(),
          total: transaction.total.toNumber(),
          credit: transaction.credit.toNumber(),
          cash: transaction.cash.toNumber(),
          change: transaction.change.toNumber(),
        };
      })
    );

    // Serialize Decimal fields in payments
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
      unpaidTransactions: transactionsWithRemainingCredit,
    });
  } catch (error: any) {
    console.error("Get customer payments error:", error);
    return NextResponse.json(
      { error: error.message || "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}

