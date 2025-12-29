import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import {
  calculatePOPaymentSummary,
  calculateScheduleStatus,
} from "@/lib/po-payment-service";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get PO with schedules
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: params.id },
      include: {
        paymentSchedules: {
          include: {
            allocations: true,
          },
          orderBy: {
            displayOrder: "asc",
          },
        },
        payments: {
          include: {
            allocations: true,
          },
        },
      },
    });

    if (!po) {
      return NextResponse.json(
        { error: "Purchase Order tidak ditemukan" },
        { status: 404 }
      );
    }

    // Calculate summary
    const summary = await calculatePOPaymentSummary(params.id);

    // Calculate status for each schedule
    const schedulesWithStatus = await Promise.all(
      po.paymentSchedules.map(async (schedule) => {
        const status = await calculateScheduleStatus(schedule.id);
        return {
          id: schedule.id,
          dueDate: schedule.dueDate,
          amount: schedule.amount.toNumber(),
          note: schedule.note,
          displayOrder: schedule.displayOrder,
          totalPaid: status.totalPaid.toNumber(),
          remaining: status.remaining.toNumber(),
          status: status.status,
        };
      })
    );

    // Determine overall payment status
    let paymentStatus: "paid" | "partial" | "unpaid";
    if (summary.remainingDebt.eq(0)) {
      paymentStatus = "paid";
    } else if (summary.totalPaid.gt(0)) {
      paymentStatus = "partial";
    } else {
      paymentStatus = "unpaid";
    }

    return NextResponse.json({
      summary: {
        total: summary.total.toNumber(),
        totalPaid: summary.totalPaid.toNumber(),
        remainingDebt: summary.remainingDebt.toNumber(),
        paymentStatus,
      },
      schedules: schedulesWithStatus,
    });
  } catch (error: any) {
    console.error("Get payment summary error:", error);
    return NextResponse.json(
      { error: error.message || "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}

