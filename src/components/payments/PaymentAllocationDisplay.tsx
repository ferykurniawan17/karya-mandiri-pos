"use client";

import { PaymentAllocation } from "@/types";

interface PaymentAllocationDisplayProps {
  allocations: PaymentAllocation[];
}

export default function PaymentAllocationDisplay({
  allocations,
}: PaymentAllocationDisplayProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (!allocations || allocations.length === 0) {
    return <p className="text-sm text-gray-500">Tidak ada alokasi</p>;
  }

  return (
    <div className="space-y-2">
      {allocations.map((allocation) => (
        <div
          key={allocation.id}
          className="flex items-center justify-between p-2 bg-gray-50 rounded"
        >
          <div>
            <p className="text-sm font-medium">
              {allocation.transaction?.invoiceNo || "N/A"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-green-600">
              {formatCurrency(allocation.amount)}
            </p>
            {allocation.transaction && (
              <p className="text-xs text-gray-500">
                Status: {allocation.transaction.paymentStatus === "paid" ? "Lunas" : allocation.transaction.paymentStatus === "partial" ? "Sebagian" : "Belum Lunas"}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

