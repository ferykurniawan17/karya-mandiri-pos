import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { allocatePOPayment } from "@/lib/po-payment-service";

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

export async function PUT(
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

    const body = await request.json();
    const { amount, paymentDate, paymentMethod, note, scheduleId, allocationMode, allocations } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Jumlah pembayaran harus lebih dari 0" },
        { status: 400 }
      );
    }

    if (!paymentMethod) {
      return NextResponse.json(
        { error: "Metode pembayaran harus diisi" },
        { status: 400 }
      );
    }

    const paymentAmount = new Prisma.Decimal(amount);
    const paymentDateObj = paymentDate ? new Date(paymentDate) : new Date();

    // Check if payment exists
    const existingPayment = await prisma.pOPayment.findUnique({
      where: { id: params.paymentId },
      include: {
        allocations: true,
      },
    });

    if (!existingPayment) {
      return NextResponse.json(
        { error: "Pembayaran tidak ditemukan" },
        { status: 404 }
      );
    }

    // Delete existing allocations
    if (existingPayment.allocations.length > 0) {
      await prisma.pOPaymentAllocation.deleteMany({
        where: { paymentId: params.paymentId },
      });
    }

    // Update payment
    const payment = await prisma.pOPayment.update({
      where: { id: params.paymentId },
      data: {
        scheduleId: scheduleId || null,
        amount: paymentAmount,
        paymentDate: paymentDateObj,
        paymentMethod,
        note: note || null,
      },
    });

    // Re-create allocations if needed
    if (allocationMode === "schedule" && scheduleId) {
      const scheduleStatus = await prisma.pOPaymentSchedule.findUnique({
        where: { id: scheduleId },
      });
      
      if (scheduleStatus) {
        // Calculate remaining for this schedule (excluding current payment being edited)
        const existingAllocations = await prisma.pOPaymentAllocation.findMany({
          where: {
            scheduleId,
            paymentId: { not: params.paymentId }, // Exclude current payment
          },
        });
        const totalAllocated = existingAllocations.reduce(
          (sum, alloc) => sum + alloc.amount.toNumber(),
          0
        );
        const remaining = scheduleStatus.amount.toNumber() - totalAllocated;
        
        const amountToAllocate = Prisma.Decimal.min(paymentAmount, new Prisma.Decimal(remaining));

        if (amountToAllocate.gt(0)) {
          await prisma.pOPaymentAllocation.create({
            data: {
              paymentId: payment.id,
              scheduleId: scheduleId,
              amount: amountToAllocate,
            },
          });
        }
      }
    } else if (allocationMode === "manual" && allocations && allocations.length > 0) {
      const manualAllocations = allocations.map(
        (alloc: { scheduleId: string; amount: number }) => ({
          scheduleId: alloc.scheduleId,
          amount: new Prisma.Decimal(alloc.amount),
        })
      );
      await allocatePOPayment(payment.id, manualAllocations);
    }

    const paymentWithRelations = await prisma.pOPayment.findUnique({
      where: { id: payment.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        schedule: true,
        allocations: {
          include: {
            schedule: true,
          },
        },
      },
    });

    const serializedPayment = {
      ...paymentWithRelations,
      amount: paymentWithRelations!.amount.toNumber(),
      allocations: paymentWithRelations!.allocations.map((alloc) => ({
        ...alloc,
        amount: alloc.amount.toNumber(),
        schedule: {
          ...alloc.schedule,
          amount: alloc.schedule.amount.toNumber(),
        },
      })),
    };

    return NextResponse.json({ success: true, payment: serializedPayment });
  } catch (error: any) {
    console.error("Update PO payment error:", error);
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

