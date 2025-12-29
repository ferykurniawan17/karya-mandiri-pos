import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payment = await prisma.payment.findUnique({
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
        transaction: {
          select: {
            id: true,
            invoiceNo: true,
            total: true,
            credit: true,
            paymentStatus: true,
            createdAt: true,
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
                createdAt: true,
                customer: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                project: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Pembayaran tidak ditemukan" },
        { status: 404 }
      );
    }

    // Serialize Decimal fields
    const serializedPayment = {
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
      transaction: payment.transaction
        ? {
            ...payment.transaction,
            total: payment.transaction.total.toNumber(),
            credit: payment.transaction.credit.toNumber(),
          }
        : null,
    };

    return NextResponse.json({ payment: serializedPayment });
  } catch (error: any) {
    console.error("Get payment error:", error);
    return NextResponse.json(
      { error: error.message || "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}

