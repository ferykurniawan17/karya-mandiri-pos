"use client";

import { useState } from "react";
import { Product, ProductSellingUnit } from "@/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getDefaultSellingUnit, getActiveSellingUnits, hasMultipleSellingUnits } from "@/lib/product-units";

interface UnitSelectorProps {
  product: Product;
  onConfirm: (sellingUnit: ProductSellingUnit | null, quantity: number, priceBasedAmount?: number) => void;
  onCancel: () => void;
  open: boolean;
}

export default function UnitSelector({
  product,
  onConfirm,
  onCancel,
  open,
}: UnitSelectorProps) {
  const activeSellingUnits = getActiveSellingUnits(product);
  const defaultUnit = getDefaultSellingUnit(product);
  const hasMultiple = hasMultipleSellingUnits(product);

  const [selectedUnitId, setSelectedUnitId] = useState<string>(
    defaultUnit?.id || (activeSellingUnits.length > 0 ? activeSellingUnits[0].id : "")
  );
  const [quantity, setQuantity] = useState<string>("1");
  const [priceBasedAmount, setPriceBasedAmount] = useState<string>("");
  const [isPriceBased, setIsPriceBased] = useState(false);

  const selectedUnit = activeSellingUnits.find((u) => u.id === selectedUnitId);

  const handleConfirm = () => {
    if (!selectedUnit) {
      // For simple products without selling units, use default
      onConfirm(null, parseFloat(quantity) || 1);
      return;
    }

    if (isPriceBased && selectedUnit.allowPriceBased) {
      const amount = parseFloat(priceBasedAmount);
      if (amount <= 0) {
        alert("Jumlah rupiah harus lebih dari 0");
        return;
      }
      onConfirm(selectedUnit, 0, amount);
    } else {
      const qty = parseFloat(quantity);
      if (qty <= 0) {
        alert("Jumlah harus lebih dari 0");
        return;
      }
      onConfirm(selectedUnit, qty);
    }
  };

  const handleUnitChange = (unitId: string) => {
    setSelectedUnitId(unitId);
    const unit = activeSellingUnits.find((u) => u.id === unitId);
    if (unit) {
      setIsPriceBased(unit.allowPriceBased && isPriceBased);
      if (!unit.allowPriceBased) {
        setPriceBasedAmount("");
      }
    }
  };

  // If product has no selling units or only one, auto-confirm
  if (!hasMultiple && defaultUnit) {
    return (
      <Dialog open={open} onOpenChange={onCancel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah ke Keranjang</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                {product.name} - {defaultUnit.name}
              </p>
              {defaultUnit.allowPriceBased ? (
                <div className="space-y-2">
                  <Label>Jumlah (dalam {defaultUnit.unit})</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="1"
                  />
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="price-based"
                      checked={isPriceBased}
                      onChange={(e) => setIsPriceBased(e.target.checked)}
                    />
                    <Label htmlFor="price-based" className="cursor-pointer">
                      Beli per rupiah
                    </Label>
                  </div>
                  {isPriceBased && (
                    <div className="space-y-2">
                      <Label>Jumlah Rupiah</Label>
                      <CurrencyInput
                        value={priceBasedAmount}
                        onChange={setPriceBasedAmount}
                        placeholder="Rp 0"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Jumlah (dalam {defaultUnit.unit})</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="1"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Batal
              </Button>
              <Button type="button" onClick={handleConfirm}>
                Tambah
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pilih Unit Penjualan</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Produk: {product.name}</Label>
            <Select value={selectedUnitId} onValueChange={handleUnitChange}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih Unit" />
              </SelectTrigger>
              <SelectContent>
                {activeSellingUnits.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.name} - Rp {unit.sellingPrice.toLocaleString("id-ID")} / {unit.unit}
                    {unit.isDefault && " (Default)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedUnit && (
            <>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium">{selectedUnit.name}</p>
                <p className="text-xs text-gray-600">
                  Harga: Rp {selectedUnit.sellingPrice.toLocaleString("id-ID")} / {selectedUnit.unit}
                </p>
                <p className="text-xs text-gray-600">
                  Conversion: 1 {selectedUnit.unit} = {selectedUnit.conversionFactor} {product.baseUnit || product.unit}
                </p>
              </div>

              {selectedUnit.allowPriceBased ? (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="price-based"
                      checked={isPriceBased}
                      onChange={(e) => setIsPriceBased(e.target.checked)}
                    />
                    <Label htmlFor="price-based" className="cursor-pointer">
                      Beli per rupiah (price-based)
                    </Label>
                  </div>
                  {isPriceBased ? (
                    <div className="space-y-2">
                      <Label>Jumlah Rupiah *</Label>
                      <CurrencyInput
                        value={priceBasedAmount}
                        onChange={setPriceBasedAmount}
                        placeholder="Rp 0"
                      />
                      <p className="text-xs text-gray-500">
                        Masukkan jumlah rupiah yang ingin dibeli
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Jumlah (dalam {selectedUnit.unit}) *</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="1"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Jumlah (dalam {selectedUnit.unit}) *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="1"
                  />
                </div>
              )}
            </>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Batal
            </Button>
            <Button type="button" onClick={handleConfirm} disabled={!selectedUnit}>
              Tambah ke Keranjang
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

