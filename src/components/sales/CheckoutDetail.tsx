"use client";

import { useState } from "react";
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

interface CheckoutDetailProps {
  cart: CartItem[];
  projectName: string;
  total: number;
  onBack: () => void;
  onSuccess: (transaction: any) => void;
}

export default function CheckoutDetail({
  cart,
  projectName,
  total,
  onBack,
  onSuccess,
}: CheckoutDetailProps) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [cash, setCash] = useState("");
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

  const getChange = () => {
    const cashAmount = parseFloat(cash) || 0;
    return cashAmount - total;
  };

  const handleCheckout = async () => {
    const cashAmount = parseFloat(cash) || 0;

    if (cashAmount < total) {
      alert("Jumlah pembayaran kurang");
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
            quantity: item.quantity,
            status: itemStatuses[item.product.id] || undefined,
          })),
          cash: cashAmount,
          projectName: projectName || undefined,
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
              {cart.map((item) => (
                <div key={item.product.id} className="border-b pb-3 last:border-b-0">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <p className="font-medium">{item.product.name}</p>
                      <p className="text-sm text-gray-500">
                        {item.quantity} x {formatCurrency(item.product.sellingPrice)} = {formatCurrency(item.subtotal)}
                      </p>
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
              ))}
            </div>
          </div>

          {/* Payment */}
          <div className="border-t pt-4">
            <div className="flex justify-between text-lg font-bold mb-4">
              <span>Total:</span>
              <span>{formatCurrency(total)}</span>
            </div>

            <div className="mb-4">
              <Label htmlFor="cash">Jumlah Bayar *</Label>
              <CurrencyInput
                id="cash"
                value={cash || "0"}
                onChange={(value) => setCash(value)}
                placeholder="Rp 0"
                className="mt-1"
              />
            </div>

            {cash && parseFloat(cash || "0") > 0 && (
              <div className="flex justify-between mb-4">
                <span>Kembalian:</span>
                <span
                  className={
                    getChange() < 0
                      ? "text-red-600"
                      : "text-green-600 font-semibold"
                  }
                >
                  {formatCurrency(getChange())}
                </span>
              </div>
            )}

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
                disabled={loading || getChange() < 0 || !cash || parseFloat(cash) === 0}
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

