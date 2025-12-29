import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Prisma } from "@prisma/client";

export async function PUT(
  request: NextRequest,
  {
    params,
  }: { params: { id: string; scheduleId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { dueDate, amount, note, displayOrder } = body;

    if (!dueDate || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Due date dan amount harus diisi" },
        { status: 400 }
      );
    }

    // Get existing schedule
    const existingSchedule = await prisma.pOPaymentSchedule.findUnique({
      where: { id: params.scheduleId },
      include: {
        allocations: true,
      },
    });

    if (!existingSchedule) {
      return NextResponse.json(
        { error: "Jadwal pembayaran tidak ditemukan" },
        { status: 404 }
      );
    }

    // Calculate total paid for this schedule
    const totalPaid = existingSchedule.allocations.reduce(
      (sum, alloc) => sum.plus(alloc.amount),
      new Prisma.Decimal(0)
    );

    const newAmount = new Prisma.Decimal(amount);

    // Validate new amount is not less than total paid
    if (newAmount.lt(totalPaid)) {
      return NextResponse.json(
        {
          error: `Jumlah baru (${newAmount.toString()}) tidak boleh kurang dari yang sudah dibayar (${totalPaid.toString()})`,
        },
        { status: 400 }
      );
    }

    // Get other schedules to calculate total
    const otherSchedules = await prisma.pOPaymentSchedule.findMany({
      where: {
        purchaseOrderId: params.id,
        id: { not: params.scheduleId },
      },
    });

    const otherTotal = otherSchedules.reduce(
      (sum, s) => sum.plus(s.amount),
      new Prisma.Decimal(0)
    );

    const totalAfterUpdate = otherTotal.plus(newAmount);

    // Get PO total
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: params.id },
    });

    if (!po) {
      return NextResponse.json(
        { error: "Purchase Order tidak ditemukan" },
        { status: 404 }
      );
    }

    // Validate total doesn't exceed PO total
    if (totalAfterUpdate.gt(po.total)) {
      return NextResponse.json(
        {
          error: `Total jadwal pembayaran (${totalAfterUpdate.toString()}) melebihi total PO (${po.total.toString()})`,
        },
        { status: 400 }
      );
    }

    const schedule = await prisma.pOPaymentSchedule.update({
      where: { id: params.scheduleId },
      data: {
        dueDate: new Date(dueDate),
        amount: newAmount,
        note: note !== undefined ? note : existingSchedule.note,
        displayOrder:
          displayOrder !== undefined
            ? displayOrder
            : existingSchedule.displayOrder,
      },
      include: {
        allocations: {
          include: {
            payment: {
              select: {
                id: true,
                amount: true,
                paymentDate: true,
              },
            },
          },
        },
      },
    });

    // Calculate status
    const remaining = schedule.amount.minus(totalPaid);
    const isFullyPaid = remaining.lte(0);
    const isPartiallyPaid = totalPaid.gt(0) && !isFullyPaid;

    let status: "paid" | "partial" | "unpaid";
    if (isFullyPaid) {
      status = "paid";
    } else if (isPartiallyPaid) {
      status = "partial";
    } else {
      status = "unpaid";
    }

    return NextResponse.json({
      schedule: {
        ...schedule,
        amount: schedule.amount.toNumber(),
        totalPaid: totalPaid.toNumber(),
        remaining: remaining.gte(0) ? remaining.toNumber() : 0,
        status,
        allocations: schedule.allocations.map((alloc) => ({
          ...alloc,
          amount: alloc.amount.toNumber(),
          payment: {
            ...alloc.payment,
            amount: alloc.payment.amount.toNumber(),
          },
        })),
      },
    });
  } catch (error: any) {
    console.error("Update payment schedule error:", error);
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
  }: { params: { id: string; scheduleId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if schedule has payments
    const schedule = await prisma.pOPaymentSchedule.findUnique({
      where: { id: params.scheduleId },
      include: {
        allocations: true,
      },
    });

    if (!schedule) {
      return NextResponse.json(
        { error: "Jadwal pembayaran tidak ditemukan" },
        { status: 404 }
      );
    }

    // Check if there are payments allocated to this schedule
    if (schedule.allocations.length > 0) {
      return NextResponse.json(
        {
          error: "Jadwal pembayaran tidak dapat dihapus karena sudah ada pembayaran",
        },
        { status: 400 }
      );
    }

    await prisma.pOPaymentSchedule.delete({
      where: { id: params.scheduleId },
    });

    return NextResponse.json({ message: "Jadwal pembayaran berhasil dihapus" });
  } catch (error: any) {
    console.error("Delete payment schedule error:", error);
    return NextResponse.json(
      { error: error.message || "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}

