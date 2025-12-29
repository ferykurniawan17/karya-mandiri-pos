import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

/**
 * Calculate PO payment summary
 * Returns total, paid, remaining debt
 */
export async function calculatePOPaymentSummary(poId: string) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    include: {
      payments: {
        include: {
          allocations: true,
        },
      },
    },
  });

  if (!po) {
    throw new Error("Purchase Order not found");
  }

  const totalPaid = po.payments.reduce(
    (sum, payment) => sum.plus(payment.amount),
    new Prisma.Decimal(0)
  );

  const remainingDebt = po.total.minus(totalPaid);

  return {
    total: po.total,
    totalPaid,
    remainingDebt: remainingDebt.gte(0) ? remainingDebt : new Prisma.Decimal(0),
  };
}

/**
 * Calculate status for a payment schedule
 * Returns paid amount, remaining amount, and status (paid/partial/unpaid)
 */
export async function calculateScheduleStatus(scheduleId: string) {
  const schedule = await prisma.pOPaymentSchedule.findUnique({
    where: { id: scheduleId },
    include: {
      allocations: {
        include: {
          payment: true,
        },
      },
    },
  });

  if (!schedule) {
    throw new Error("Payment schedule not found");
  }

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
    totalPaid,
    remaining: remaining.gte(0) ? remaining : new Prisma.Decimal(0),
    status,
  };
}

/**
 * Validate payment schedule
 * Ensures total scheduled amount does not exceed PO total
 */
export async function validatePaymentSchedule(
  poId: string,
  schedules: Array<{ dueDate: Date; amount: Prisma.Decimal; note?: string }>
) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
  });

  if (!po) {
    throw new Error("Purchase Order not found");
  }

  // Get existing schedules (excluding the ones being updated)
  const existingSchedules = await prisma.pOPaymentSchedule.findMany({
    where: { purchaseOrderId: poId },
  });

  // Calculate total from new schedules
  const newTotal = schedules.reduce(
    (sum, s) => sum.plus(s.amount),
    new Prisma.Decimal(0)
  );

  // Calculate total from existing schedules
  const existingTotal = existingSchedules.reduce(
    (sum, s) => sum.plus(s.amount),
    new Prisma.Decimal(0)
  );

  // Total should not exceed PO total
  if (newTotal.gt(po.total)) {
    throw new Error(
      `Total scheduled amount (${newTotal.toString()}) exceeds PO total (${po.total.toString()})`
    );
  }

  return true;
}

/**
 * Allocate payment to schedules
 * Used when payment amount doesn't match a single schedule
 */
export async function allocatePOPayment(
  paymentId: string,
  allocations: Array<{ scheduleId: string; amount: Prisma.Decimal }>
) {
  // Validate total allocation equals payment amount
  const payment = await prisma.pOPayment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    throw new Error("Payment not found");
  }

  const totalAllocation = allocations.reduce(
    (sum, alloc) => sum.plus(alloc.amount),
    new Prisma.Decimal(0)
  );

  if (!totalAllocation.eq(payment.amount)) {
    throw new Error(
      `Total allocation (${totalAllocation.toString()}) must equal payment amount (${payment.amount.toString()})`
    );
  }

  // Validate each schedule exists and has sufficient remaining
  for (const allocation of allocations) {
    const scheduleStatus = await calculateScheduleStatus(allocation.scheduleId);
    const maxAllocation = scheduleStatus.remaining.plus(scheduleStatus.totalPaid);

    if (allocation.amount.gt(maxAllocation)) {
      throw new Error(
        `Allocation amount (${allocation.amount.toString()}) exceeds schedule amount (${maxAllocation.toString()})`
      );
    }
  }

  // Create allocations
  for (const allocation of allocations) {
    await prisma.pOPaymentAllocation.create({
      data: {
        paymentId,
        scheduleId: allocation.scheduleId,
        amount: allocation.amount,
      },
    });
  }
}

