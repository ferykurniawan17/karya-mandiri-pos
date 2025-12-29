import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

/**
 * Calculate remaining credit for a transaction
 * Remaining credit = original credit - sum of all payment allocations
 */
export async function calculateRemainingCredit(
  transactionId: string
): Promise<Prisma.Decimal> {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      allocations: true,
    },
  });

  if (!transaction) {
    throw new Error("Transaction not found");
  }

  const totalPaid = transaction.allocations.reduce(
    (sum, allocation) => sum.plus(allocation.amount),
    new Prisma.Decimal(0)
  );

  const remainingCredit = transaction.credit.minus(totalPaid);
  return remainingCredit.gte(0) ? remainingCredit : new Prisma.Decimal(0);
}

/**
 * Update transaction payment status based on remaining credit
 */
export async function updateTransactionStatus(
  transactionId: string
): Promise<void> {
  const remainingCredit = await calculateRemainingCredit(transactionId);
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!transaction) {
    throw new Error("Transaction not found");
  }

  let paymentStatus: string;
  if (remainingCredit.eq(0)) {
    paymentStatus = "paid";
  } else if (remainingCredit.lt(transaction.credit)) {
    paymentStatus = "partial";
  } else {
    paymentStatus = "unpaid";
  }

  await prisma.transaction.update({
    where: { id: transactionId },
    data: { paymentStatus },
  });
}

/**
 * Allocate payment using FIFO (First In First Out) method
 * Allocates payment to oldest unpaid transactions first
 */
export async function allocatePaymentFIFO(
  amount: Prisma.Decimal,
  customerId: string
): Promise<Array<{ transactionId: string; amount: Prisma.Decimal }>> {
  // Get all transactions with credit > 0, ordered by createdAt ASC (oldest first)
  const transactions = await prisma.transaction.findMany({
    where: {
      customerId,
      credit: { gt: 0 },
    },
    orderBy: {
      createdAt: "asc",
    },
    include: {
      allocations: true,
    },
  });

  const allocations: Array<{ transactionId: string; amount: Prisma.Decimal }> =
    [];
  let remainingAmount = amount;

  for (const transaction of transactions) {
    if (remainingAmount.lte(0)) break;

    // Calculate remaining credit for this transaction
    const totalPaid = transaction.allocations.reduce(
      (sum, allocation) => sum.plus(allocation.amount),
      new Prisma.Decimal(0)
    );
    const remainingCredit = transaction.credit.minus(totalPaid);

    if (remainingCredit.gt(0)) {
      // Allocate to this transaction
      const allocationAmount = Prisma.Decimal.min(remainingAmount, remainingCredit);
      allocations.push({
        transactionId: transaction.id,
        amount: allocationAmount,
      });
      remainingAmount = remainingAmount.minus(allocationAmount);
    }
  }

  if (remainingAmount.gt(0)) {
    throw new Error(
      `Payment amount exceeds total debt. Remaining: ${remainingAmount.toString()}`
    );
  }

  return allocations;
}

/**
 * Allocate payment manually to selected transactions
 */
export async function allocatePaymentManual(
  amount: Prisma.Decimal,
  allocations: Array<{ transactionId: string; amount: Prisma.Decimal }>
): Promise<void> {
  // Validate total allocation equals payment amount
  const totalAllocation = allocations.reduce(
    (sum, alloc) => sum.plus(alloc.amount),
    new Prisma.Decimal(0)
  );

  if (!totalAllocation.eq(amount)) {
    throw new Error(
      `Total allocation (${totalAllocation.toString()}) must equal payment amount (${amount.toString()})`
    );
  }

  // Validate each transaction exists and has sufficient remaining credit
  for (const allocation of allocations) {
    const remainingCredit = await calculateRemainingCredit(
      allocation.transactionId
    );

    if (allocation.amount.gt(remainingCredit)) {
      throw new Error(
        `Allocation amount (${allocation.amount.toString()}) exceeds remaining credit (${remainingCredit.toString()}) for transaction ${allocation.transactionId}`
      );
    }
  }
}

/**
 * Apply payment allocations to transactions
 * Updates transaction credit and payment status
 */
export async function applyPaymentAllocations(
  allocations: Array<{ transactionId: string; amount: Prisma.Decimal }>
): Promise<void> {
  for (const allocation of allocations) {
    // Update transaction status
    await updateTransactionStatus(allocation.transactionId);
  }
}

