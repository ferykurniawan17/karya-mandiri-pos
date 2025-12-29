"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/utils";
import POPaymentScheduleForm from "./POPaymentScheduleForm";
import { Edit, Trash2, Plus, Calendar, DollarSign } from "lucide-react";
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

interface PaymentSchedule {
  id: string;
  dueDate: Date | string;
  amount: number;
  note?: string | null;
  displayOrder: number;
  totalPaid?: number;
  remaining?: number;
  status?: "paid" | "partial" | "unpaid";
}

interface POPaymentScheduleListProps {
  purchaseOrderId: string;
  poTotal: number;
  onScheduleChange?: () => void;
}

export default function POPaymentScheduleList({
  purchaseOrderId,
  poTotal,
  onScheduleChange,
}: POPaymentScheduleListProps) {
  const [schedules, setSchedules] = useState<PaymentSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<PaymentSchedule | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchSchedules();
  }, [purchaseOrderId]);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/purchase-orders/${purchaseOrderId}/payment-schedules`
      );
      const data = await response.json();
      if (response.ok) {
        setSchedules(data.schedules || []);
      }
    } catch (err) {
      console.error("Error fetching schedules:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!scheduleToDelete) return;

    try {
      const response = await fetch(
        `/api/purchase-orders/${purchaseOrderId}/payment-schedules/${scheduleToDelete}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (response.ok) {
        fetchSchedules();
        if (onScheduleChange) onScheduleChange();
        setDeleteDialogOpen(false);
        setScheduleToDelete(null);
      } else {
        alert(data.error || "Gagal menghapus jadwal pembayaran");
      }
    } catch (err) {
      console.error("Error deleting schedule:", err);
      alert("Terjadi kesalahan");
    }
  };

  const getStatusBadge = (status: "paid" | "partial" | "unpaid") => {
    const statusMap = {
      paid: { label: "Lunas", className: "bg-green-100 text-green-800" },
      partial: { label: "Sebagian", className: "bg-yellow-100 text-yellow-800" },
      unpaid: { label: "Belum Bayar", className: "bg-gray-100 text-gray-800" },
    };

    const statusInfo = statusMap[status] || statusMap.unpaid;

    return (
      <span
        className={`px-2 py-1 rounded text-xs font-medium ${statusInfo.className}`}
      >
        {statusInfo.label}
      </span>
    );
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const existingSchedulesTotal = schedules.reduce(
    (sum, s) => sum + (s.amount || 0),
    0
  );

  if (loading && schedules.length === 0) {
    return <div className="text-center py-4 text-gray-500">Memuat jadwal...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Jadwal Pembayaran</h3>
        <Button
          size="sm"
          onClick={() => {
            setEditingSchedule(null);
            setShowForm(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Tambah Jadwal
        </Button>
      </div>

      {schedules.length === 0 ? (
        <div className="text-center py-8 text-gray-500 border border-dashed rounded">
          Belum ada jadwal pembayaran. Klik "Tambah Jadwal" untuk menambahkan.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tanggal Jatuh Tempo
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jumlah
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dibayar
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sisa
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Catatan
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {schedules.map((schedule) => (
                <tr key={schedule.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900">
                        {formatDate(schedule.dueDate)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">
                        {formatRupiah(schedule.amount)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                    {formatRupiah(schedule.totalPaid || 0)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {formatRupiah(schedule.remaining || schedule.amount)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {getStatusBadge(schedule.status || "unpaid")}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {schedule.note || "-"}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingSchedule(schedule);
                          setShowForm(true);
                        }}
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setScheduleToDelete(schedule.id);
                          setDeleteDialogOpen(true);
                        }}
                        title="Hapus"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-sm text-gray-600">
        <p>
          Total Terjadwal: <span className="font-medium">{formatRupiah(existingSchedulesTotal)}</span>
        </p>
        <p>
          Sisa yang bisa dijadwalkan:{" "}
          <span className="font-medium">{formatRupiah(poTotal - existingSchedulesTotal)}</span>
        </p>
      </div>

      <POPaymentScheduleForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingSchedule(null);
        }}
        onSuccess={() => {
          fetchSchedules();
          if (onScheduleChange) onScheduleChange();
        }}
        purchaseOrderId={purchaseOrderId}
        poTotal={poTotal}
        schedule={editingSchedule || undefined}
        existingSchedulesTotal={existingSchedulesTotal}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Jadwal Pembayaran?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus jadwal pembayaran ini? Jadwal yang sudah memiliki pembayaran tidak dapat dihapus. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

