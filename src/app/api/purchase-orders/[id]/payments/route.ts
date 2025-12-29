import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { allocatePOPayment, calculateScheduleStatus } from "@/lib/po-payment-service";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payments = await prisma.pOPayment.findMany({
      where: { purchaseOrderId: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
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
      orderBy: {
        paymentDate: "desc",
      },
    });

    const serializedPayments = payments.map((payment) => ({
      ...payment,
      amount: payment.amount.toNumber(),
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
    }));

    return NextResponse.json({ payments: serializedPayments });
  } catch (error: any) {
    console.error("Get PO payments error:", error);
    return NextResponse.json(
      { error: error.message || "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      scheduleId, // Optional: if payment matches a schedule
      allocationMode, // "schedule" or "manual"
      allocations, // For manual allocation: [{ scheduleId, amount }]
    } = body;

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

    const paymentAmount = new Prisma.Decimal(amount);
    const paymentDateObj = paymentDate ? new Date(paymentDate) : new Date();

    // Verify PO exists
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: params.id },
    });

    if (!po) {
      return NextResponse.json(
        { error: "Purchase Order tidak ditemukan" },
        { status: 404 }
      );
    }

    // Create payment
    const payment = await prisma.pOPayment.create({
      data: {
        purchaseOrderId: params.id,
        scheduleId: scheduleId || null,
        amount: paymentAmount,
        paymentDate: paymentDateObj,
        paymentMethod,
        note: note || null,
        userId: user.id,
      },
    });

    // Handle allocation
    if (allocationMode === "schedule" && scheduleId) {
      // Auto-allocate to the specified schedule
      const scheduleStatus = await calculateScheduleStatus(scheduleId);
      const remaining = scheduleStatus.remaining;

      if (paymentAmount.gt(remaining)) {
        // If payment exceeds remaining, allocate to this schedule and create allocation for excess
        // For now, we'll allocate the full amount to this schedule
        // In the future, we could split it across multiple schedules
        await prisma.pOPaymentAllocation.create({
          data: {
            paymentId: payment.id,
            scheduleId: scheduleId,
            amount: paymentAmount,
          },
        });
      } else {
        await prisma.pOPaymentAllocation.create({
          data: {
            paymentId: payment.id,
            scheduleId: scheduleId,
            amount: paymentAmount,
          },
        });
      }
    } else if (allocationMode === "manual" && allocations) {
      // Manual allocation
      const manualAllocations = allocations.map(
        (alloc: { scheduleId: string; amount: number }) => ({
          scheduleId: alloc.scheduleId,
          amount: new Prisma.Decimal(alloc.amount),
        })
      );

      await allocatePOPayment(payment.id, manualAllocations);
    } else if (scheduleId && allocationMode !== "none") {
      // If scheduleId is provided but no allocation mode, auto-allocate
      await prisma.pOPaymentAllocation.create({
        data: {
          paymentId: payment.id,
          scheduleId: scheduleId,
          amount: paymentAmount,
        },
      });
    }
    // If allocationMode is "none" or no scheduleId, payment is recorded without allocation

    // Fetch complete payment with relations
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

    const serializedPayment = {
      ...paymentWithRelations!,
      amount: paymentWithRelations!.amount.toNumber(),
      schedule: paymentWithRelations!.schedule
        ? {
            ...paymentWithRelations!.schedule,
            amount: paymentWithRelations!.schedule.amount.toNumber(),
          }
        : null,
      allocations: paymentWithRelations!.allocations.map((alloc) => ({
        ...alloc,
        amount: alloc.amount.toNumber(),
        schedule: {
          ...alloc.schedule,
          amount: alloc.schedule.amount.toNumber(),
        },
      })),
    };

    return NextResponse.json(
      {
        payment: serializedPayment,
        message: "Pembayaran berhasil dicatat",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create PO payment error:", error);
    return NextResponse.json(
      { error: error.message || "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}

