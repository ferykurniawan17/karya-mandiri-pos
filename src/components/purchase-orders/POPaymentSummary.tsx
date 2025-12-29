"use client";

import { useState, useEffect } from "react";
import { formatRupiah } from "@/lib/utils";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface PaymentSummary {
  total: number;
  totalPaid: number;
  remainingDebt: number;
  paymentStatus: "paid" | "partial" | "unpaid";
}

interface Schedule {
  id: string;
  dueDate: Date | string;
  amount: number;
  totalPaid: number;
  remaining: number;
  status: "paid" | "partial" | "unpaid";
}

interface POPaymentSummaryProps {
  purchaseOrderId: string;
  poTotal: number;
}

export default function POPaymentSummary({
  purchaseOrderId,
  poTotal,
}: POPaymentSummaryProps) {
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/purchase-orders/${purchaseOrderId}/payment-summary`
      );
      const data = await response.json();
      if (response.ok) {
        setSummary(data.summary);
        setSchedules(data.schedules || []);
      }
    } catch (err) {
      console.error("Error fetching payment summary:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [purchaseOrderId]);

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      fetchSummary();
    };
    
    window.addEventListener('po-payment-refresh', handleRefresh);
    window.addEventListener('po-payment-updated', handleRefresh);
    return () => {
      window.removeEventListener('po-payment-refresh', handleRefresh);
      window.removeEventListener('po-payment-updated', handleRefresh);
    };
  }, [purchaseOrderId]);

  if (loading) {
    return <div className="text-center py-4 text-gray-500">Memuat summary...</div>;
  }

  if (!summary) {
    return null;
  }

  const progressPercentage =
    summary.total > 0 ? (summary.totalPaid / summary.total) * 100 : 0;

  const getStatusIcon = () => {
    switch (summary.paymentStatus) {
      case "paid":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "partial":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default:
        return <XCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusLabel = () => {
    switch (summary.paymentStatus) {
      case "paid":
        return "Lunas";
      case "partial":
        return "Sebagian";
      default:
        return "Belum Bayar";
    }
  };

  const getStatusColor = () => {
    switch (summary.paymentStatus) {
      case "paid":
        return "text-green-600 bg-green-50 border-green-200";
      case "partial":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Summary Pembayaran</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-500 mb-1">Total PO</div>
          <div className="text-xl font-bold text-gray-900">
            {formatRupiah(summary.total)}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-500 mb-1">Sudah Dibayar</div>
          <div className="text-xl font-bold text-green-600">
            {formatRupiah(summary.totalPaid)}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-500 mb-1">Sisa Hutang</div>
          <div className="text-xl font-bold text-red-600">
            {formatRupiah(summary.remainingDebt)}
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="font-medium">Status: {getStatusLabel()}</span>
          </div>
          <span
            className={`px-3 py-1 rounded text-sm font-medium border ${getStatusColor()}`}
          >
            {getStatusLabel()}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
          <div
            className={`h-2.5 rounded-full ${
              summary.paymentStatus === "paid"
                ? "bg-green-600"
                : summary.paymentStatus === "partial"
                ? "bg-yellow-600"
                : "bg-gray-400"
            }`}
            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
          ></div>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {progressPercentage.toFixed(1)}% dari total PO
        </div>
      </div>

      {schedules.length > 0 && (
        <div className="bg-white border rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Status per Jadwal
          </h4>
          <div className="space-y-2">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    {new Date(schedule.dueDate).toLocaleDateString("id-ID")}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatRupiah(schedule.amount)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {formatRupiah(schedule.totalPaid)} / {formatRupiah(schedule.amount)}
                  </div>
                  <div className="text-xs">
                    <span
                      className={
                        schedule.status === "paid"
                          ? "text-green-600"
                          : schedule.status === "partial"
                          ? "text-yellow-600"
                          : "text-gray-600"
                      }
                    >
                      {schedule.status === "paid"
                        ? "Lunas"
                        : schedule.status === "partial"
                        ? "Sebagian"
                        : "Belum Bayar"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

