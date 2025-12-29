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
import { AutocompleteSelect } from "@/components/ui/autocomplete-select";
import { Checkbox } from "@/components/ui/checkbox";
import { validateNumberInput, formatNumberForInput, formatRupiah, parseRupiah } from "@/lib/utils";
import { CreditCard, DollarSign } from "lucide-react";

interface PaymentFormProps {
  initialMode?: "transaction" | "customer"; // Pre-set mode
  initialTransactionId?: string; // Pre-set transaction ID
  initialCustomerId?: string; // Pre-set customer
  initialTransaction?: Transaction; // Pre-set transaction object (preferred)
  mode?: "transaction" | "customer"; // Backward compatibility
  transactionId?: string; // Backward compatibility
  transaction?: Transaction; // Backward compatibility - transaction object
  customerId?: string; // Backward compatibility
  onSuccess?: (payment: any) => void;
  onCancel?: () => void;
}

interface Transaction {
  id: string;
  invoiceNo: string;
  total: number;
  credit: number;
  remainingCredit?: number; // Optional, will be calculated if not provided
  paymentStatus: string;
  createdAt: Date | string;
  allocations?: Array<{ amount: number }>;
  project?: {
    id: string;
    name: string;
  } | null;
}

export default function PaymentForm({
  initialMode: propInitialMode,
  initialTransactionId: propInitialTransactionId,
  initialCustomerId: propInitialCustomerId,
  initialTransaction: propInitialTransaction,
  mode: propMode,
  transactionId: propTransactionId,
  transaction: propTransaction,
  customerId: propCustomerId,
  onSuccess,
  onCancel,
}: PaymentFormProps) {
  // Support both new and old prop names for backward compatibility
  const initialMode = propInitialMode || propMode;
  const initialTransactionId = propInitialTransactionId || propTransactionId;
  const initialCustomerId = propInitialCustomerId || propCustomerId;
  const initialTransaction = propInitialTransaction || propTransaction;
  // Default to "customer" mode if no initial mode or transaction is provided
  const [mode, setMode] = useState<"transaction" | "customer">(
    initialMode || (initialTransactionId || initialTransaction ? "transaction" : "customer")
  );
  const [selectedTransactionId, setSelectedTransactionId] = useState<
    string | undefined
  >(initialTransactionId || initialTransaction?.id);
  const [selectedCustomerId, setSelectedCustomerId] = useState<
    string | undefined
  >(initialCustomerId);
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [note, setNote] = useState("");
  const [allocationMode, setAllocationMode] = useState<"fifo" | "manual">(
    "fifo"
  );
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [transactions, setTransactions] = useState<Transaction[]>(
    initialTransaction ? [initialTransaction] : []
  );
  const [unpaidTransactions, setUnpaidTransactions] = useState<Transaction[]>(
    []
  );
  const [manualAllocations, setManualAllocations] = useState<
    Record<string, string>
  >({});
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<
    string[]
  >([]);
  const [payFull, setPayFull] = useState(false);

  // Fetch customers
  useEffect(() => {
    fetchCustomers();
  }, []);

  // Fetch transactions for selected customer
  useEffect(() => {
    if (selectedCustomerId && mode === "customer") {
      fetchCustomerPayments();
    }
  }, [selectedCustomerId, mode]);

  // Auto-fetch transaction if initialTransactionId is provided
  useEffect(() => {
    if (initialTransactionId && mode === "transaction") {
      if (selectedTransactionId !== initialTransactionId) {
        setSelectedTransactionId(initialTransactionId);
      }
    }
  }, [initialTransactionId, mode, selectedTransactionId]);

  // Fetch transaction details when selectedTransactionId changes
  // Skip fetch if initialTransaction is already provided
  useEffect(() => {
    if (selectedTransactionId && mode === "transaction" && !initialTransaction) {
      fetchTransactionDetails(false);
    }
  }, [selectedTransactionId, mode, initialTransaction]);

  // Auto-fill amount when payFull is checked or when transactions data is loaded
  useEffect(() => {
    if (payFull) {
      if (mode === "transaction" && transactions.length > 0) {
        const transaction = transactions[0];
        // Calculate remaining credit if not already calculated
        const totalPaid = transaction.allocations?.reduce(
          (sum, alloc) => sum + (alloc.amount || 0),
          0
        ) || 0;
        const remainingCredit = transaction.remainingCredit ?? 
          Math.max(0, transaction.credit - totalPaid);
        // Always set amount when payFull is checked, even if remainingCredit is 0
        setAmount(remainingCredit.toString());
      } else if (mode === "customer" && unpaidTransactions.length > 0) {
        const totalDebt = unpaidTransactions.reduce(
          (sum, t) => sum + t.remainingCredit,
          0
        );
        // Always set amount when payFull is checked
        setAmount(totalDebt.toString());
      }
    }
    // Note: We don't clear amount when unchecking, let user keep their input
  }, [payFull, transactions, unpaidTransactions, mode]);

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/customers");
      const data = await response.json();
      if (response.ok) {
        setCustomers(data.customers || []);
      }
    } catch (err) {
      console.error("Error fetching customers:", err);
    }
  };

  const fetchCustomerPayments = async () => {
    try {
      const response = await fetch(`/api/customers/${selectedCustomerId}/payments`);
      const data = await response.json();
      if (response.ok) {
        setUnpaidTransactions(data.unpaidTransactions || []);
      }
    } catch (err) {
      console.error("Error fetching customer payments:", err);
    }
  };

  const fetchTransactionDetails = async (shouldFillAmount = false) => {
    if (!selectedTransactionId) return null;
    try {
      const response = await fetch(`/api/transactions/${selectedTransactionId}`);
      const data = await response.json();
      if (response.ok && data.transaction) {
        // Calculate remaining credit
        const totalPaid =
          data.transaction.allocations?.reduce(
            (sum: number, alloc: any) => sum + (alloc.amount || 0),
            0
          ) || 0;
        const remainingCredit = Math.max(0, data.transaction.credit - totalPaid);
        const transactionData = {
          ...data.transaction,
          remainingCredit,
        };
        setTransactions([transactionData]);
        // Auto-fill amount if payFull is checked or shouldFillAmount is true
        if (payFull || shouldFillAmount) {
          // Always set amount when payFull or shouldFillAmount is true
          setAmount(remainingCredit.toString());
        } else if (amount === "") {
          // Only auto-fill if amount is empty and payFull is not checked
          setAmount(remainingCredit.toString());
        }
        return transactionData;
      }
    } catch (err) {
      console.error("Error fetching transaction:", err);
    }
    return null;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleAmountChange = (value: string) => {
    // Remove Rupiah formatting to get raw number
    const rawValue = value.replace(/Rp\s?/gi, "").replace(/\./g, "").replace(/,/g, ".").trim();
    
    // Allow empty or just "Rp"
    if (rawValue === "" || rawValue === "Rp") {
      setAmount("");
      return;
    }
    
    // Validate the numeric value
    const validated = validateNumberInput(rawValue, {
      min: 0,
      allowDecimal: true,
      allowNegative: false,
    });
    
    if (validated !== null || rawValue === "." || rawValue === "0.") {
      // Store the raw numeric value (as string for decimal support)
      setAmount(rawValue);
    }
  };

  const handleAmountBlur = () => {
    // Format as Rupiah when user leaves the field
    if (amount && amount !== "") {
      const numValue = parseFloat(amount);
      if (!isNaN(numValue)) {
        // Keep the numeric value, formatting will be done in display
        setAmount(numValue.toString());
      }
    }
  };

  const handleManualAllocationChange = (transactionId: string, value: string) => {
    const validated = validateNumberInput(value, {
      min: 0,
      allowDecimal: true,
      allowNegative: false,
    });
    if (validated !== null || value === "" || value === ".") {
      setManualAllocations((prev) => ({
        ...prev,
        [transactionId]: value,
      }));
    }
  };

  const toggleTransactionSelection = (transactionId: string) => {
    setSelectedTransactionIds((prev) => {
      if (prev.includes(transactionId)) {
        const newSelected = prev.filter((id) => id !== transactionId);
        const newAllocations = { ...manualAllocations };
        delete newAllocations[transactionId];
        setManualAllocations(newAllocations);
        return newSelected;
      } else {
        return [...prev, transactionId];
      }
    });
  };

  const calculateTotalAllocation = () => {
    return Object.values(manualAllocations).reduce((sum, val) => {
      const num = parseFloat(val) || 0;
      return sum + num;
    }, 0);
  };

  const getMaxAmount = () => {
    if (mode === "transaction" && transactions.length > 0) {
      const transaction = transactions[0];
      const totalPaid = transaction.allocations?.reduce(
        (sum, alloc) => sum + (alloc.amount || 0),
        0
      ) || 0;
      return transaction.remainingCredit ?? Math.max(0, transaction.credit - totalPaid);
    } else if (mode === "customer") {
      return unpaidTransactions.reduce(
        (sum, t) => {
          const totalPaid = t.allocations?.reduce(
            (s, alloc) => s + (alloc.amount || 0),
            0
          ) || 0;
          const remaining = t.remainingCredit ?? Math.max(0, t.credit - totalPaid);
          return sum + remaining;
        },
        0
      );
    }
    return 0;
  };

  const handleSubmit = async () => {
    const amountNum = parseFloat(amount) || 0;
    const maxAmount = getMaxAmount();

    if (amountNum <= 0) {
      alert("Jumlah pembayaran harus lebih dari 0");
      return;
    }

    if (amountNum > maxAmount) {
      alert(
        `Jumlah pembayaran melebihi sisa hutang. Maksimal: ${formatCurrency(maxAmount)}`
      );
      return;
    }

    if (mode === "transaction" && !selectedTransactionId) {
      alert("Pilih transaksi terlebih dahulu");
      return;
    }

    if (mode === "customer" && !selectedCustomerId) {
      alert("Pilih pelanggan terlebih dahulu");
      return;
    }

    if (mode === "customer" && allocationMode === "manual") {
      const totalAllocation = calculateTotalAllocation();
      if (Math.abs(totalAllocation - amountNum) > 0.01) {
        alert(
          `Total alokasi (${formatCurrency(totalAllocation)}) harus sama dengan jumlah pembayaran (${formatCurrency(amountNum)})`
        );
        return;
      }

      if (selectedTransactionIds.length === 0) {
        alert("Pilih minimal satu transaksi untuk alokasi manual");
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

      if (mode === "transaction") {
        payload.transactionId = selectedTransactionId;
      } else {
        payload.customerId = selectedCustomerId;
        payload.allocationMode = allocationMode;

        if (allocationMode === "manual") {
          payload.allocations = selectedTransactionIds.map((tid) => ({
            transactionId: tid,
            amount: parseFloat(manualAllocations[tid] || "0"),
          }));
        }
      }

      const response = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        if (onSuccess) {
          onSuccess(data.payment);
        } else {
          alert("Pembayaran berhasil dicatat");
          // Reset form
          setAmount("");
          setNote("");
          if (!initialMode && !initialTransactionId && !initialTransaction) {
            setMode("customer");
            setSelectedTransactionId(undefined);
            setSelectedCustomerId(undefined);
          }
        }
      } else {
        alert(data.error || "Gagal mencatat pembayaran");
      }
    } catch (error: any) {
      console.error("Error submitting payment:", error);
      alert("Terjadi kesalahan saat mencatat pembayaran");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hide mode selector if mode is pre-set via props */}
      {!initialMode && !initialTransactionId && !initialTransaction && !initialCustomerId && (
        <div>
          <Label>Mode Pembayaran</Label>
          <Select
            value={mode}
            onValueChange={(value: "transaction" | "customer") => {
              setMode(value);
              if (value === "transaction") {
                setSelectedCustomerId(undefined);
              } else {
                setSelectedTransactionId(undefined);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="transaction">Per Transaksi</SelectItem>
              <SelectItem value="customer">Per Pelanggan</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {mode === "transaction" ? (
        <>
          {!initialTransactionId && (
            <div>
              <Label htmlFor="transaction">Transaksi</Label>
              <AutocompleteSelect
                options={transactions.map((t) => ({
                  id: t.id,
                  name: `${t.invoiceNo} - ${formatCurrency(t.remainingCredit)}`,
                }))}
                value={selectedTransactionId}
                onValueChange={setSelectedTransactionId}
                placeholder="Pilih transaksi..."
                searchPlaceholder="Cari transaksi..."
              />
            </div>
          )}
          {selectedTransactionId && transactions.length > 0 && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">
                Invoice: <span className="font-semibold">{transactions[0].invoiceNo}</span>
              </p>
              <p className="text-sm text-gray-600">
                Sisa Hutang:{" "}
                <span className="font-semibold text-red-600">
                  {formatCurrency(transactions[0].remainingCredit)}
                </span>
              </p>
            </div>
          )}
        </>
      ) : (
        <>
          <div>
            <Label htmlFor="customer">Pelanggan</Label>
            <AutocompleteSelect
              options={customers.map((c) => ({ id: c.id, name: c.name }))}
              value={selectedCustomerId}
              onValueChange={setSelectedCustomerId}
              placeholder="Pilih pelanggan..."
              searchPlaceholder="Cari pelanggan..."
              disabled={!!initialCustomerId}
            />
          </div>

          {selectedCustomerId && unpaidTransactions.length > 0 && (
            <>
              <div>
                <Label>Total Sisa Hutang</Label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-lg font-semibold text-red-600">
                    {formatCurrency(
                      unpaidTransactions.reduce(
                        (sum, t) => sum + t.remainingCredit,
                        0
                      )
                    )}
                  </p>
                </div>
              </div>

              <div>
                <Label>Mode Alokasi</Label>
                <Select
                  value={allocationMode}
                  onValueChange={(value: "fifo" | "manual") =>
                    setAllocationMode(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fifo">Otomatis FIFO (Tertua Dulu)</SelectItem>
                    <SelectItem value="manual">Manual Pilih Transaksi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {allocationMode === "manual" && (
                <div className="space-y-3">
                  <Label>Pilih Transaksi dan Tentukan Alokasi</Label>
                  <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
                    {unpaidTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-start gap-3 p-3 border-b last:border-b-0"
                      >
                        <Checkbox
                          checked={selectedTransactionIds.includes(transaction.id)}
                          onCheckedChange={() =>
                            toggleTransactionSelection(transaction.id)
                          }
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{transaction.invoiceNo}</p>
                              <p className="text-sm text-gray-500">
                                {new Date(transaction.createdAt).toLocaleDateString(
                                  "id-ID"
                                )}
                              </p>
                              {transaction.project && (
                                <p className="text-xs text-gray-400">
                                  {transaction.project.name}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-600">
                                Sisa:{" "}
                                <span className="font-semibold text-red-600">
                                  {formatCurrency(transaction.remainingCredit)}
                                </span>
                              </p>
                            </div>
                          </div>
                          {selectedTransactionIds.includes(transaction.id) && (
                            <div className="mt-2">
                              <Label className="text-xs">Jumlah Alokasi</Label>
                              <Input
                                type="text"
                                value={
                                  manualAllocations[transaction.id] || ""
                                }
                                onChange={(e) =>
                                  handleManualAllocationChange(
                                    transaction.id,
                                    e.target.value
                                  )
                                }
                                placeholder="0"
                                className="mt-1"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {allocationMode === "manual" && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        Total Alokasi:{" "}
                        <span className="font-semibold">
                          {formatCurrency(calculateTotalAllocation())}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

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
                // Immediately fill amount when checked
                if (isChecked) {
                  if (mode === "transaction") {
                    // If transaction data not loaded yet, fetch it first
                    if (transactions.length === 0 && selectedTransactionId) {
                      // Pass shouldFillAmount=true to ensure amount is filled
                      const transactionData = await fetchTransactionDetails(true);
                      // fetchTransactionDetails should have set amount, but ensure it
                      if (transactionData) {
                        setAmount(transactionData.remainingCredit.toString());
                      } else {
                        // If fetch failed, try to fetch again after a short delay
                        setTimeout(async () => {
                          const retryData = await fetchTransactionDetails(true);
                          if (retryData) {
                            setAmount(retryData.remainingCredit.toString());
                          }
                        }, 500);
                      }
                    } else if (transactions.length > 0) {
                      // Data already loaded, calculate remaining credit
                      const transaction = transactions[0];
                      const totalPaid = transaction.allocations?.reduce(
                        (sum, alloc) => sum + (alloc.amount || 0),
                        0
                      ) || 0;
                      const remainingCredit = transaction.remainingCredit ?? 
                        Math.max(0, transaction.credit - totalPaid);
                      setAmount(remainingCredit.toString());
                    }
                  } else if (mode === "customer" && unpaidTransactions.length > 0) {
                    const totalDebt = unpaidTransactions.reduce(
                      (sum, t) => {
                        const totalPaid = t.allocations?.reduce(
                          (s, alloc) => s + (alloc.amount || 0),
                          0
                        ) || 0;
                        const remaining = t.remainingCredit ?? Math.max(0, t.credit - totalPaid);
                        return sum + remaining;
                      },
                      0
                    );
                    setAmount(totalDebt.toString());
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
          value={amount ? formatRupiah(amount) : ""}
          onChange={(e) => {
            handleAmountChange(e.target.value);
            // Uncheck payFull if user manually changes amount
            if (payFull) {
              setPayFull(false);
            }
          }}
          onBlur={handleAmountBlur}
          placeholder="Rp 0"
          className="mt-1"
          disabled={payFull}
        />
        <p className="text-xs text-gray-500 mt-1">
          Maksimal: {formatCurrency(getMaxAmount())}
        </p>
      </div>

      <div>
        <Label htmlFor="paymentDate">Tanggal Pembayaran</Label>
        <Input
          id="paymentDate"
          type="date"
          value={paymentDate}
          onChange={(e) => setPaymentDate(e.target.value)}
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="paymentMethod">Metode Pembayaran *</Label>
        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
          <SelectTrigger>
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
          placeholder="Catatan pembayaran..."
          rows={3}
          className="mt-1"
        />
      </div>

      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Batal
          </Button>
        )}
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? "Menyimpan..." : "Simpan Pembayaran"}
        </Button>
      </div>
    </div>
  );
}

