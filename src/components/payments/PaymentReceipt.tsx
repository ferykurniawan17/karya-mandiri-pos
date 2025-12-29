"use client";

import { Payment } from "@/types";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaymentReceiptProps {
  payment: Payment;
  onPrint?: () => void;
}

export default function PaymentReceipt({
  payment,
  onPrint,
}: PaymentReceiptProps) {
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
      hour: "2-digit",
      minute: "2-digit",
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
              No. Pembayaran: {payment.id.substring(0, 8).toUpperCase()}
            </p>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between border-b pb-2">
            <span className="font-medium">Tanggal:</span>
            <span>{formatDate(payment.paymentDate)}</span>
          </div>

          {payment.customer && (
            <div className="flex justify-between border-b pb-2">
              <span className="font-medium">Pelanggan:</span>
              <span className="text-right">
                {payment.customer.name}
                <br />
                <span className="text-xs text-gray-500">
                  {payment.customer.type === "individual"
                    ? "Perorangan"
                    : "Instansi"}
                </span>
              </span>
            </div>
          )}

          {payment.transaction && (
            <div className="flex justify-between border-b pb-2">
              <span className="font-medium">Invoice:</span>
              <span>{payment.transaction.invoiceNo}</span>
            </div>
          )}

          <div className="flex justify-between border-b pb-2">
            <span className="font-medium">Metode Pembayaran:</span>
            <span>{getPaymentMethodLabel(payment.paymentMethod)}</span>
          </div>

          <div className="flex justify-between border-b pb-2">
            <span className="font-medium">Jumlah Pembayaran:</span>
            <span className="font-bold text-lg">
              {formatCurrency(payment.amount)}
            </span>
          </div>

          {payment.note && (
            <div className="border-b pb-2">
              <span className="font-medium">Catatan:</span>
              <p className="text-gray-700 mt-1">{payment.note}</p>
            </div>
          )}

          {payment.allocations && payment.allocations.length > 0 && (
            <div className="border-b pb-2">
              <span className="font-medium">Alokasi Pembayaran:</span>
              <div className="mt-2 space-y-1">
                {payment.allocations.map((allocation) => (
                  <div
                    key={allocation.id}
                    className="flex justify-between text-xs"
                  >
                    <span>{allocation.transaction?.invoiceNo || "N/A"}</span>
                    <span>{formatCurrency(allocation.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between border-b pb-2">
            <span className="font-medium">Diterima oleh:</span>
            <span>{payment.user?.name || "N/A"}</span>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-gray-500">
          <p>Terima Kasih</p>
        </div>
      </div>
    </>
  );
}
