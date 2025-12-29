"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AutocompleteSelect } from "@/components/ui/autocomplete-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Customer, Project, Product } from "@/types";
import { X, Plus, Trash2, Search } from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import { convertFromBaseUnit } from "@/lib/product-units";
import ProductSelectionModal from "@/components/shared/ProductSelectionModal";

interface TransactionItem {
  id?: string;
  productId: string;
  productName: string;
  sellingUnitId?: string | null;
  sellingUnitName?: string;
  quantity: number;
  price: number;
  subtotal: number;
  priceBasedAmount?: number;
}

interface TransactionEditFormProps {
  transaction: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TransactionEditForm({
  transaction,
  isOpen,
  onClose,
  onSuccess,
}: TransactionEditFormProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>();
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
  const [paymentType, setPaymentType] = useState<"paid" | "unpaid" | "partial">("paid");
  const [cash, setCash] = useState("");
  const [credit, setCredit] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showProductModal, setShowProductModal] = useState(false);

  useEffect(() => {
    if (isOpen && transaction) {
      // Initialize form with transaction data
      setSelectedCustomerId(transaction.customerId || undefined);
      setSelectedProjectId(transaction.projectId || undefined);
      setNote(transaction.note || "");
      
      // Set payment type based on transaction
      if (transaction.paymentStatus === "paid") {
        setPaymentType("paid");
      } else if (transaction.paymentStatus === "unpaid") {
        setPaymentType("unpaid");
      } else {
        setPaymentType("partial");
      }
      
      setCash(transaction.cash?.toString() || "0");
      setCredit(transaction.credit?.toString() || "0");
      
      // Convert transaction items to form items
      const formItems: TransactionItem[] = transaction.items.map((item: any) => ({
        id: item.id,
        productId: item.product.id,
        productName: item.product.name,
        sellingUnitId: item.sellingUnitId,
        sellingUnitName: item.sellingUnit?.name || item.sellingUnit?.unit || "pcs",
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
      }));
      setItems(formItems);
      
      // Fetch customers and projects
      fetchCustomers();
      if (transaction.customerId) {
        fetchProjectsForCustomer(transaction.customerId);
      }
    }
  }, [isOpen, transaction]);

  useEffect(() => {
    if (selectedCustomerId) {
      fetchProjectsForCustomer(selectedCustomerId);
    } else {
      setProjects([]);
      setSelectedProjectId(undefined);
    }
  }, [selectedCustomerId]);

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

