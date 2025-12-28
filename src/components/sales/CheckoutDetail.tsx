"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CurrencyInput } from "@/components/ui/currency-input";
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
import { CartItem } from "@/types";
import { convertFromBaseUnit } from "@/lib/product-units";

interface CheckoutDetailProps {
  cart: CartItem[];
  customerId?: string;
  projectId?: string;
  projectName: string;
  total: number;
  onBack: () => void;
  onSuccess: (transaction: any) => void;
}

export default function CheckoutDetail({
  cart,
  customerId,
  projectId,
  projectName,
  total,
  onBack,
  onSuccess,
}: CheckoutDetailProps) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [cash, setCash] = useState("");
  const [credit, setCredit] = useState("");
  const [paymentType, setPaymentType] = useState<"paid" | "unpaid" | "partial">("paid");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [itemStatuses, setItemStatuses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const formatCurrency = (amount: number | string | any) => {
    let numAmount: number;
    if (typeof amount === "string") {
      numAmount = parseFloat(amount) || 0;
    } else if (amount && typeof amount === "object" && "toNumber" in amount) {
      numAmount = parseFloat(amount.toString()) || 0;
    } else {
      numAmount = Number(amount) || 0;
    }

    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numAmount);
  };

  // Auto-calculate credit and cash based on payment type
  useEffect(() => {
    const cashAmount = parseFloat(cash) || 0;
    if (paymentType === "paid") {
      setCredit("0");
      if (cashAmount < total) {
        setCash(total.toString());
      }
    } else if (paymentType === "unpaid") {
      setCash("0");
      setCredit(total.toString());
    } else if (paymentType === "partial") {
      const creditAmount = total - cashAmount;
      setCredit(creditAmount > 0 ? creditAmount.toString() : "0");
    }
  }, [paymentType, total, cash]);

  const getChange = () => {
    const cashAmount = parseFloat(cash) || 0;
    if (paymentType === "paid" && cashAmount >= total) {
      return cashAmount - total;
    }
    return 0;
  };

  const getCredit = () => {
    const cashAmount = parseFloat(cash) || 0;
    const creditAmount = parseFloat(credit) || 0;
    return creditAmount;
  };

  const handleCheckout = async () => {
    const cashAmount = parseFloat(cash) || 0;
    const creditAmount = parseFloat(credit) || 0;

    // Validate payment
    if (cashAmount + creditAmount !== total) {
      alert("Jumlah pembayaran (tunai + hutang) harus sama dengan total");
      return;
    }

    if (cashAmount < 0 || creditAmount < 0) {
      alert("Jumlah pembayaran tidak valid");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: cart.map((item) => ({
            productId: item.product.id,
            quantity: Number(item.quantity), // Ensure quantity is a number
            customPrice: item.customPrice !== undefined ? Number(item.customPrice) : undefined,
            sellingUnitId: item.sellingUnitId || undefined,
            priceBasedAmount: item.priceBasedAmount !== undefined ? Number(item.priceBasedAmount) : undefined,
            status: itemStatuses[item.product.id] || undefined,
          })),
          cash: cashAmount,
          credit: creditAmount,
          customerId: customerId || undefined,
          projectId: projectId || undefined,
          projectName: projectName || undefined,
          paymentStatus: paymentType,
          paymentMethod: paymentMethod || undefined,
          note: note || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Gagal melakukan transaksi");
        setLoading(false);
        return;
      }

      onSuccess(data.transaction);
      setLoading(false);
      router.refresh();
    } catch (err) {
      alert("Terjadi kesalahan");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Detail Checkout</h2>

        <div className="space-y-4">
          {/* Project Name Display */}
          {projectName && (
            <div>
              <Label>Nama Proyek</Label>
              <Input value={projectName} disabled className="mt-1" />
            </div>
          )}

          {/* Note Input */}
          <div>
            <Label htmlFor="note">Keterangan (Opsional)</Label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Masukkan keterangan transaksi"
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
            />
          </div>

          {/* Cart Items with Status */}
          <div>
            <Label className="mb-2 block">Item Transaksi</Label>
            <div className="space-y-3 border rounded-lg p-4">
              {cart.map((item) => {
                // Determine the correct price to display
                // If sellingUnit exists, use sellingUnit price, otherwise use product price
                let displayPrice = item.customPrice !== undefined 
                  ? item.customPrice 
                  : (item.sellingUnit 
                      ? Number(item.sellingUnit.sellingPrice) 
                      : Number(item.product.sellingPrice));
                const hasCustomPrice = item.customPrice !== undefined;
                
                // Determine display quantity and unit
                // item.quantity is always stored in base unit
                const baseQuantity = Number(item.quantity);
                let displayQuantity = baseQuantity;
                let displayUnit = item.product.baseUnit || item.product.unit;
                
                if (item.sellingUnit) {
                  // Convert from base unit to selling unit for display
                  displayQuantity = convertFromBaseUnit(baseQuantity, item.sellingUnit);
                  displayUnit = item.sellingUnit.unit;
                }
                
                // Format quantity with Indonesian locale (comma as decimal separator)
                // Ensure we show at least 1 decimal place if the value is less than 1
                const formattedQuantity = displayQuantity.toLocaleString('id-ID', {
                  minimumFractionDigits: displayQuantity < 1 && displayQuantity > 0 ? 1 : 0,
                  maximumFractionDigits: 3,
                  useGrouping: false
                });
                
                return (
                  <div key={item.product.id} className="border-b pb-3 last:border-b-0">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{item.product.name}</p>
                          {hasCustomPrice && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                              Harga Diubah
                            </span>
                          )}
                        </div>
                        <div className="mt-1">
                          {item.sellingUnit && (
                            <p className="text-xs text-indigo-600 font-medium mb-1">
                              {item.sellingUnit.name}
                              {item.priceBasedAmount && ` (Rp ${item.priceBasedAmount.toLocaleString('id-ID')})`}
                            </p>
                          )}
                          {hasCustomPrice ? (
                            <>
                              <p className="text-xs text-gray-400 line-through">
                                {formattedQuantity} {displayUnit} x {formatCurrency(item.sellingUnit ? Number(item.sellingUnit.sellingPrice) : Number(item.product.sellingPrice))}
                              </p>
                              <p className="text-sm text-blue-600 font-semibold">
                                {formattedQuantity} {displayUnit} x {formatCurrency(displayPrice)} = {formatCurrency(item.subtotal)}
                              </p>
                            </>
                          ) : (
                            <p className="text-sm text-gray-500">
                              {formattedQuantity} {displayUnit} x {formatCurrency(displayPrice)} = {formatCurrency(item.subtotal)}
                            </p>
                          )}
                        </div>
                      </div>
                    <div className="flex-shrink-0 w-32">
                      <Select
                        value={itemStatuses[item.product.id] || ""}
                        onValueChange={(value) => {
                          setItemStatuses({
                            ...itemStatuses,
                            [item.product.id]: value,
                          });
                        }}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="diambil">Diambil</SelectItem>
                          <SelectItem value="dikirim">Dikirim</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </div>

          {/* Payment */}
          <div className="border-t pt-4">
            <div className="flex justify-between text-lg font-bold mb-4">
              <span>Total:</span>
              <span>{formatCurrency(total)}</span>
            </div>

            {/* Payment Type Selection */}
            <div className="mb-4">
              <Label>Tipe Pembayaran *</Label>
              <Select
                value={paymentType}
                onValueChange={(value: "paid" | "unpaid" | "partial") => {
                  setPaymentType(value);
                  if (value === "paid") {
                    setCash(total.toString());
                    setCredit("0");
                  } else if (value === "unpaid") {
                    setCash("0");
                    setCredit(total.toString());
                  } else {
                    setCash("0");
                    setCredit(total.toString());
                  }
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Lunas</SelectItem>
                  <SelectItem value="unpaid">Hutang</SelectItem>
                  <SelectItem value="partial">Cicilan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Method */}
            <div className="mb-4">
              <Label>Metode Pembayaran</Label>
              <Select
                value={paymentMethod}
                onValueChange={setPaymentMethod}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Tunai</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="credit">Kredit</SelectItem>
                  <SelectItem value="mixed">Campuran</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Cash Input */}
            {paymentType !== "unpaid" && (
              <div className="mb-4">
                <Label htmlFor="cash">Jumlah Tunai *</Label>
                <CurrencyInput
                  id="cash"
                  value={cash || "0"}
                  onChange={(value) => {
                    setCash(value);
                    if (paymentType === "partial") {
                      const cashAmount = parseFloat(value) || 0;
                      const creditAmount = total - cashAmount;
                      setCredit(creditAmount > 0 ? creditAmount.toString() : "0");
                    }
                  }}
                  placeholder="Rp 0"
                  className="mt-1"
                />
              </div>
            )}

            {/* Credit Display/Input */}
            {paymentType !== "paid" && (
              <div className="mb-4">
                <Label htmlFor="credit">Jumlah Hutang</Label>
                <CurrencyInput
                  id="credit"
                  value={credit || "0"}
                  onChange={(value) => {
                    setCredit(value);
                    if (paymentType === "partial") {
                      const creditAmount = parseFloat(value) || 0;
                      const cashAmount = total - creditAmount;
                      setCash(cashAmount > 0 ? cashAmount.toString() : "0");
                    }
                  }}
                  placeholder="Rp 0"
                  className="mt-1"
                  disabled={paymentType === "unpaid"}
                />
              </div>
            )}

            {/* Payment Summary */}
            <div className="mb-4 space-y-2 p-3 bg-gray-50 rounded">
              <div className="flex justify-between text-sm">
                <span>Tunai:</span>
                <span>{formatCurrency(parseFloat(cash) || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Hutang:</span>
                <span>{formatCurrency(parseFloat(credit) || 0)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Total:</span>
                <span>{formatCurrency((parseFloat(cash) || 0) + (parseFloat(credit) || 0))}</span>
              </div>
              {paymentType === "paid" && getChange() > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Kembalian:</span>
                  <span>{formatCurrency(getChange())}</span>
                </div>
              )}
              {(parseFloat(cash) || 0) + (parseFloat(credit) || 0) !== total && (
                <div className="text-red-500 text-xs">
                  Jumlah pembayaran harus sama dengan total
                </div>
              )}
            </div>

            <div className="flex space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                className="flex-1"
              >
                Kembali
              </Button>
              <Button
                onClick={handleCheckout}
                disabled={
                  loading ||
                  (parseFloat(cash) || 0) + (parseFloat(credit) || 0) !== total
                }
                className="flex-1"
              >
                {loading ? "Memproses..." : "Checkout"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

