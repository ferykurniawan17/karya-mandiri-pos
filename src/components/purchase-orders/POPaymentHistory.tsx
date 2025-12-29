"use client";

import { useState, useEffect } from "react";
import { formatRupiah } from "@/lib/utils";

interface PaymentAllocation {
  id: string;
  amount: number;
  schedule: {
    id: string;
    dueDate: Date | string;
    amount: number;
  };
}

interface Payment {
  id: string;
  amount: number;
  paymentDate: Date | string;
  paymentMethod: string;
  note?: string | null;
  user: {
    id: string;
    name: string;
  };
  schedule?: {
    id: string;
    dueDate: Date | string;
    amount: number;
  } | null;
  allocations?: PaymentAllocation[];
}

interface POPaymentHistoryProps {
  purchaseOrderId: string;
}

export default function POPaymentHistory({
  purchaseOrderId,
}: POPaymentHistoryProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/purchase-orders/${purchaseOrderId}/payments`
      );
      const data = await response.json();
      if (response.ok) {
        setPayments(data.payments || []);
      }
    } catch (err) {
      console.error("Error fetching payments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [purchaseOrderId]);

  // Listen for refresh event
  useEffect(() => {
    const handleRefresh = () => {
      fetchPayments();
    };
    
    window.addEventListener('po-payment-refresh', handleRefresh);
    return () => {
      window.removeEventListener('po-payment-refresh', handleRefresh);
    };
  }, [purchaseOrderId]);

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
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


  if (loading && payments.length === 0) {
    return <div className="text-center py-4 text-gray-500">Memuat riwayat...</div>;
  }

  if (payments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 border border-dashed rounded">
        Belum ada riwayat pembayaran
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Riwayat Pembayaran</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tanggal
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Jumlah
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Metode
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {payments.map((payment) => (
              <>
                <tr
                  key={payment.id}
                  className="hover:bg-gray-50"
                >
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(payment.paymentDate)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-semibold text-green-600">
                    {formatRupiah(payment.amount)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getPaymentMethodLabel(payment.paymentMethod)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {payment.user.name}
                  </td>
                </tr>
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