  const fetchProjectsForCustomer = async (customerId: string) => {
    try {
      const response = await fetch(`/api/customers/${customerId}/projects`);
      const data = await response.json();
      if (response.ok) {
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
    }
  };


  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const handleProductSelect = async (product: Product) => {
    // Fetch full product details with sellingUnits
    try {
      const response = await fetch(`/api/products/${product.id}`);
      const data = await response.json();
      if (response.ok && data.product) {
        const fullProduct = data.product;
        const defaultSellingUnit = fullProduct.sellingUnits?.find((su: any) => su.isDefault && su.isActive);
        const sellingUnit = defaultSellingUnit || fullProduct.sellingUnits?.[0];
        
        const newItem: TransactionItem = {
          productId: fullProduct.id,
          productName: fullProduct.name,
          sellingUnitId: sellingUnit?.id || null,
          sellingUnitName: sellingUnit?.name || sellingUnit?.unit || "pcs",
          quantity: 1,
          price: sellingUnit ? Number(sellingUnit.sellingPrice) : Number(fullProduct.sellingPrice),
          subtotal: sellingUnit ? Number(sellingUnit.sellingPrice) : Number(fullProduct.sellingPrice),
        };
        
        setItems([...items, newItem]);
        setShowProductModal(false);
      }
    } catch (err) {
      console.error("Error fetching product details:", err);
      // Fallback to basic product data
      const newItem: TransactionItem = {
        productId: product.id,
        productName: product.name,
        sellingUnitId: null,
        sellingUnitName: "pcs",
        quantity: 1,
        price: Number(product.sellingPrice),
        subtotal: Number(product.sellingPrice),
      };
      setItems([...items, newItem]);
      setShowProductModal(false);
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof TransactionItem, value: any) => {
    const updatedItems = [...items];
    const item = updatedItems[index];
    
    if (field === "quantity") {
      item.quantity = Number(value) || 0;
      item.subtotal = item.quantity * item.price;
    } else if (field === "price") {
      item.price = Number(value) || 0;
      item.subtotal = item.quantity * item.price;
    }
    
    updatedItems[index] = item;
    setItems(updatedItems);
  };

  // Auto-calculate credit and cash based on payment type
  useEffect(() => {
    const total = calculateTotal();
    const cashAmount = parseFloat(cash) || 0;
    const creditAmount = parseFloat(credit) || 0;
    
    // If total is 0, don't adjust
    if (total === 0) return;
    
    if (paymentType === "paid") {
      // For paid: cash should equal total, credit = 0
      setCredit("0");
      if (cashAmount !== total) {
        setCash(total.toString());
      }
    } else if (paymentType === "unpaid") {
      // For unpaid: cash = 0, credit = total
      setCash("0");
      if (creditAmount !== total) {
        setCredit(total.toString());
      }
    } else if (paymentType === "partial") {
      // For partial: adjust when total changes (e.g., item removed)
      const currentTotal = cashAmount + creditAmount;
      
      if (currentTotal === 0) {
        // If no payment set yet, default to half cash, half credit
        const halfTotal = total / 2;
        setCash(halfTotal.toString());
        setCredit(halfTotal.toString());
      } else if (Math.abs(currentTotal - total) > 0.01) {
        // If total changed (e.g., item removed), adjust proportionally
        // But preserve cash if it's less than new total
        if (cashAmount <= total) {
          // Keep cash as is, adjust credit
          const newCredit = total - cashAmount;
          setCredit(newCredit > 0 ? newCredit.toString() : "0");
        } else {
          // Cash exceeds total, reduce both proportionally
          const ratio = total / currentTotal;
          const newCash = cashAmount * ratio;
          const newCredit = total - newCash;
          setCash(newCash.toString());
          setCredit(newCredit > 0 ? newCredit.toString() : "0");
        }
      }
    }
  }, [paymentType, items]);

  // Handle manual cash change for partial payment
  const handleCashChange = (value: string) => {
    setCash(value);
    if (paymentType === "partial") {
      const total = calculateTotal();
      const cashAmount = parseFloat(value) || 0;
      if (cashAmount <= total) {
        const newCredit = total - cashAmount;
        setCredit(newCredit > 0 ? newCredit.toString() : "0");
      } else {
        // If cash exceeds total, cap it at total
        setCash(total.toString());
        setCredit("0");
      }
    }
  };

  const handleSubmit = async () => {
    setError("");
    const total = calculateTotal();
    const cashAmount = parseFloat(cash) || 0;
    const creditAmount = parseFloat(credit) || 0;

    if (items.length === 0) {
      setError("Minimal harus ada satu item");
      return;
    }

    if (cashAmount + creditAmount !== total) {
      setError("Jumlah pembayaran (tunai + hutang) harus sama dengan total");
      return;
    }

    // Check if transaction has payments - if yes, validate credit
    const hasPayments = transaction.payments && transaction.payments.length > 0;
    const totalPaid = hasPayments
      ? transaction.payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
      : 0;

    if (hasPayments && creditAmount < totalPaid) {
      setError(
        `Tidak dapat mengurangi hutang menjadi kurang dari total pembayaran yang sudah dilakukan (${formatRupiah(totalPaid)})`
      );
      return;
    }

    setLoading(true);

    try {
      const payload = {
        items: items.map((item) => ({
          id: item.id, // Include ID for existing items
          productId: item.productId,
          sellingUnitId: item.sellingUnitId,
          quantity: item.quantity,
          customPrice: item.price,
          status: null,
        })),
        cash: cashAmount,
        credit: creditAmount,
        customerId: selectedCustomerId || null,
        projectId: selectedProjectId || null,
        projectName: projects.find((p) => p.id === selectedProjectId)?.name || null,
        paymentStatus: paymentType,
        paymentMethod: transaction.paymentMethod || null,
        note: note || null,
      };

      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        setError(data.error || "Gagal mengupdate transaksi");
      }
    } catch (err: any) {
      console.error("Error updating transaction:", err);
      setError("Terjadi kesalahan saat mengupdate transaksi");
    } finally {
      setLoading(false);
    }
  };

  if (!transaction) return null;

  const total = calculateTotal();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Transaksi - {transaction.invoiceNo}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Customer and Project */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Pelanggan</Label>
              <AutocompleteSelect
                options={customers.map((c) => ({ id: c.id, name: c.name }))}
                value={selectedCustomerId}
                onValueChange={(value) => {
                  setSelectedCustomerId(value);
                  setSelectedProjectId(undefined);
                }}
                placeholder="Pilih pelanggan..."
                searchPlaceholder="Cari pelanggan..."
                className="mt-1"
              />
            </div>
            <div>
              <Label>Proyek</Label>
              <AutocompleteSelect
                options={projects.map((p) => ({ id: p.id, name: p.name }))}
                value={selectedProjectId}
                onValueChange={setSelectedProjectId}
                placeholder="Pilih proyek..."
                searchPlaceholder="Cari proyek..."
                className="mt-1"
                disabled={!selectedCustomerId}
              />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Item Transaksi</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowProductModal(true)}
              >
                <Search className="h-4 w-4 mr-2" />
                Pilih Produk
              </Button>
            </div>
            <div className="mt-2 space-y-2">

