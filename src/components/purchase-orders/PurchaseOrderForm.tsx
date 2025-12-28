"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/ui/currency-input";
import { AutocompleteSelect } from "@/components/ui/autocomplete-select";
import ProductSelectionModal from "./ProductSelectionModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PurchaseOrder, Product, Provider } from "@/types";
import { Plus, Trash2, Search } from "lucide-react";

interface PurchaseOrderFormProps {
  purchaseOrder?: PurchaseOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface POItem {
  id?: string;
  productId: string;
  product?: Product;
  quantity: string;
  purchaseUnit?: string;
  purchasePrice: string;
  subtotal: number;
}

export default function PurchaseOrderForm({
  purchaseOrder,
  isOpen,
  onClose,
  onSuccess,
}: PurchaseOrderFormProps) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState({
    providerId: "",
    note: "",
  });
  const [items, setItems] = useState<POItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectingItemIndex, setSelectingItemIndex] = useState<number | null>(
    null
  );

  useEffect(() => {
    if (isOpen) {
      fetchProviders();
      fetchProducts();
    }
  }, [isOpen]);

  useEffect(() => {
    if (purchaseOrder && isOpen) {
      setFormData({
        providerId: purchaseOrder.providerId || "",
        note: purchaseOrder.note || "",
      });
      setItems(
        purchaseOrder.items.map((item) => {
          // If purchasePrice is 0 or not set, use product's purchasePrice as default
          const poPrice = Number(item.purchasePrice) || 0;
          const productPrice = item.product?.purchasePrice
            ? Number(item.product.purchasePrice)
            : 0;
          const finalPrice =
            poPrice > 0 ? poPrice : productPrice > 0 ? productPrice : 0;

          return {
            id: item.id,
            productId: item.productId,
            product: item.product,
            quantity: item.quantity.toString(),
            purchaseUnit:
              item.purchaseUnit || item.product?.purchaseUnit || undefined,
            purchasePrice: finalPrice.toString(),
            subtotal: item.quantity * finalPrice,
          };
        })
      );
    } else if (isOpen) {
      setFormData({
        providerId: "",
        note: "",
      });
      setItems([]);
    }
    setError("");
  }, [purchaseOrder, isOpen]);

  const fetchProviders = async () => {
    try {
      const response = await fetch("/api/providers");
      const data = await response.json();
      if (response.ok) {
        setProviders(data.providers);
      }
    } catch (err) {
      console.error("Error fetching providers:", err);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products");
      const data = await response.json();
      if (response.ok) {
        setProducts(data.products);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        productId: "",
        quantity: "1",
        purchasePrice: "0",
        subtotal: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof POItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index] };

    if (field === "productId") {
      item.productId = value;
      const product = products.find((p) => p.id === value);
      item.product = product;

      // Auto-fill purchase price from product's purchasePrice if available
      // Or keep existing price if editing approved PO
      if (item.purchasePrice && item.purchasePrice !== "0") {
        // Keep existing price if editing approved PO
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.purchasePrice) || 0;
        item.subtotal = qty * price;
      } else if (product?.purchasePrice && Number(product.purchasePrice) > 0) {
        // Auto-fill from product's purchasePrice
        item.purchasePrice = Number(product.purchasePrice).toString();
        const qty = parseFloat(item.quantity) || 0;
        const price = Number(product.purchasePrice);
        item.subtotal = qty * price;
      } else {
        // No purchase price available
        item.purchasePrice = "0";
        item.subtotal = 0;
      }
    } else if (field === "quantity") {
      item.quantity = value;
      // Recalculate subtotal if purchase price exists
      const qty = parseFloat(value) || 0;
      const price = parseFloat(item.purchasePrice) || 0;
      item.subtotal = qty * price;
    } else if (field === "purchasePrice") {
      item.purchasePrice = value;
      // Recalculate subtotal
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(value) || 0;
      item.subtotal = qty * price;
    }

    newItems[index] = item;
    setItems(newItems);
  };

  const handleProductSelect = (product: Product) => {
    if (selectingItemIndex !== null) {
      const newItems = [...items];
      const item = { ...newItems[selectingItemIndex] };
      item.productId = product.id;
      item.product = product;

      // Auto-fill purchase price from product's purchasePrice if available
      // Or keep existing price if editing approved PO
      if (item.purchasePrice && item.purchasePrice !== "0") {
        // Keep existing price if editing approved PO
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.purchasePrice) || 0;
        item.subtotal = qty * price;
      } else if (product.purchasePrice && Number(product.purchasePrice) > 0) {
        // Auto-fill from product's purchasePrice
        item.purchasePrice = Number(product.purchasePrice).toString();
        const qty = parseFloat(item.quantity) || 0;
        const price = Number(product.purchasePrice);
        item.subtotal = qty * price;
      } else {
        // No purchase price available
        item.purchasePrice = "0";
        item.subtotal = 0;
      }

      newItems[selectingItemIndex] = item;
      setItems(newItems);
      setSelectingItemIndex(null);
    }
  };

  const openProductModal = (index: number) => {
    setSelectingItemIndex(index);
    setShowProductModal(true);
  };

  const total = items.reduce((sum, item) => sum + item.subtotal, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (items.length === 0) {
      setError("Minimal harus ada satu item");
      return;
    }

    // Validate items
    for (const item of items) {
      if (!item.productId) {
        setError("Semua item harus memiliki product");
        return;
      }
      if (parseFloat(item.quantity) <= 0) {
        setError("Quantity harus lebih dari 0");
        return;
      }
      // Purchase price tidak wajib saat create, akan diisi saat receive
      // if (parseFloat(item.purchasePrice) <= 0) {
      //   setError("Harga pembelian harus lebih dari 0");
      //   return;
      // }
    }

    setLoading(true);

    try {
      const url = purchaseOrder
        ? `/api/purchase-orders/${purchaseOrder.id}`
        : "/api/purchase-orders";
      const method = purchaseOrder ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          providerId: formData.providerId || null,
          note: formData.note || null,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: parseInt(item.quantity),
            purchaseUnit:
              item.purchaseUnit || item.product?.purchaseUnit || null,
            purchasePrice: parseFloat(item.purchasePrice),
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Gagal menyimpan Purchase Order");
        setLoading(false);
        return;
      }

      setError("");
      setLoading(false);
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error saving purchase order:", err);
      setError("Terjadi kesalahan");
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {purchaseOrder ? "Edit Purchase Order" : "Tambah Purchase Order"}
          </DialogTitle>
          <DialogDescription>
            {purchaseOrder
              ? "Ubah informasi Purchase Order"
              : "Buat Purchase Order baru"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="provider">Provider (Optional)</Label>
                <AutocompleteSelect
                  options={providers.map((p) => ({ id: p.id, name: p.name }))}
                  value={formData.providerId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, providerId: value || "" })
                  }
                  placeholder="Pilih provider..."
                  searchPlaceholder="Cari provider..."
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="note">Catatan</Label>
              <Textarea
                id="note"
                value={formData.note}
                onChange={(e) =>
                  setFormData({ ...formData, note: e.target.value })
                }
                placeholder="Catatan tambahan"
                rows={3}
                className="mt-1"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Items</Label>
                <Button type="button" onClick={addItem} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Tambah Item
                </Button>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-8 text-gray-500 border border-dashed rounded">
                  Belum ada item. Klik "Tambah Item" untuk menambahkan.
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div
                      key={index}
                      className={`grid gap-2 items-end p-3 border rounded ${
                        purchaseOrder?.status === "approved" ||
                        Number(item.purchasePrice) > 0
                          ? "grid-cols-12"
                          : "grid-cols-12"
                      }`}
                    >
                      <div className="col-span-6">
                        <Label className="text-xs">Product</Label>
                        {item.product ? (
                          <div className="mt-1">
                            <div className="flex items-center gap-2 p-2 border rounded bg-gray-50">
                              {item.product.photo && (
                                <img
                                  src={item.product.photo}
                                  alt={item.product.name}
                                  className="h-10 w-10 object-contain rounded border border-gray-200"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">
                                  {item.product.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {item.product.category.name}
                                  {item.product.brand &&
                                    ` • ${item.product.brand.name}`}
                                  {item.product.sku &&
                                    ` • SKU: ${item.product.sku}`}
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => openProductModal(index)}
                                className="flex-shrink-0"
                              >
                                <Search className="h-4 w-4 mr-1" />
                                Ganti
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => openProductModal(index)}
                            className="w-full mt-1"
                          >
                            <Search className="h-4 w-4 mr-2" />
                            Pilih Produk
                          </Button>
                        )}
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(index, "quantity", e.target.value)
                          }
                          className="mt-1"
                          disabled={purchaseOrder?.status === "approved"}
                        />
                      </div>
                      {(purchaseOrder?.status === "approved" ||
                        (purchaseOrder && Number(item.purchasePrice) > 0)) && (
                        <div className="col-span-2">
                          <Label className="text-xs">Harga Beli</Label>
                          <CurrencyInput
                            value={item.purchasePrice}
                            onChange={(value) =>
                              updateItem(index, "purchasePrice", value)
                            }
                            className="mt-1"
                          />
                        </div>
                      )}
                      {(!purchaseOrder ||
                        (purchaseOrder.status !== "approved" &&
                          Number(item.purchasePrice) === 0)) && (
                        <div className="col-span-2"></div>
                      )}
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                          className="text-red-600"
                          disabled={purchaseOrder?.status === "approved"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {(purchaseOrder?.status === "approved" ||
                        Number(item.purchasePrice) > 0) && (
                        <div className="col-span-1 text-right">
                          <Label className="text-xs">Subtotal</Label>
                          <div className="mt-1 text-sm font-medium">
                            Rp {item.subtotal.toLocaleString("id-ID")}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && <div className="text-red-500 text-sm">{error}</div>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>

        <ProductSelectionModal
          isOpen={showProductModal}
          onClose={() => {
            setShowProductModal(false);
            setSelectingItemIndex(null);
          }}
          onSelect={handleProductSelect}
          excludeProductIds={items
            .filter((item, idx) => idx !== selectingItemIndex && item.productId)
            .map((item) => item.productId)}
        />
      </DialogContent>
    </Dialog>
  );
}
