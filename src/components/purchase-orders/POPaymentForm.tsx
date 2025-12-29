"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { validateNumberInput, formatRupiah, parseRupiah } from "@/lib/utils";
import { CreditCard } from "lucide-react";

interface PaymentSchedule {
  id: string;
  dueDate: Date | string;
  amount: number;
  totalPaid?: number;
  remaining?: number;
  status?: "paid" | "partial" | "unpaid";
}

interface POPaymentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  purchaseOrderId: string;
  schedules?: PaymentSchedule[];
  editingPayment?: Payment | null;
}

interface Payment {
  id: string;
  amount: number;
  paymentDate: Date | string;
  paymentMethod: string;
  note?: string | null;
  scheduleId?: string | null;
  allocations?: Array<{
    id: string;
    amount: number;
    scheduleId: string;
    schedule: {
      id: string;
      dueDate: Date | string;
      amount: number;
    };
  }>;
}

export default function POPaymentForm({
  isOpen,
  onClose,
  onSuccess,
  purchaseOrderId,
  schedules = [],
  editingPayment = null,
}: POPaymentFormProps) {
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [note, setNote] = useState("");
  const [allocationMode, setAllocationMode] = useState<"schedule" | "manual" | "none">(
    "none"
  );
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>("");
  const [manualAllocations, setManualAllocations] = useState<
    Record<string, string>
  >({});
  const [selectedScheduleIds, setSelectedScheduleIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payFull, setPayFull] = useState(false);
  const [remainingDebt, setRemainingDebt] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      if (editingPayment) {
        // Edit mode: populate form with existing payment data
        setAmount(editingPayment.amount.toString());
        setPaymentDate(
          new Date(editingPayment.paymentDate).toISOString().split("T")[0]
        );
        setPaymentMethod(editingPayment.paymentMethod);
        setNote(editingPayment.note || "");
        
        // Set allocation mode based on existing allocations
        if (editingPayment.allocations && editingPayment.allocations.length > 0) {
          if (editingPayment.allocations.length === 1) {
            // Single allocation - use schedule mode
            setAllocationMode("schedule");
            setSelectedScheduleId(editingPayment.allocations[0].scheduleId);
            setManualAllocations({
              [editingPayment.allocations[0].scheduleId]: editingPayment.allocations[0].amount.toString(),
            });
          } else {
            // Multiple allocations - use manual mode
            setAllocationMode("manual");
            const allocations: Record<string, string> = {};
            const scheduleIds: string[] = [];
            editingPayment.allocations.forEach((alloc) => {
              allocations[alloc.scheduleId] = alloc.amount.toString();
              scheduleIds.push(alloc.scheduleId);
            });
            setManualAllocations(allocations);
            setSelectedScheduleIds(scheduleIds);
          }
        } else if (editingPayment.scheduleId) {
          // Has schedule but no allocations (direct schedule payment)
          setAllocationMode("schedule");
          setSelectedScheduleId(editingPayment.scheduleId);
        } else {
          // No allocation
          setAllocationMode("none");
        }
        
        setPayFull(false);
      } else {
        // Create mode: reset form
        setAmount("");
        setPaymentDate(new Date().toISOString().split("T")[0]);
        setPaymentMethod("cash");
        setNote("");
        // Default to "none" if no schedules, otherwise "schedule"
        setAllocationMode(schedules.length > 0 ? "schedule" : "none");
        setSelectedScheduleId("");
        setManualAllocations({});
        setSelectedScheduleIds([]);
        setPayFull(false);
      }
      setError("");
      fetchRemainingDebt();
    }
  }, [isOpen, schedules, purchaseOrderId, editingPayment]);

  const fetchRemainingDebt = async () => {
    try {
      const response = await fetch(
        `/api/purchase-orders/${purchaseOrderId}/payment-summary`
      );
      const data = await response.json();
      if (response.ok && data.summary) {
        const debt = data.summary.remainingDebt || 0;
        setRemainingDebt(debt);
        return debt;
      }
    } catch (err) {
      console.error("Error fetching remaining debt:", err);
    }
    return 0;
  };

  useEffect(() => {
    if (payFull && remainingDebt > 0) {
      setAmount(remainingDebt.toString());
    } else if (payFull && remainingDebt === 0) {
      setAmount("0");
    }
  }, [payFull, remainingDebt]);

  useEffect(() => {
    if (allocationMode === "schedule" && schedules.length > 0 && !selectedScheduleId) {
      // Auto-select first unpaid schedule
      const unpaidSchedule = schedules.find(
        (s) => s.status === "unpaid" || s.status === "partial"
      );
      if (unpaidSchedule) {
        setSelectedScheduleId(unpaidSchedule.id);
        const remainingAmount = unpaidSchedule.remaining || unpaidSchedule.amount;
        setAmount(remainingAmount.toString());
      }
    }
  }, [allocationMode, schedules, selectedScheduleId]);

  const handleAmountChange = (value: string) => {
    // Remove any formatting characters but keep the number
    const rawValue = value.replace(/[^\d.,]/g, "").replace(/,/g, ".");
    
    // Allow empty
    if (rawValue === "") {
      setAmount("");
      return;
    }
    
    // Allow typing decimal point and numbers
    if (/^\d*\.?\d*$/.test(rawValue)) {
      setAmount(rawValue);
    }
  };

  const handleAmountBlur = () => {
    // Normalize the value (remove trailing decimal point, etc.)
    if (amount && amount !== "") {
      const numValue = parseFloat(amount);
      if (!isNaN(numValue) && numValue >= 0) {
        // Keep the numeric value as string
        setAmount(numValue.toString());
      } else if (amount.endsWith(".")) {
        // If user typed something like "100.", keep it for now
        // User might be typing a decimal
        return;
      } else {
        // Invalid value, clear it
        setAmount("");
      }
    }
  };

  const handleManualAllocationChange = (scheduleId: string, value: string) => {
    const rawValue = value.replace(/Rp|\./g, "").replace(/,/g, ".");
    const validated = validateNumberInput(rawValue, {
      min: 0,
      allowDecimal: true,
      allowNegative: false,
    });
    if (validated !== null || rawValue === "" || rawValue === ".") {
      setManualAllocations((prev) => ({
        ...prev,
        [scheduleId]: rawValue,
      }));
    }
  };

  const handleManualAllocationBlur = (scheduleId: string) => {
    const value = manualAllocations[scheduleId];
    const numValue = parseRupiah(value);
    if (numValue !== null) {
      setManualAllocations((prev) => ({
        ...prev,
        [scheduleId]: numValue.toString(),
      }));
    } else if (value !== "") {
      setManualAllocations((prev) => ({
        ...prev,
        [scheduleId]: "0",
      }));
    }
  };

  const toggleScheduleSelection = (scheduleId: string) => {
    setSelectedScheduleIds((prev) => {
      if (prev.includes(scheduleId)) {
        const newSelected = prev.filter((id) => id !== scheduleId);
        setManualAllocations((prevAlloc) => {
          const newAlloc = { ...prevAlloc };
          delete newAlloc[scheduleId];
          return newAlloc;
        });
        return newSelected;
      } else {
        const schedule = schedules.find((s) => s.id === scheduleId);
        if (schedule) {
          setManualAllocations((prevAlloc) => ({
            ...prevAlloc,
            [scheduleId]: (schedule.remaining || schedule.amount).toString(),
          }));
        }
        return [...prev, scheduleId];
      }
    });
  };

  const calculateTotalAllocation = () => {
    return Object.values(manualAllocations).reduce((sum, val) => {
      const num = parseFloat(val) || 0;
      return sum + num;
    }, 0);
  };

  const handleSubmit = async () => {
    setError("");
    const amountNum = parseFloat(amount) || 0;

    if (amountNum <= 0) {
      setError("Jumlah pembayaran harus lebih dari 0");
      return;
    }

    if (allocationMode === "schedule" && !selectedScheduleId && unpaidSchedules.length > 0) {
      setError("Pilih jadwal pembayaran terlebih dahulu");
      return;
    }

    if (allocationMode === "manual") {
      const totalAllocation = calculateTotalAllocation();
      if (Math.abs(totalAllocation - amountNum) > 0.01) {
        setError(
          `Total alokasi (${formatRupiah(totalAllocation)}) harus sama dengan jumlah pembayaran (${formatRupiah(amountNum)})`
        );
        return;
      }

      if (selectedScheduleIds.length === 0) {
        setError("Pilih minimal satu jadwal untuk alokasi manual");
        return;
      }
    }

    setLoading(true);

    try {
      const payload: any = {
        amount: amountNum,
        paymentDate,
        paymentMethod,
        note: note || undefined,
      };

      if (allocationMode === "schedule" && selectedScheduleId) {
        payload.scheduleId = selectedScheduleId;
        payload.allocationMode = "schedule";
      } else if (allocationMode === "manual") {
        payload.allocationMode = "manual";
        payload.allocations = selectedScheduleIds.map((sid) => ({
          scheduleId: sid,
          amount: parseFloat(manualAllocations[sid] || "0"),
        }));
      } else {
        // No allocation - direct payment without schedule
        payload.allocationMode = "none";
      }

      const url = editingPayment
        ? `/api/purchase-orders/${purchaseOrderId}/payments/${editingPayment.id}`
        : `/api/purchase-orders/${purchaseOrderId}/payments`;
      
      const method = editingPayment ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        // Reset form
        setAmount("");
        setPaymentDate(new Date().toISOString().split("T")[0]);
        setPaymentMethod("cash");
        setNote("");
        setSelectedScheduleId("");
        setManualAllocations({});
        setSelectedScheduleIds([]);
        setError("");
        setPayFull(false);
        // Refresh remaining debt
        fetchRemainingDebt();
        
        // Call success callback and close modal
        onSuccess();
        onClose();
      } else {
        setError(data.error || (editingPayment ? "Gagal mengupdate pembayaran" : "Gagal mencatat pembayaran"));
      }
    } catch (err: any) {
      console.error("Error submitting payment:", err);
      setError("Terjadi kesalahan saat mencatat pembayaran");
    } finally {
      setLoading(false);
    }
  };

  const unpaidSchedules = schedules.filter(
    (s) => s.status === "unpaid" || s.status === "partial"
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingPayment ? "Edit Pembayaran" : "Catat Pembayaran"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="paymentDate">Tanggal Pembayaran *</Label>
            <Input
              id="paymentDate"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="amount">Jumlah Pembayaran *</Label>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="payFull"
                  checked={payFull}
                  onCheckedChange={async (checked) => {
                    const isChecked = checked === true;
                    setPayFull(isChecked);
                    if (isChecked) {
                      // Fetch latest remaining debt and set amount immediately
                      const debt = await fetchRemainingDebt();
                      if (debt > 0) {
                        setAmount(debt.toString());
                      } else {
                        setAmount("0");
                      }
                    }
                  }}
                />
                <Label
                  htmlFor="payFull"
                  className="text-sm font-normal cursor-pointer"
                >
                  Bayar Penuh
                </Label>
              </div>
            </div>
            <Input
              id="amount"
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => {
                handleAmountChange(e.target.value);
                if (payFull) {
                  setPayFull(false);
                }
              }}
              onBlur={handleAmountBlur}
              placeholder="0"
              className="mt-1"
              disabled={payFull}
            />
            {amount && parseFloat(amount) > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {formatRupiah(parseFloat(amount))}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Sisa hutang: {formatRupiah(remainingDebt)}
            </p>
          </div>

          <div>
            <Label htmlFor="paymentMethod">Metode Pembayaran *</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Tunai</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="other">Lainnya</SelectItem>
              </SelectContent>
            </Select>
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

          {schedules.length > 0 && (
            <div>
              <Label>Mode Alokasi</Label>
              <Select
                value={allocationMode}
                onValueChange={(value: "schedule" | "manual" | "none") =>
                  setAllocationMode(value)
                }
                className="mt-1"
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tanpa Alokasi (Pembayaran Langsung)</SelectItem>
                  <SelectItem value="schedule">Sesuai Jadwal</SelectItem>
                  <SelectItem value="manual">Alokasi Manual</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {allocationMode === "none"
                  ? "Pembayaran akan dicatat tanpa mengalokasikan ke jadwal tertentu"
                  : allocationMode === "schedule"
                  ? "Pembayaran akan dialokasikan ke jadwal yang dipilih"
                  : "Pembayaran akan dialokasikan secara manual ke beberapa jadwal"}
              </p>
            </div>
          )}

          {allocationMode === "schedule" && unpaidSchedules.length > 0 && (
            <div>
              <Label htmlFor="schedule">Jadwal Pembayaran *</Label>
              <Select
                value={selectedScheduleId}
                onValueChange={(value) => {
                  setSelectedScheduleId(value);
                  const schedule = schedules.find((s) => s.id === value);
                  if (schedule) {
                    const remainingAmount = schedule.remaining || schedule.amount;
                    setAmount(remainingAmount.toString());
                  }
                }}
                className="mt-1"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jadwal..." />
                </SelectTrigger>
                <SelectContent>
                  {unpaidSchedules.map((schedule) => (
                    <SelectItem key={schedule.id} value={schedule.id}>
                      {new Date(schedule.dueDate).toLocaleDateString("id-ID")} -{" "}
                      {formatRupiah(schedule.remaining || schedule.amount)} (Sisa:{" "}
                      {formatRupiah(schedule.remaining || schedule.amount)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {allocationMode === "manual" && unpaidSchedules.length > 0 && (
            <div>
              <Label>Alokasi Manual ke Jadwal</Label>
              <div className="mt-2 space-y-2 border rounded p-3 max-h-60 overflow-y-auto">
                {unpaidSchedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded"
                  >
                    <Checkbox
                      checked={selectedScheduleIds.includes(schedule.id)}
                      onCheckedChange={() => toggleScheduleSelection(schedule.id)}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {new Date(schedule.dueDate).toLocaleDateString("id-ID")}
                      </div>
                      <div className="text-xs text-gray-500">
                        Sisa: {formatRupiah(schedule.remaining || schedule.amount)}
                      </div>
                    </div>
                    {selectedScheduleIds.includes(schedule.id) && (
                      <div className="w-32">
                        <Input
                          type="text"
                          value={
                            manualAllocations[schedule.id]
                              ? formatRupiah(manualAllocations[schedule.id])
                              : ""
                          }
                          onChange={(e) =>
                            handleManualAllocationChange(schedule.id, e.target.value)
                          }
                          onBlur={() => handleManualAllocationBlur(schedule.id)}
                          placeholder="Rp 0"
                          className="text-sm"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Total Alokasi: {formatRupiah(calculateTotalAllocation())}
              </p>
            </div>
          )}

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
              <CreditCard className="h-4 w-4 mr-2" />
              {loading ? "Mencatat..." : "Catat Pembayaran"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

