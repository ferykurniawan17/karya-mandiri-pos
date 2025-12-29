"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validateNumberInput, formatNumberForInput } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PurchaseOrder } from "@/types";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReceivePOProps {
  purchaseOrder: PurchaseOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ReceiveItem {
  itemId: string;
  productName: string;
  orderedQuantity: number;
  receivedQuantity: number;
  purchasePrice: string; // Harga beli per item
}

export default function ReceivePO({
  purchaseOrder,
  isOpen,
  onClose,
  onSuccess,
}: ReceivePOProps) {
  const [items, setItems] = useState<ReceiveItem[]>([]);
  const [paymentType, setPaymentType] = useState<"paid" | "installment">("paid");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (purchaseOrder && isOpen) {
      setItems(
        purchaseOrder.items.map((item) => {
          // If purchasePrice is 0 or not set, use product's purchasePrice as default
          const poPrice = Number(item.purchasePrice) || 0;
          const productPrice = item.product?.purchasePrice 
            ? Number(item.product.purchasePrice) 
            : 0;
          const finalPrice = poPrice > 0 ? poPrice : (productPrice > 0 ? productPrice : 0);
          
          return {
            itemId: item.id,
            productName: item.product.name,
            orderedQuantity: item.quantity,
            receivedQuantity: item.quantity, // Default to ordered quantity
            purchasePrice: finalPrice.toString(),
          };
        })
      );
      // Set payment type from PO if available, otherwise default to "paid"
      setPaymentType((purchaseOrder as any).paymentType || "paid");
    }
    setError("");
  }, [purchaseOrder, isOpen]);

  const updateReceivedQuantity = (itemId: string, quantity: number) => {
    setItems(
      items.map((item) =>
        item.itemId === itemId
          ? { ...item, receivedQuantity: quantity }
          : item
      )
    );
  };

  const updatePurchasePrice = (itemId: string, price: string) => {
    setItems(
      items.map((item) =>
        item.itemId === itemId
          ? { ...item, purchasePrice: price }
          : item
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate received quantities and purchase prices
    for (const item of items) {
      if (item.receivedQuantity < 0) {
        setError("Received quantity tidak boleh negatif");
        return;
      }
      if (item.receivedQuantity > item.orderedQuantity) {
        setError(
          `Received quantity untuk ${item.productName} tidak boleh melebihi ordered quantity`
        );
        return;
      }
      if (!item.purchasePrice || parseFloat(item.purchasePrice) <= 0) {
        setError(`Harga beli untuk ${item.productName} harus diisi dan lebih dari 0`);
        return;
      }
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/purchase-orders/${purchaseOrder.id}/receive`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            items: items.map((item) => {
              const poItem = purchaseOrder.items.find((i) => i.id === item.itemId);
              return {
                itemId: item.itemId,
                receivedQuantity: item.receivedQuantity,
                purchaseUnit: poItem?.purchaseUnit || poItem?.product?.purchaseUnit || null,
                purchasePrice: parseFloat(item.purchasePrice),
              };
            }),
            paymentType: paymentType,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Gagal menerima Purchase Order");
        setLoading(false);
        return;
      }

      setError("");
      setLoading(false);
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error receiving purchase order:", err);
      setError("Terjadi kesalahan");
      setLoading(false);
    }
  };

  if (!purchaseOrder) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Terima Purchase Order</DialogTitle>
          <DialogDescription>
            Konfirmasi jumlah barang yang diterima dan harga beli untuk PO {purchaseOrder.poNumber}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="paymentType">Status Pembayaran *</Label>
              <Select
                value={paymentType}
                onValueChange={(value: "paid" | "installment") =>
                  setPaymentType(value)
                }
                className="mt-1"
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Lunas</SelectItem>
                  <SelectItem value="installment">Bayar Bertahap / Cicilan</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {paymentType === "paid"
                  ? "Pembayaran dilakukan sekaligus saat terima barang"
                  : "Pembayaran dapat dilakukan secara bertahap sesuai jadwal"}
              </p>
            </div>

            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.itemId}
                  className="grid grid-cols-5 gap-4 items-end p-3 border rounded"
                >
                  <div className="col-span-2">
                    <Label className="text-sm font-medium">
                      {item.productName}
                    </Label>
                    <div className="text-xs text-gray-500">
                      Dipesan: {item.orderedQuantity}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Diterima *</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={formatNumberForInput(item.receivedQuantity)}
                      onChange={(e) => {
                        const value = e.target.value;
                        const numValue = validateNumberInput(value, { 
                          min: 0, 
                          max: item.orderedQuantity,
                          allowDecimal: false 
                        });
                        if (numValue !== null) {
                          updateReceivedQuantity(item.itemId, numValue);
                        } else if (value === "" || value === "0") {
                          updateReceivedQuantity(item.itemId, 0);
                        }
                      }}
                      onBlur={(e) => {
                        const numValue = validateNumberInput(e.target.value, { 
                          min: 0, 
                          max: item.orderedQuantity,
                          allowDecimal: false 
                        });
                        if (numValue === null || numValue < 0) {
                          updateReceivedQuantity(item.itemId, 0);
                        } else if (numValue > item.orderedQuantity) {
                          updateReceivedQuantity(item.itemId, item.orderedQuantity);
                        }
                      }}
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Harga Beli *</Label>
                    <CurrencyInput
                      value={item.purchasePrice}
                      onChange={(value) =>
                        updatePurchasePrice(item.itemId, value)
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
              ))}
            </div>

            {error && <div className="text-red-500 text-sm">{error}</div>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Konfirmasi Terima"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