              {/* Items List */}
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 border rounded"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{item.productName}</div>
                      {item.sellingUnitName && (
                        <div className="text-xs text-gray-500">
                          Satuan: {item.sellingUnitName}
                        </div>
                      )}
                    </div>
                    <div className="w-24">
                      <Label className="text-xs">Qty</Label>
                      <Input
                        type="text"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(index, "quantity", e.target.value)
                        }
                        className="text-sm"
                      />
                    </div>
                    <div className="w-32">
                      <Label className="text-xs">Harga</Label>
                      <CurrencyInput
                        value={item.price.toString()}
                        onChange={(value) =>
                          handleItemChange(index, "price", parseFloat(value) || 0)
                        }
                        className="text-sm"
                      />
                    </div>
                    <div className="w-32">
                      <Label className="text-xs">Subtotal</Label>
                      <div className="text-sm font-semibold">
                        {formatRupiah(item.subtotal)}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveItem(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Status Pembayaran</Label>
              <Select
                value={paymentType}
                onValueChange={(value: "paid" | "unpaid" | "partial") =>
                  setPaymentType(value)
                }
                className="mt-1"
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Lunas</SelectItem>
                  <SelectItem value="unpaid">Hutang</SelectItem>
                  <SelectItem value="partial">Cicilan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Total</Label>
              <div className="mt-1 text-lg font-bold">
                {formatRupiah(total)}
              </div>
            </div>
            <div>
              <Label>Tunai</Label>
              <CurrencyInput
                value={cash}
                onChange={handleCashChange}
                className="mt-1"
                disabled={paymentType === "unpaid"}
              />
            </div>
            <div>
              <Label>Hutang</Label>
              <CurrencyInput
                value={credit}
                onChange={(value) => {
                  setCredit(value);
                  if (paymentType === "partial") {
                    const total = calculateTotal();
                    const creditAmount = parseFloat(value) || 0;
                    if (creditAmount <= total) {
                      const newCash = total - creditAmount;
                      setCash(newCash > 0 ? newCash.toString() : "0");
                    } else {
                      setCredit(total.toString());
                      setCash("0");
                    }
                  }
                }}
                className="mt-1"
                disabled={paymentType === "paid"}
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <Label>Catatan</Label>
            <Textarea
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
              {loading ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </div>

        {/* Product Selection Modal */}
        <ProductSelectionModal
          isOpen={showProductModal}
          onClose={() => setShowProductModal(false)}
          onSelect={handleProductSelect}
          excludeProductIds={items.map((item) => item.productId)}
          title="Pilih Produk"
          description="Pilih produk dari daftar untuk ditambahkan ke transaksi"
        />
      </DialogContent>
    </Dialog>
  );
}

