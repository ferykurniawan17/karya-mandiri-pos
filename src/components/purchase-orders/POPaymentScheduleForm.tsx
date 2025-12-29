"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { validateNumberInput, formatRupiah, parseRupiah } from "@/lib/utils";

interface POPaymentScheduleFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  purchaseOrderId: string;
  poTotal: number;
  schedule?: {
    id: string;
    dueDate: Date | string;
    amount: number;
    note?: string | null;
    displayOrder: number;
  } | null;
  existingSchedulesTotal?: number; // Total dari schedules yang sudah ada (untuk edit)
}

export default function POPaymentScheduleForm({
  isOpen,
  onClose,
  onSuccess,
  purchaseOrderId,
  poTotal,
  schedule,
  existingSchedulesTotal = 0,
}: POPaymentScheduleFormProps) {
  const [dueDate, setDueDate] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (schedule) {
        const date = new Date(schedule.dueDate);
        setDueDate(date.toISOString().split("T")[0]);
        setAmount(schedule.amount.toString());
        setNote(schedule.note || "");
      } else {
        setDueDate("");
        setAmount("");
        setNote("");
      }
      setError("");
    }
  }, [isOpen, schedule]);

  const handleAmountChange = (value: string) => {
    const rawValue = value.replace(/Rp|\./g, "").replace(/,/g, ".");
    const validated = validateNumberInput(rawValue, {
      min: 0,
      allowDecimal: true,
      allowNegative: false,
    });
    if (validated !== null || rawValue === "" || rawValue === ".") {
      setAmount(rawValue);
    }
  };

  const handleAmountBlur = () => {
    const numValue = parseRupiah(amount);
    if (numValue !== null) {
      setAmount(numValue.toString());
    } else if (amount !== "") {
      setAmount("0");
    }
  };

  const calculateRemaining = () => {
    const currentAmount = parseFloat(amount) || 0;
    const otherSchedulesTotal = schedule
      ? existingSchedulesTotal - schedule.amount
      : existingSchedulesTotal;
    const totalAfter = otherSchedulesTotal + currentAmount;
    return Math.max(0, poTotal - totalAfter);
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      const amountNum = parseFloat(amount) || 0;
      const remaining = calculateRemaining();

      if (!dueDate) {
        setError("Tanggal jatuh tempo harus diisi");
        setLoading(false);
        return;
      }

      if (amountNum <= 0) {
        setError("Jumlah pembayaran harus lebih dari 0");
        setLoading(false);
        return;
      }

      if (amountNum > poTotal) {
        setError(`Jumlah pembayaran tidak boleh melebihi total PO (${formatRupiah(poTotal)})`);
        setLoading(false);
        return;
      }

      if (remaining < 0) {
        setError(
          `Total jadwal pembayaran melebihi total PO. Sisa yang bisa dijadwalkan: ${formatRupiah(poTotal - existingSchedulesTotal)}`
        );
        setLoading(false);
        return;
      }

      const url = schedule
        ? `/api/purchase-orders/${purchaseOrderId}/payment-schedules/${schedule.id}`
        : `/api/purchase-orders/${purchaseOrderId}/payment-schedules`;

      const method = schedule ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dueDate,
          amount: amountNum,
          note: note || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        setError(data.error || "Gagal menyimpan jadwal pembayaran");
      }
    } catch (err: any) {
      console.error("Error saving schedule:", err);
      setError("Terjadi kesalahan saat menyimpan jadwal pembayaran");
    } finally {
      setLoading(false);
    }
  };

  const remaining = calculateRemaining();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {schedule ? "Edit Jadwal Pembayaran" : "Tambah Jadwal Pembayaran"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="dueDate">Tanggal Jatuh Tempo *</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="amount">Jumlah Pembayaran *</Label>
            <Input
              id="amount"
              type="text"
              value={amount ? formatRupiah(amount) : ""}
              onChange={(e) => handleAmountChange(e.target.value)}
              onBlur={handleAmountBlur}
              placeholder="Rp 0"
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Sisa yang bisa dijadwalkan: {formatRupiah(remaining)}
            </p>
          </div>

          <div>
            <Label htmlFor="note">Catatan (Opsional)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

