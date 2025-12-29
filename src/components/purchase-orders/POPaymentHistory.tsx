"use client";

import { useState, useEffect } from "react";
import { formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import POPaymentForm from "./POPaymentForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  scheduleId?: string | null;
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
  schedules?: Array<{
    id: string;
    dueDate: Date | string;
    amount: number;
    totalPaid?: number;
    remaining?: number;
    status?: "paid" | "partial" | "unpaid";
  }>;
  onPaymentUpdated?: () => void;
}

export default function POPaymentHistory({
  purchaseOrderId,
  schedules = [],
  onPaymentUpdated,
}: POPaymentHistoryProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [deletingPayment, setDeletingPayment] = useState<Payment | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {payments.map((payment) => (
              <tr key={payment.id} className="hover:bg-gray-50">
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
                <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        // Fetch full payment details including allocations
                        try {
                          const response = await fetch(
                            `/api/purchase-orders/${purchaseOrderId}/payments/${payment.id}`
                          );
                          const data = await response.json();
                          if (response.ok && data.payment) {
                            setEditingPayment(data.payment);
                            setShowEditForm(true);
                          } else {
                            console.error("Failed to fetch payment details");
                            // Fallback to basic payment data
                            setEditingPayment(payment);
                            setShowEditForm(true);
                          }
                        } catch (err) {
                          console.error("Error fetching payment details:", err);
                          // Fallback to basic payment data
                          setEditingPayment(payment);
                          setShowEditForm(true);
                        }
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setDeletingPayment(payment);
                        setShowDeleteDialog(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Hapus
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <POPaymentForm
        isOpen={showEditForm}
        onClose={() => {
          setShowEditForm(false);
          setEditingPayment(null);
        }}
        onSuccess={() => {
          setShowEditForm(false);
          setEditingPayment(null);
          fetchPayments();
          // Trigger refresh of payment summary and other components
          window.dispatchEvent(new Event("po-payment-refresh"));
          // Also trigger a custom event for payment update
          window.dispatchEvent(new CustomEvent("po-payment-updated"));
          // Call parent callback if provided
          if (onPaymentUpdated) {
            onPaymentUpdated();
          }
        }}
        purchaseOrderId={purchaseOrderId}
        schedules={schedules}
        editingPayment={editingPayment}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pembayaran?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus pembayaran ini?
              <br />
              <br />
              <strong>Tanggal:</strong>{" "}
              {deletingPayment
                ? formatDate(deletingPayment.paymentDate)
                : ""}
              <br />
              <strong>Jumlah:</strong>{" "}
              {deletingPayment
                ? formatRupiah(deletingPayment.amount)
                : ""}
              <br />
              <br />
              Tindakan ini tidak dapat dibatalkan. Pembayaran dan alokasinya
              akan dihapus secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deletingPayment) return;

                setDeleting(true);
                try {
                  const response = await fetch(
                    `/api/purchase-orders/${purchaseOrderId}/payments/${deletingPayment.id}`,
                    {
                      method: "DELETE",
                    }
                  );

                  const data = await response.json();

                  if (response.ok) {
                    // Refresh payments list
                    fetchPayments();
                    // Trigger refresh of payment summary and other components
                    window.dispatchEvent(new Event("po-payment-refresh"));
                    window.dispatchEvent(new CustomEvent("po-payment-updated"));
                    // Call parent callback if provided
                    if (onPaymentUpdated) {
                      onPaymentUpdated();
                    }
                    // Close dialog
                    setShowDeleteDialog(false);
                    setDeletingPayment(null);
                  } else {
                    alert(data.error || "Gagal menghapus pembayaran");
                  }
                } catch (err) {
                  console.error("Error deleting payment:", err);
                  alert("Terjadi kesalahan saat menghapus pembayaran");
                } finally {
                  setDeleting(false);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleting}
            >
              {deleting ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

