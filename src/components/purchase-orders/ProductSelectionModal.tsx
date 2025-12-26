"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { Product, Category, Brand } from "@/types";

interface Tag {
  id: string;
  name: string;
  createdAt: Date;
}
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ProductSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (product: Product) => void;
  excludeProductIds?: string[]; // Products to exclude from selection
}

export default function ProductSelectionModal({
  isOpen,
  onClose,
  onSelect,
  excludeProductIds = [],
}: ProductSelectionModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      fetchCategories();
      fetchBrands();
      fetchTags();
    }
  }, [isOpen, search, categoryFilter, selectedTagIds, selectedBrandIds]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      let url = `/api/products?search=${encodeURIComponent(search)}`;
      if (categoryFilter && categoryFilter !== "all") {
        url += `&categoryId=${categoryFilter}`;
      }
      if (selectedTagIds.length > 0) {
        url += `&tagIds=${selectedTagIds.join(",")}`;
      }
      if (selectedBrandIds.length > 0) {
        url += `&brandIds=${selectedBrandIds.join(",")}`;
      }
      const response = await fetch(url);
      const data = await response.json();
      if (response.ok) {
        // Filter out excluded products
        const filtered = data.products.filter(
          (p: Product) => !excludeProductIds.includes(p.id)
        );
        setProducts(filtered);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      const data = await response.json();
      if (response.ok) {
        setCategories(data.categories);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  const fetchBrands = async () => {
    try {
      const response = await fetch("/api/brands");
      const data = await response.json();
      if (response.ok) {
        setBrands(data.brands);
      }
    } catch (err) {
      console.error("Error fetching brands:", err);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await fetch("/api/tags");
      const data = await response.json();
      if (response.ok) {
        setTags(data.tags);
      }
    } catch (err) {
      console.error("Error fetching tags:", err);
    }
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const isLowStock = (product: Product) => {
    return product.stock <= product.minimalStock;
  };

  const handleProductClick = (product: Product) => {
    onSelect(product);
    onClose();
    // Reset filters
    setSearch("");
    setCategoryFilter("all");
    setSelectedTagIds([]);
    setSelectedBrandIds([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Pilih Produk</DialogTitle>
          <DialogDescription>
            Pilih produk dari daftar untuk ditambahkan ke Purchase Order
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Filters */}
          <div className="space-y-4 pb-4 border-b">
            <div>
              <Label htmlFor="search">Cari Produk</Label>
              <Input
                id="search"
                placeholder="Cari berdasarkan nama, SKU, kategori, brand..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Kategori</Label>
                <Select
                  value={categoryFilter || "all"}
                  onValueChange={(value) =>
                    setCategoryFilter(value === "all" ? "" : value)
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Semua Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kategori</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Tags</Label>
                <MultiSelect
                  options={tags.map((tag) => ({ id: tag.id, name: tag.name }))}
                  selected={selectedTagIds}
                  onChange={setSelectedTagIds}
                  placeholder="Pilih tags..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Brands</Label>
                <MultiSelect
                  options={brands.map((brand) => ({
                    id: brand.id,
                    name: brand.name,
                  }))}
                  selected={selectedBrandIds}
                  onChange={setSelectedBrandIds}
                  placeholder="Pilih brands..."
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto mt-4">
            {loading ? (
              <div className="text-center py-12 text-gray-500">Memuat produk...</div>
            ) : products.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {search || categoryFilter || selectedTagIds.length > 0 || selectedBrandIds.length > 0
                  ? "Tidak ada produk yang sesuai dengan filter"
                  : "Belum ada produk"}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-2">
                {products.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleProductClick(product)}
                    className={`border rounded-lg overflow-hidden hover:shadow-lg transition-all text-left ${
                      isLowStock(product)
                        ? "border-red-300 bg-red-50"
                        : "border-gray-200 bg-white hover:border-indigo-500"
                    }`}
                  >
                    {product.photo && (
                      <div className="w-full h-[120px] bg-gray-100 flex items-center justify-center">
                        <img
                          src={product.photo}
                          alt={product.name}
                          className="w-full h-full max-h-[120px] object-contain"
                        />
                      </div>
                    )}
                    <div className="p-3">
                      <div className="mb-2">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 flex-1 text-sm">
                            {product.name}
                          </h3>
                          {product.brand?.photo && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="cursor-help">
                                    <img
                                      src={product.brand.photo}
                                      alt={product.brand.name}
                                      className="h-5 w-5 object-contain flex-shrink-0"
                                    />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{product.brand.name}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                        {product.sku && (
                          <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                        )}
                        <p className="text-xs text-gray-600">{product.category.name}</p>
                      </div>

                      <div className="mt-2 space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Stok:</span>
                          <span
                            className={`font-medium ${
                              isLowStock(product) ? "text-red-600" : "text-gray-900"
                            }`}
                          >
                            {product.stock} {product.unit}
                            {isLowStock(product) && " ⚠️"}
                          </span>
                        </div>
                        {product.purchasePrice && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Harga Beli:</span>
                            <span className="text-gray-900">
                              {formatCurrency(product.purchasePrice)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-600">Harga Jual:</span>
                          <span className="text-gray-900 font-semibold">
                            {formatCurrency(product.sellingPrice)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

