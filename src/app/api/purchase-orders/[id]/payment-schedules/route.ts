import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { validatePaymentSchedule } from "@/lib/po-payment-service";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const schedules = await prisma.pOPaymentSchedule.findMany({
      where: { purchaseOrderId: params.id },
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
      orderBy: {
        displayOrder: "asc",
      },
    });

    // Calculate status for each schedule
    const schedulesWithStatus = await Promise.all(
      schedules.map(async (schedule) => {
        const totalPaid = schedule.allocations.reduce(
          (sum, alloc) => sum.plus(alloc.amount),
          new Prisma.Decimal(0)
        );
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

        return {
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
        };
      })
    );

    return NextResponse.json({ schedules: schedulesWithStatus });
  } catch (error: any) {
    console.error("Get payment schedules error:", error);
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
    const { dueDate, amount, note, displayOrder } = body;

    if (!dueDate || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Due date dan amount harus diisi" },
        { status: 400 }
      );
    }

    // Get existing schedules to calculate total
    const existingSchedules = await prisma.pOPaymentSchedule.findMany({
      where: { purchaseOrderId: params.id },
    });

    const existingTotal = existingSchedules.reduce(
      (sum, s) => sum.plus(s.amount),
      new Prisma.Decimal(0)
    );

    const newAmount = new Prisma.Decimal(amount);
    const totalAfterAdd = existingTotal.plus(newAmount);

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
    if (totalAfterAdd.gt(po.total)) {
      return NextResponse.json(
        {
          error: `Total jadwal pembayaran (${totalAfterAdd.toString()}) melebihi total PO (${po.total.toString()})`,
        },
        { status: 400 }
      );
    }

    // Get max displayOrder
    const maxDisplayOrder =
      existingSchedules.length > 0
        ? Math.max(...existingSchedules.map((s) => s.displayOrder))
        : -1;

    const schedule = await prisma.pOPaymentSchedule.create({
      data: {
        purchaseOrderId: params.id,
        dueDate: new Date(dueDate),
        amount: newAmount,
        note: note || null,
        displayOrder: displayOrder !== undefined ? displayOrder : maxDisplayOrder + 1,
      },
    });

    return NextResponse.json(
      {
        schedule: {
          ...schedule,
          amount: schedule.amount.toNumber(),
          totalPaid: 0,
          remaining: schedule.amount.toNumber(),
          status: "unpaid",
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create payment schedule error:", error);
    return NextResponse.json(
      { error: error.message || "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}

