"use client";

import { Payment } from "@/types";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Transaction {
  id: string;
  invoiceNo: string;
  credit: number;
  paymentStatus: string;
  allocations?: Array<{ amount: number }>;
}

interface MultiplePaymentReceiptProps {
  payments: Payment[];
  customer?: {
    id: string;
    name: string;
    type: string;
  } | null;
  transactions?: Transaction[];
  onPrint?: () => void;
}

export default function MultiplePaymentReceipt({
  payments,
  customer,
  transactions,
  onPrint,
}: MultiplePaymentReceiptProps) {
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
      month: "long",
      day: "numeric",
    });
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: "Tunai",
      transfer: "Transfer",
      bank_transfer: "Bank Transfer",
      other: "Lainnya",
    };
    return labels[method] || method;
  };

  // Calculate total paid and remaining debt
  const calculateDebtInfo = () => {
    if (!transactions || transactions.length === 0) {
      return null;
    }

    let totalDebt = 0;
    let totalPaid = 0;

    transactions.forEach((transaction) => {
      totalDebt += transaction.credit || 0;
      // Calculate total paid from all allocations
      const paid =
        transaction.allocations?.reduce(
          (sum, alloc) => sum + (alloc.amount || 0),
          0
        ) || 0;
      totalPaid += paid;
    });

    const remainingDebt = totalDebt - totalPaid;
    const isFullyPaid = remainingDebt <= 0;

    return {
      totalDebt,
      totalPaid,
      remainingDebt: Math.max(0, remainingDebt),
      isFullyPaid,
    };
  };

  const debtInfo = calculateDebtInfo();
  const totalPaymentAmount = payments.reduce(
    (sum, payment) => sum + payment.amount,
    0
  );

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <>
      <div className="no-print mb-4">
        <Button onClick={handlePrint} variant="outline">
          <Printer className="h-4 w-4 mr-2" />
          Print Bukti Pembayaran
        </Button>
      </div>

      <div className="payment-receipt-print bg-white p-6 rounded-lg shadow">
        {/* Logo and Header */}
        <div className="mb-4">
          {(process.env.NEXT_PUBLIC_STORE_LOGO ||
            "/icons/icon-512x512.png") && (
            <div className="mb-3">
              <img
                src={
                  process.env.NEXT_PUBLIC_STORE_LOGO ||
                  "/icons/icon-512x512.png"
                }
                alt="Logo Toko"
                className="h-16 mx-auto object-contain"
                onError={(e) => {
                  // Hide image if it fails to load
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}
          <div className="text-center mb-2">
            <h2 className="text-xl font-bold">BUKTI PEMBAYARAN</h2>
            <p className="text-sm text-gray-600">
              {payments.length} Pembayaran
            </p>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          {customer && (
            <div className="flex justify-between border-b pb-2">
              <span className="font-medium">Pelanggan:</span>
              <span className="text-right">
                {customer.name}
                <br />
                <span className="text-xs text-gray-500">
                  {customer.type === "individual" ? "Perorangan" : "Instansi"}
                </span>
              </span>
            </div>
          )}

          <div className="flex justify-between border-b pb-2">
            <span className="font-medium">Total Pembayaran:</span>
            <span className="font-bold text-lg">
              {formatCurrency(totalPaymentAmount)}
            </span>
          </div>

          {debtInfo && (
            <>
              <div className="flex justify-between border-b pb-2">
                <span className="font-medium">Total Hutang:</span>
                <span>{formatCurrency(debtInfo.totalDebt)}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-medium">Total Dibayar:</span>
                <span>{formatCurrency(debtInfo.totalPaid)}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-medium">Sisa Hutang:</span>
                <span
                  className={
                    debtInfo.isFullyPaid
                      ? "text-green-600 font-bold"
                      : "text-red-600 font-bold"
                  }
                >
                  {debtInfo.isFullyPaid
                    ? "LUNAS"
                    : formatCurrency(debtInfo.remainingDebt)}
                </span>
              </div>
            </>
          )}

          <div className="border-b pb-2">
            <span className="font-medium">Detail Pembayaran:</span>
            <div className="mt-2 space-y-2">
              {payments.map((payment) => (
                <div key={payment.id} className="bg-gray-50 p-2 rounded">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">
                      {formatDate(payment.paymentDate)}
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(payment.amount)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {getPaymentMethodLabel(payment.paymentMethod)}
                    {payment.note && ` - ${payment.note}`}
                  </div>
                  {payment.allocations && payment.allocations.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      Alokasi:
                      {payment.allocations.map((alloc, idx) => (
                        <span key={alloc.id}>
                          {idx > 0 && ", "}
                          {alloc.transaction?.invoiceNo || "N/A"} (
                          {formatCurrency(alloc.amount)})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {transactions && transactions.length > 0 && (
            <div className="border-b pb-2">
              <span className="font-medium">Status Transaksi:</span>
              <div className="mt-2 space-y-1">
                {transactions.map((transaction) => {
                  const paid =
                    transaction.allocations?.reduce(
                      (sum, alloc) => sum + (alloc.amount || 0),
                      0
                    ) || 0;
                  const remaining = Math.max(
                    0,
                    (transaction.credit || 0) - paid
                  );
                  const isPaid = remaining <= 0;

                  return (
                    <div
                      key={transaction.id}
                      className="flex justify-between text-xs"
                    >
                      <span>
                        {transaction.invoiceNo}
                        {isPaid && (
                          <span className="ml-2 text-green-600 font-semibold">
                            (LUNAS)
                          </span>
                        )}
                      </span>
                      {!isPaid && (
                        <span className="text-red-600">
                          Sisa: {formatCurrency(remaining)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-between border-b pb-2">
            <span className="font-medium">Diterima oleh:</span>
            <span>{payments[0]?.user?.name || "N/A"}</span>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-gray-500">
          <p>Terima Kasih</p>
        </div>
      </div>
    </>
  );
}
