"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PurchaseOrder } from "@/types";
import { Check, X, Package, Edit } from "lucide-react";

interface PurchaseOrderDetailProps {
  purchaseOrder: PurchaseOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove?: () => void;
  onReceive?: () => void;
  onCancel?: () => void;
}

export default function PurchaseOrderDetail({
  purchaseOrder,
  isOpen,
  onClose,
  onApprove,
  onReceive,
  onCancel,
}: PurchaseOrderDetailProps) {
  const [editingPrices, setEditingPrices] = useState(false);
  const [itemPrices, setItemPrices] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (purchaseOrder && isOpen) {
      const prices: Record<string, string> = {};
      purchaseOrder.items.forEach((item) => {
        // If purchasePrice is 0 or not set, use product's purchasePrice as default
        const poPrice = Number(item.purchasePrice) || 0;
        const productPrice = item.product?.purchasePrice
          ? Number(item.product.purchasePrice)
          : 0;
        const finalPrice =
          poPrice > 0 ? poPrice : productPrice > 0 ? productPrice : 0;
        prices[item.id] = finalPrice.toString();
      });
      setItemPrices(prices);
      setEditingPrices(false);
      setError("");
    }
  }, [purchaseOrder, isOpen]);

  const canEditPrices =
    purchaseOrder?.status === "draft" || purchaseOrder?.status === "approved";

  const handleSavePrices = async () => {
    if (!purchaseOrder) return;

    setError("");
    setLoading(true);

    try {
      // Validate all prices
      for (const [itemId, price] of Object.entries(itemPrices)) {
        if (!price || parseFloat(price) <= 0) {
          setError("Semua harga beli harus diisi dan lebih dari 0");
          setLoading(false);
          return;
        }
      }

      // Update purchase prices via API
      const response = await fetch(
        `/api/purchase-orders/${purchaseOrder.id}/prices`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            items: Object.entries(itemPrices).map(([itemId, price]) => ({
              itemId,
              purchasePrice: parseFloat(price),
            })),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Gagal menyimpan harga beli");
        setLoading(false);
        return;
      }

      setEditingPrices(false);
      setLoading(false);
      if (onApprove) onApprove(); // Refresh data
    } catch (err) {
      console.error("Error saving prices:", err);
      setError("Terjadi kesalahan");
      setLoading(false);
    }
  };

  if (!purchaseOrder) return null;

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      draft: { label: "Draft", className: "bg-gray-100 text-gray-800" },
      approved: {
        label: "Approved",
        className: "bg-blue-100 text-blue-800",
      },
      received: {
        label: "Received",
        className: "bg-green-100 text-green-800",
      },
      cancelled: {
        label: "Cancelled",
        className: "bg-red-100 text-red-800",
      },
    };

    const statusInfo = statusMap[status] || statusMap.draft;

    return (
      <span
        className={`px-2 py-1 rounded text-xs font-medium ${statusInfo.className}`}
      >
        {statusInfo.label}
      </span>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detail Purchase Order</DialogTitle>
          <DialogDescription>
            PO Number: {purchaseOrder.poNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-gray-500">Status</Label>
              <div className="mt-1">{getStatusBadge(purchaseOrder.status)}</div>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Provider</Label>
              <div className="mt-1">{purchaseOrder.provider?.name || "-"}</div>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Dibuat Oleh</Label>
              <div className="mt-1">{purchaseOrder.user.name}</div>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Tanggal Dibuat</Label>
              <div className="mt-1">
                {new Date(purchaseOrder.createdAt).toLocaleString("id-ID")}
              </div>
            </div>
            {purchaseOrder.receivedAt && (
              <div>
                <Label className="text-sm text-gray-500">
                  Tanggal Diterima
                </Label>
                <div className="mt-1">
                  {new Date(purchaseOrder.receivedAt).toLocaleString("id-ID")}
                </div>
              </div>
            )}
            {purchaseOrder.note && (
              <div className="col-span-2">
                <Label className="text-sm text-gray-500">Catatan</Label>
                <div className="mt-1">{purchaseOrder.note}</div>
              </div>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <Label className="text-sm font-medium">Items</Label>
            </div>
            <div className="mt-2 space-y-2">
              {purchaseOrder.items.map((item) => (
                <div
                  key={item.id}
                  className={`grid gap-4 items-center p-3 border rounded ${
                    purchaseOrder.status === "received"
                      ? "grid-cols-6"
                      : "grid-cols-5"
                  }`}
                >
                  <div className="col-span-2">
                    <div className="font-medium">{item.product.name}</div>
                    <div className="text-xs text-gray-500">
                      {item.product.category.name}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Quantity</div>
                    <div className="font-medium">{item.quantity}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Harga Beli</div>
                    {editingPrices && canEditPrices ? (
                      <CurrencyInput
                        value={itemPrices[item.id] || "0"}
                        onChange={(value) =>
                          setItemPrices({
                            ...itemPrices,
                            [item.id]: value,
                          })
                        }
                        className="w-full"
                      />
                    ) : (
                      <div className="font-medium text-center">
                        {(() => {
                          // If purchasePrice is 0 or not set, use product's purchasePrice as default
                          const poPrice = Number(item.purchasePrice) || 0;
                          const productPrice = item.product?.purchasePrice
                            ? Number(item.product.purchasePrice)
                            : 0;
                          const finalPrice =
                            poPrice > 0
                              ? poPrice
                              : productPrice > 0
                              ? productPrice
                              : 0;
                          return `Rp ${finalPrice.toLocaleString("id-ID")}`;
                        })()}
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Subtotal</div>
                    <div className="font-medium">
                      {editingPrices && canEditPrices
                        ? `Rp ${(
                            (parseFloat(itemPrices[item.id] || "0") || 0) *
                            item.quantity
                          ).toLocaleString("id-ID")}`
                        : (() => {
                            // If purchasePrice is 0, calculate from product price
                            const poPrice = Number(item.purchasePrice) || 0;
                            const productPrice = item.product?.purchasePrice
                              ? Number(item.product.purchasePrice)
                              : 0;
                            const finalPrice =
                              poPrice > 0
                                ? poPrice
                                : productPrice > 0
                                ? productPrice
                                : 0;
                            const subtotal = item.quantity * finalPrice;
                            return `Rp ${subtotal.toLocaleString("id-ID")}`;
                          })()}
                    </div>
                  </div>
                  {purchaseOrder.status === "received" && (
                    <div className="text-center">
                      <div className="text-sm text-gray-500">Diterima</div>
                      <div className="font-medium">{item.receivedQuantity}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {editingPrices && canEditPrices && (
              <div className="mt-4 flex justify-end">
                <Button
                  type="button"
                  onClick={handleSavePrices}
                  disabled={loading}
                >
                  {loading ? "Menyimpan..." : "Simpan Harga Beli"}
                </Button>
              </div>
            )}
            {error && <div className="mt-2 text-red-500 text-sm">{error}</div>}
          </div>

          <div className="flex justify-end pt-4 border-t">
            <div className="text-right">
              <div className="text-sm text-gray-500">Total</div>
              <div className="text-2xl font-bold">
                {(() => {
                  // Calculate total from items, using product price if PO price is 0
                  const calculatedTotal = purchaseOrder.items.reduce(
                    (sum, item) => {
                      const poPrice = Number(item.purchasePrice) || 0;
                      const productPrice = item.product?.purchasePrice
                        ? Number(item.product.purchasePrice)
                        : 0;
                      const finalPrice =
                        poPrice > 0
                          ? poPrice
                          : productPrice > 0
                          ? productPrice
                          : 0;
                      return sum + item.quantity * finalPrice;
                    },
                    0
                  );

                  // Use calculated total if PO total is 0, otherwise use PO total
                  const poTotal = Number(purchaseOrder.total) || 0;
                  const finalTotal = poTotal > 0 ? poTotal : calculatedTotal;

                  return `Rp ${finalTotal.toLocaleString("id-ID")}`;
                })()}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          {purchaseOrder.status === "draft" && onApprove && (
            <Button
              onClick={async () => {
                try {
                  const response = await fetch(
                    `/api/purchase-orders/${purchaseOrder.id}`,
                    {
                      method: "PATCH",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({ action: "approve" }),
                    }
                  );

                  if (response.ok) {
                    onApprove();
                    onClose();
                  } else {
                    const data = await response.json();
                    alert(data.error || "Gagal approve PO");
                  }
                } catch (err) {
                  console.error("Error approving PO:", err);
                  alert("Terjadi kesalahan");
                }
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Check className="h-4 w-4 mr-1" />
              Approve
            </Button>
          )}

          {purchaseOrder.status === "approved" && onReceive && (
            <Button
              onClick={() => {
                onReceive();
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              <Package className="h-4 w-4 mr-1" />
              Terima Barang
            </Button>
          )}

          {(purchaseOrder.status === "draft" ||
            purchaseOrder.status === "approved") &&
            onCancel && (
              <Button
                onClick={async () => {
                  try {
                    const response = await fetch(
                      `/api/purchase-orders/${purchaseOrder.id}`,
                      {
                        method: "PATCH",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ action: "cancel" }),
                      }
                    );

                    if (response.ok) {
                      onCancel();
                      onClose();
                    } else {
                      const data = await response.json();
                      alert(data.error || "Gagal cancel PO");
                    }
                  } catch (err) {
                    console.error("Error cancelling PO:", err);
                    alert("Terjadi kesalahan");
                  }
                }}
                variant="destructive"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            )}

          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
