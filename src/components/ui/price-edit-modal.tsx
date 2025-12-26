"use client";

import { useState, useEffect } from "react";
import { CurrencyInput } from "./currency-input";
import { Button } from "./button";
import { X } from "lucide-react";

interface PriceEditModalProps {
  isOpen: boolean;
  productName: string;
  originalPrice: number;
  currentPrice?: number;
  onSave: (newPrice: number | undefined) => void;
  onClose: () => void;
}

export function PriceEditModal({
  isOpen,
  productName,
  originalPrice,
  currentPrice,
  onSave,
  onClose,
}: PriceEditModalProps) {
  const [price, setPrice] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      // Initialize with current price or original price
      const initialPrice = currentPrice !== undefined ? currentPrice : originalPrice;
      setPrice(initialPrice.toString());
      setError("");
    }
  }, [isOpen, currentPrice, originalPrice]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleSave = () => {
    const priceValue = parseFloat(price) || 0;

    // Validation: price cannot be negative
    if (priceValue < 0) {
      setError("Harga tidak boleh negatif");
      return;
    }

    // If price is same as original, remove custom price (set to undefined)
    if (priceValue === originalPrice) {
      onSave(undefined);
    } else {
      onSave(priceValue);
    }
    onClose();
  };

  const handleReset = () => {
    setPrice(originalPrice.toString());
    setError("");
    onSave(undefined);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Ubah Harga - {productName}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Harga Asli
            </label>
            <p className="text-gray-500 line-through">
              {formatCurrency(originalPrice)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Harga Baru *
            </label>
            <CurrencyInput
              value={price || "0"}
              onChange={(value) => {
                setPrice(value);
                setError("");
              }}
              placeholder="Rp 0"
            />
            {error && (
              <p className="text-red-500 text-xs mt-1">{error}</p>
            )}
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              className="flex-1"
            >
              Reset ke Harga Asli
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              className="flex-1"
            >
              Simpan
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

