"use client";

import * as React from "react";
import { X, Check, ChevronDown } from "lucide-react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";
import { Product } from "@/types";
import { getEffectiveStock, getEffectiveUnit } from "@/lib/product-units";

interface ProductSelectorProps {
  products: Product[];
  value?: string;
  onValueChange: (value: string | undefined) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
}

export function ProductSelector({
  products,
  value,
  onValueChange,
  placeholder = "Pilih produk...",
  searchPlaceholder = "Cari produk...",
  className,
  disabled,
}: ProductSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const filteredProducts = React.useMemo(() => {
    if (!search) return products;
    const lowerSearch = search.toLowerCase();
    return products.filter((product) => {
      const nameMatch = product.name.toLowerCase().includes(lowerSearch);
      const skuMatch = product.sku?.toLowerCase().includes(lowerSearch);
      const aliasMatch = product.aliasName?.toLowerCase().includes(lowerSearch);
      const categoryMatch = product.category.name.toLowerCase().includes(lowerSearch);
      return nameMatch || skuMatch || aliasMatch || categoryMatch;
    });
  }, [products, search]);

  const selectedProduct = React.useMemo(() => {
    return products.find((product) => product.id === value);
  }, [products, value]);

  const handleSelect = (productId: string) => {
    if (value === productId) {
      onValueChange(undefined);
    } else {
      onValueChange(productId);
    }
    setOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange(undefined);
    setSearch("");
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex min-h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            selectedProduct && "py-2",
            className
          )}
        >
          <div className="flex flex-1 items-center gap-2 min-w-0">
            {selectedProduct ? (
              <>
                {selectedProduct.photo ? (
                  <img
                    src={selectedProduct.photo}
                    alt={selectedProduct.name}
                    className="h-8 w-8 object-contain flex-shrink-0 rounded border border-gray-200"
                  />
                ) : (
                  <div className="h-8 w-8 bg-gray-100 rounded border border-gray-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-[8px] text-gray-400">No Img</span>
                  </div>
                )}
                <div className="flex-1 min-w-0 text-left">
                  <div className="font-medium truncate text-sm">{selectedProduct.name}</div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    {selectedProduct.sku && <span>SKU: {selectedProduct.sku}</span>}
                    {selectedProduct.sku && selectedProduct.category && <span>•</span>}
                    {selectedProduct.category && <span>{selectedProduct.category.name}</span>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClear}
                  className="hover:text-gray-700 flex-shrink-0"
                >
                  <X className="h-3 w-3" />
                </button>
              </>
            ) : (
              <span className="text-gray-500">{placeholder}</span>
            )}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className={cn(
            "z-50 w-[var(--radix-popover-trigger-width)] rounded-md border border-gray-200 bg-white p-1 shadow-md",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          )}
          align="start"
        >
          <div className="p-2">
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              autoFocus
            />
          </div>
          <div className="max-h-[400px] overflow-auto">
            {filteredProducts.length === 0 ? (
              <div className="px-2 py-6 text-center text-sm text-gray-500">
                Tidak ada hasil
              </div>
            ) : (
              filteredProducts.map((product) => {
                const isSelected = value === product.id;
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleSelect(product.id)}
                    className={cn(
                      "relative flex w-full cursor-default select-none items-start gap-3 rounded-sm px-3 py-3 text-sm outline-none hover:bg-gray-100 focus:bg-gray-100",
                      isSelected && "bg-indigo-50"
                    )}
                  >
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded border mt-1",
                          isSelected
                            ? "border-indigo-600 bg-indigo-600"
                            : "border-gray-300"
                        )}
                      >
                        {isSelected && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                      {product.photo ? (
                        <img
                          src={product.photo}
                          alt={product.name}
                          className="h-12 w-12 object-contain rounded border border-gray-200"
                        />
                      ) : (
                        <div className="h-12 w-12 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                          <span className="text-xs text-gray-400">No Image</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">{product.name}</div>
                          {product.aliasName && (
                            <div className="text-xs text-gray-500">({product.aliasName})</div>
                          )}
                          {product.sku && (
                            <div className="text-xs text-gray-500 mt-0.5">SKU: {product.sku}</div>
                          )}
                          <div className="text-xs text-gray-500 mt-0.5">
                            {product.category.name}
                          </div>
                          {product.brand && (
                            <div className="flex items-center gap-1 mt-1">
                              {product.brand.photo && (
                                <img
                                  src={product.brand.photo}
                                  alt={product.brand.name}
                                  className="h-4 w-4 object-contain"
                                />
                              )}
                              <span className="text-xs text-gray-500">{product.brand.name}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs text-gray-500">Stok</div>
                          <div className={cn(
                            "text-sm font-medium",
                            getEffectiveStock(product) <= ((product.minimalBaseStock !== null && product.minimalBaseStock !== undefined) ? Number(product.minimalBaseStock) : (product.minimalStock || 0)) ? "text-red-600" : "text-gray-900"
                          )}>
                            {getEffectiveStock(product).toLocaleString('id-ID', { maximumFractionDigits: 2 })} {getEffectiveUnit(product) || product.unit}
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

