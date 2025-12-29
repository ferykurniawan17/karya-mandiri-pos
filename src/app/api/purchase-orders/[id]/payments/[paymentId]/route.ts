import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  {
    params,
  }: { params: { id: string; paymentId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payment = await prisma.pOPayment.findUnique({
      where: { id: params.paymentId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        purchaseOrder: {
          select: {
            id: true,
            poNumber: true,
            total: true,
          },
        },
        schedule: {
          select: {
            id: true,
            dueDate: true,
            amount: true,
          },
        },
        allocations: {
          include: {
            schedule: {
              select: {
                id: true,
                dueDate: true,
                amount: true,
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

    const serializedPayment = {
      ...payment,
      amount: payment.amount.toNumber(),
      purchaseOrder: {
        ...payment.purchaseOrder,
        total: payment.purchaseOrder.total.toNumber(),
      },
      schedule: payment.schedule
        ? {
            ...payment.schedule,
            amount: payment.schedule.amount.toNumber(),
          }
        : null,
      allocations: payment.allocations.map((alloc) => ({
        ...alloc,
        amount: alloc.amount.toNumber(),
        schedule: {
          ...alloc.schedule,
          amount: alloc.schedule.amount.toNumber(),
        },
      })),
    };

    return NextResponse.json({ payment: serializedPayment });
  } catch (error: any) {
    console.error("Get PO payment error:", error);
    return NextResponse.json(
      { error: error.message || "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  {
    params,
  }: { params: { id: string; paymentId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if payment exists
    const payment = await prisma.pOPayment.findUnique({
      where: { id: params.paymentId },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Pembayaran tidak ditemukan" },
        { status: 404 }
      );
    }

    // Delete payment (allocations will be cascade deleted)
    await prisma.pOPayment.delete({
      where: { id: params.paymentId },
    });

    return NextResponse.json({ message: "Pembayaran berhasil dihapus" });
  } catch (error: any) {
    console.error("Delete PO payment error:", error);
    return NextResponse.json(
      { error: error.message || "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}

