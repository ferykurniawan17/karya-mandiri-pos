"use client";

import { useState, useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Plus, Trash2, Edit2 } from "lucide-react";
import { MultiSelect } from "@/components/ui/multi-select";
import { CurrencyInput } from "@/components/ui/currency-input";
import { AutocompleteSelect } from "@/components/ui/autocomplete-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

interface Category {
  id: string;
  name: string;
}

interface Tag {
  id: string;
  name: string;
}

interface Brand {
  id: string;
  name: string;
  photo?: string;
}

interface ProductSellingUnit {
  id?: string;
  name: string;
  unit: string;
  conversionFactor: number;
  sellingPrice: number;
  isDefault: boolean;
  allowPriceBased: boolean;
  isActive: boolean;
  displayOrder: number;
}

interface Product {
  id: string;
  name: string;
  aliasName?: string;
  sku?: string;
  stock: number;
  minimalStock: number;
  unit: string;
  productType?: "SIMPLE" | "MULTI_UNIT" | "WEIGHT_BASED";
  baseUnit?: string | null;
  baseStock?: number | null;
  minimalBaseStock?: number | null;
  purchaseUnit?: string | null;
  purchasePrice?: number | null;
  sellingPrice: number;
  photo?: string;
  placement?: string;
  categoryId: string;
  brandId?: string;
  tags?: Tag[];
  brand?: Brand;
  sellingUnits?: ProductSellingUnit[];
}

interface ProductFormProps {
  product?: Product | null;
  categories: Category[];
  tags: Tag[];
  brands: Brand[];
  onSave: () => void;
  onCancel: () => void;
}

export default function ProductForm({
  product,
  categories,
  tags,
  brands,
  onSave,
  onCancel,
}: ProductFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    aliasName: "",
    sku: "",
    stock: "0",
    minimalStock: "0",
    unit: "pcs",
    productType: "SIMPLE" as "SIMPLE" | "MULTI_UNIT" | "WEIGHT_BASED",
    baseUnit: "",
    baseStock: "0",
    minimalBaseStock: "0",
    purchaseUnit: "",
    purchasePrice: "0",
    sellingPrice: "0",
    photo: "",
    placement: "",
    categoryId: "",
  });
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [sellingUnits, setSellingUnits] = useState<ProductSellingUnit[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatingSKU, setGeneratingSKU] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (product) {
      const categoryId = product.categoryId || "";
      const effectiveBaseUnit = product.baseUnit || product.unit || "pcs";
      const effectiveBaseStock =
        product.baseStock !== null && product.baseStock !== undefined
          ? product.baseStock.toString()
          : product.stock.toString();
      const effectiveMinimalBaseStock =
        product.minimalBaseStock !== null &&
        product.minimalBaseStock !== undefined
          ? product.minimalBaseStock.toString()
          : product.minimalStock.toString();

      setFormData({
        name: product.name,
        aliasName: product.aliasName || "",
        sku: product.sku || "",
        stock: product.stock.toString(),
        minimalStock: product.minimalStock.toString(),
        unit: product.unit,
        productType: product.productType || "SIMPLE",
        baseUnit: effectiveBaseUnit,
        baseStock: effectiveBaseStock,
        minimalBaseStock: effectiveMinimalBaseStock,
        purchaseUnit: product.purchaseUnit || "",
        purchasePrice: product.purchasePrice?.toString() || "",
        sellingPrice: product.sellingPrice.toString(),
        photo: product.photo || "",
        placement: product.placement || "",
        categoryId: categoryId,
      });
      // Set selected category ID separately for Select component
      setSelectedCategoryId(categoryId);
      setSelectedTags(product.tags ? product.tags.map((t) => t.id) : []);
      setSelectedBrandId(product.brandId || "");

      // Load selling units
      if (product.sellingUnits && product.sellingUnits.length > 0) {
        setSellingUnits(product.sellingUnits);
      } else {
        // Create default selling unit if none exist
        setSellingUnits([
          {
            name: `Per ${effectiveBaseUnit}`,
            unit: effectiveBaseUnit,
            conversionFactor: 1,
            sellingPrice: product.sellingPrice,
            isDefault: true,
            allowPriceBased: false,
            isActive: true,
            displayOrder: 0,
          },
        ]);
      }

      if (product.photo) {
        setPhotoPreview(product.photo);
      }
    } else {
      // Reset form when no product (new product)
      setFormData({
        name: "",
        aliasName: "",
        sku: "",
        stock: "0",
        minimalStock: "0",
        unit: "pcs",
        productType: "SIMPLE",
        baseUnit: "pcs",
        baseStock: "0",
        minimalBaseStock: "0",
        purchaseUnit: "",
        purchasePrice: "0",
        sellingPrice: "0",
        photo: "",
        placement: "",
        categoryId: "",
      });
      setSelectedCategoryId("");
      setSelectedTags([]);
      setSelectedBrandId("");
      setSellingUnits([]);
      setPhotoPreview("");
      setPhotoFile(null);
    }
  }, [product]);

  const generateSKU = async () => {
    if (!formData.name) {
      toast({
        title: "Peringatan",
        description: "Nama produk harus diisi terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    if (!selectedCategoryId) {
      toast({
        title: "Peringatan",
        description: "Kategori harus diisi terlebih dahulu untuk generate SKU",
        variant: "destructive",
      });
      return;
    }

    setGeneratingSKU(true);

    try {
      // Get category code (first 3 letters of category name, uppercase)
      const category = categories.find((c) => c.id === selectedCategoryId);
      if (!category) {
        toast({
          title: "Peringatan",
          description: "Kategori tidak ditemukan",
          variant: "destructive",
        });
        setGeneratingSKU(false);
        return;
      }

      const categoryCode = category.name
        .replace(/[^a-zA-Z0-9]/g, "")
        .substring(0, 3)
        .toUpperCase();

      // Get product name abbreviation (first 3-4 letters, uppercase, remove spaces and special chars)
      const productNameAbbr = formData.name
        .replace(/[^a-zA-Z0-9]/g, "")
        .substring(0, 4)
        .toUpperCase();

      // Generate SKU with retry logic to ensure uniqueness
      let sku = "";
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        // Generate SKU: CAT-PROD-XXX (where XXX is random 3 digits)
        const randomNum = Math.floor(Math.random() * 1000)
          .toString()
          .padStart(3, "0");

        sku = `${categoryCode}-${productNameAbbr}-${randomNum}`;

        // Check if SKU already exists
        try {
          const checkResponse = await fetch(
            `/api/products/check-sku?sku=${encodeURIComponent(sku)}${
              product ? `&excludeId=${product.id}` : ""
            }`
          );
          const checkData = await checkResponse.json();

          if (!checkData.exists) {
            // SKU is unique, use it
            setFormData({ ...formData, sku });
            toast({
              title: "SKU Generated",
              description: `SKU berhasil dibuat: ${sku}`,
            });
            setGeneratingSKU(false);
            return;
          }
        } catch (error) {
          console.error("Error checking SKU:", error);
          // If check fails, still use the generated SKU (backend will validate)
          setFormData({ ...formData, sku });
          toast({
            title: "SKU Generated",
            description: `SKU berhasil dibuat: ${sku}`,
          });
          setGeneratingSKU(false);
          return;
        }

        attempts++;
      }

      // If we couldn't generate a unique SKU after max attempts
      toast({
        title: "Error",
        description: "Gagal generate SKU yang unique. Silakan coba lagi.",
        variant: "destructive",
      });
    } finally {
      setGeneratingSKU(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Selling Units Management
  const [editingSellingUnitIndex, setEditingSellingUnitIndex] = useState<
    number | null
  >(null);
  const [showSellingUnitForm, setShowSellingUnitForm] = useState(false);
  const [sellingUnitForm, setSellingUnitForm] = useState<
    Partial<ProductSellingUnit>
  >({
    name: "",
    unit: "",
    conversionFactor: 1,
    sellingPrice: parseFloat(formData.sellingPrice) || 0,
    isDefault: false,
    allowPriceBased: false,
    isActive: true,
    displayOrder: 0,
  });

  const handleAddSellingUnit = () => {
    if (
      !sellingUnitForm.name ||
      !sellingUnitForm.unit ||
      !sellingUnitForm.conversionFactor
    ) {
      toast({
        title: "Error",
        description: "Nama, unit, dan conversion factor harus diisi",
        variant: "destructive",
      });
      return;
    }

    const newUnit: ProductSellingUnit = {
      name: sellingUnitForm.name,
      unit: sellingUnitForm.unit,
      conversionFactor: sellingUnitForm.conversionFactor || 1,
      sellingPrice:
        sellingUnitForm.sellingPrice || parseFloat(formData.sellingPrice) || 0,
      isDefault: sellingUnitForm.isDefault || false,
      allowPriceBased: sellingUnitForm.allowPriceBased || false,
      isActive:
        sellingUnitForm.isActive !== undefined
          ? sellingUnitForm.isActive
          : true,
      displayOrder: sellingUnitForm.displayOrder || sellingUnits.length,
    };

    // If setting as default, unset other defaults
    if (newUnit.isDefault) {
      const updatedUnits = sellingUnits.map((u) => ({
        ...u,
        isDefault: false,
      }));
      updatedUnits.push(newUnit);
      setSellingUnits(updatedUnits);
    } else {
      setSellingUnits([...sellingUnits, newUnit]);
    }

    // Reset form
    setSellingUnitForm({
      name: "",
      unit: "",
      conversionFactor: 1,
      sellingPrice: parseFloat(formData.sellingPrice) || 0,
      isDefault: false,
      allowPriceBased: false,
      isActive: true,
      displayOrder: sellingUnits.length + 1,
    });
    setShowSellingUnitForm(false);
    setEditingSellingUnitIndex(null);
  };

  const handleEditSellingUnit = (index: number) => {
    const unit = sellingUnits[index];
    setSellingUnitForm(unit);
    setEditingSellingUnitIndex(index);
    setShowSellingUnitForm(true);
  };

  const handleUpdateSellingUnit = () => {
    if (editingSellingUnitIndex === null) return;
    if (
      !sellingUnitForm.name ||
      !sellingUnitForm.unit ||
      !sellingUnitForm.conversionFactor
    ) {
      toast({
        title: "Error",
        description: "Nama, unit, dan conversion factor harus diisi",
        variant: "destructive",
      });
      return;
    }

    const updatedUnits = [...sellingUnits];
    const updatedUnit = {
      ...updatedUnits[editingSellingUnitIndex],
      ...sellingUnitForm,
    };

    // If setting as default, unset other defaults
    if (updatedUnit.isDefault) {
      updatedUnits.forEach((u, i) => {
        if (i !== editingSellingUnitIndex) {
          u.isDefault = false;
        }
      });
    }

    updatedUnits[editingSellingUnitIndex] = updatedUnit;
    setSellingUnits(updatedUnits);

    // Reset form
    setSellingUnitForm({
      name: "",
      unit: "",
      conversionFactor: 1,
      sellingPrice: parseFloat(formData.sellingPrice) || 0,
      isDefault: false,
      allowPriceBased: false,
      isActive: true,
      displayOrder: sellingUnits.length,
    });
    setShowSellingUnitForm(false);
    setEditingSellingUnitIndex(null);
  };

  const handleDeleteSellingUnit = (index: number) => {
    const updatedUnits = sellingUnits.filter((_, i) => i !== index);
    setSellingUnits(updatedUnits);
  };

  const handleSetDefaultSellingUnit = (index: number) => {
    const updatedUnits = sellingUnits.map((u, i) => ({
      ...u,
      isDefault: i === index,
    }));
    setSellingUnits(updatedUnits);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let photoUrl = formData.photo;

      // Upload photo if new file selected
      if (photoFile) {
        const uploadFormData = new FormData();
        uploadFormData.append("file", photoFile);

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: uploadFormData,
        });

        const uploadData = await uploadResponse.json();

        if (!uploadResponse.ok) {
          setError(uploadData.error || "Gagal mengunggah foto");
          setLoading(false);
          return;
        }

        photoUrl = uploadData.url;
      }

      const url = product ? `/api/products/${product.id}` : "/api/products";
      const method = product ? "PUT" : "POST";

      // Prepare selling units data
      const sellingUnitsData =
        formData.productType !== "SIMPLE" && sellingUnits.length > 0
          ? sellingUnits.map((su, index) => ({
              id: su.id,
              name: su.name,
              unit: su.unit,
              conversionFactor: su.conversionFactor,
              sellingPrice: su.sellingPrice,
              isDefault:
                su.isDefault ||
                (index === 0 && !sellingUnits.some((s) => s.isDefault)),
              allowPriceBased: su.allowPriceBased,
              isActive: su.isActive,
              displayOrder:
                su.displayOrder !== undefined ? su.displayOrder : index,
            }))
          : undefined;

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          // For backward compatibility, use unit/stock if baseUnit/baseStock not set
          unit: formData.baseUnit || formData.unit,
          stock: formData.baseStock || formData.stock,
          minimalStock: formData.minimalBaseStock || formData.minimalStock,
          purchasePrice:
            formData.purchasePrice && parseFloat(formData.purchasePrice) > 0
              ? formData.purchasePrice
              : undefined,
          categoryId: selectedCategoryId || formData.categoryId,
          brandId: selectedBrandId || undefined,
          tagIds: selectedTags,
          photo: photoUrl,
          sellingUnits: sellingUnitsData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Gagal menyimpan produk");
        setLoading(false);
        return;
      }

      setLoading(false);
      onSave();
      toast({
        title: "Berhasil",
        description: product
          ? "Produk berhasil diperbarui"
          : "Produk berhasil ditambahkan",
      });
    } catch (err) {
      setError("Terjadi kesalahan");
      setLoading(false);
      toast({
        title: "Error",
        description: "Gagal menyimpan produk",
        variant: "destructive",
      });
    }
  };

  return (
    <div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nama Produk *</Label>
            <Input
              id="name"
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="aliasName">Nama Lain (Opsional)</Label>
            <Input
              id="aliasName"
              type="text"
              value={formData.aliasName}
              onChange={(e) =>
                setFormData({ ...formData, aliasName: e.target.value })
              }
              placeholder="Nama alternatif produk"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sku">SKU</Label>
            <div className="flex gap-2">
              <Input
                id="sku"
                type="text"
                value={formData.sku}
                onChange={(e) =>
                  setFormData({ ...formData, sku: e.target.value })
                }
                placeholder={
                  product
                    ? "SKU tidak bisa diubah"
                    : "Kosongkan untuk generate otomatis"
                }
                className="flex-1"
                disabled={!!product}
                readOnly={!!product}
              />
              <Button
                type="button"
                variant="outline"
                onClick={generateSKU}
                disabled={
                  !formData.name ||
                  !selectedCategoryId ||
                  !!product ||
                  generatingSKU
                }
                title={
                  product
                    ? "SKU tidak bisa diubah saat edit"
                    : "Generate SKU otomatis (kategori harus diisi)"
                }
              >
                <RefreshCw
                  className={`h-4 w-4 ${generatingSKU ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              {product
                ? "SKU tidak bisa diubah setelah produk dibuat"
                : "Klik tombol untuk generate SKU otomatis (kategori harus diisi terlebih dahulu)"}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Kategori *</Label>
            <Select
              required
              value={
                selectedCategoryId && selectedCategoryId !== ""
                  ? selectedCategoryId
                  : undefined
              }
              onValueChange={(value) => {
                setSelectedCategoryId(value);
                setFormData((prev) => ({ ...prev, categoryId: value }));
              }}
              key={`category-select-${
                product?.id || "new"
              }-${selectedCategoryId}`}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Pilih Kategori">
                  {selectedCategoryId &&
                    categories.find((c) => c.id === selectedCategoryId)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand">Brand (Opsional)</Label>
            <AutocompleteSelect
              options={brands.map((b) => ({ id: b.id, name: b.name }))}
              value={selectedBrandId || undefined}
              onValueChange={(value) => {
                setSelectedBrandId(value || "");
              }}
              placeholder="Pilih Brand"
              searchPlaceholder="Cari brand..."
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="tags">Tags (Opsional)</Label>
            <MultiSelect
              options={tags.map((t) => ({ id: t.id, name: t.name }))}
              selected={selectedTags}
              onSelectionChange={setSelectedTags}
              placeholder="Pilih tags..."
              searchPlaceholder="Cari tags..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="productType">Tipe Produk *</Label>
            <Select
              required
              value={formData.productType}
              onValueChange={(
                value: "SIMPLE" | "MULTI_UNIT" | "WEIGHT_BASED"
              ) => {
                setFormData({ ...formData, productType: value });
                // If switching to SIMPLE, ensure baseUnit is set
                if (value === "SIMPLE" && !formData.baseUnit) {
                  setFormData((prev) => ({
                    ...prev,
                    baseUnit: prev.unit || "pcs",
                  }));
                }
              }}
            >
              <SelectTrigger id="productType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SIMPLE">
                  Simple (Unit Pembelian = Unit Penjualan)
                </SelectItem>
                <SelectItem value="MULTI_UNIT">
                  Multi-Unit (Multiple Unit Penjualan)
                </SelectItem>
                <SelectItem value="WEIGHT_BASED">
                  Weight-Based (Berbasis Berat)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="baseUnit">Base Unit (Unit Inventory) *</Label>
            <Select
              required
              value={formData.baseUnit || formData.unit}
              onValueChange={(value) =>
                setFormData({ ...formData, baseUnit: value, unit: value })
              }
            >
              <SelectTrigger id="baseUnit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pcs">Pcs</SelectItem>
                <SelectItem value="kg">Kg</SelectItem>
                <SelectItem value="m">Meter</SelectItem>
                <SelectItem value="m2">M²</SelectItem>
                <SelectItem value="m3">M³</SelectItem>
                <SelectItem value="pack">Pack</SelectItem>
                <SelectItem value="box">Box</SelectItem>
                <SelectItem value="dus">Dus</SelectItem>
                <SelectItem value="kubik">Kubik</SelectItem>
                <SelectItem value="rit">Rit</SelectItem>
                <SelectItem value="ons">Ons</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Unit dasar untuk inventory dan stok
            </p>
          </div>
          {formData.productType !== "SIMPLE" && (
            <div className="space-y-2">
              <Label htmlFor="purchaseUnit">
                Purchase Unit (Unit Pembelian) - Opsional
              </Label>
              <Select
                value={formData.purchaseUnit || ""}
                onValueChange={(value) =>
                  setFormData({ ...formData, purchaseUnit: value })
                }
              >
                <SelectTrigger id="purchaseUnit">
                  <SelectValue placeholder="Sama dengan Base Unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sama dengan Base Unit</SelectItem>
                  <SelectItem value="pcs">Pcs</SelectItem>
                  <SelectItem value="kg">Kg</SelectItem>
                  <SelectItem value="m">Meter</SelectItem>
                  <SelectItem value="m2">M²</SelectItem>
                  <SelectItem value="m3">M³</SelectItem>
                  <SelectItem value="pack">Pack</SelectItem>
                  <SelectItem value="box">Box</SelectItem>
                  <SelectItem value="dus">Dus</SelectItem>
                  <SelectItem value="kubik">Kubik</SelectItem>
                  <SelectItem value="rit">Rit</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Unit saat pembelian dari supplier (jika berbeda dari base unit)
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="unit">Satuan (Backward Compatibility) *</Label>
            <Select
              required
              value={formData.unit}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  unit: value,
                  baseUnit: formData.baseUnit || value,
                })
              }
            >
              <SelectTrigger id="unit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pcs">Pcs</SelectItem>
                <SelectItem value="kg">Kg</SelectItem>
                <SelectItem value="m">Meter</SelectItem>
                <SelectItem value="m2">M²</SelectItem>
                <SelectItem value="m3">M³</SelectItem>
                <SelectItem value="pack">Pack</SelectItem>
                <SelectItem value="box">Box</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="baseStock">
              {formData.productType !== "SIMPLE"
                ? "Base Stock (Stok dalam Base Unit)"
                : "Stok"}
            </Label>
            <Input
              id="baseStock"
              type="number"
              min="0"
              step="0.01"
              value={
                formData.productType !== "SIMPLE"
                  ? formData.baseStock
                  : formData.stock
              }
              onChange={(e) => {
                const value = e.target.value;
                if (formData.productType !== "SIMPLE") {
                  setFormData({ ...formData, baseStock: value, stock: value });
                } else {
                  setFormData({ ...formData, stock: value, baseStock: value });
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="minimalBaseStock">
              {formData.productType !== "SIMPLE"
                ? "Minimal Base Stock"
                : "Stok Minimal"}
            </Label>
            <Input
              id="minimalBaseStock"
              type="number"
              min="0"
              step="0.01"
              value={
                formData.productType !== "SIMPLE"
                  ? formData.minimalBaseStock
                  : formData.minimalStock
              }
              onChange={(e) => {
                const value = e.target.value;
                if (formData.productType !== "SIMPLE") {
                  setFormData({
                    ...formData,
                    minimalBaseStock: value,
                    minimalStock: value,
                  });
                } else {
                  setFormData({
                    ...formData,
                    minimalStock: value,
                    minimalBaseStock: value,
                  });
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="purchasePrice">
              Harga Beli (Opsional)
              <span className="text-xs text-gray-500 block mt-1">
                Harga beli biasanya diisi dari Purchase Order
              </span>
            </Label>
            <CurrencyInput
              id="purchasePrice"
              value={formData.purchasePrice}
              onChange={(value) =>
                setFormData({ ...formData, purchasePrice: value })
              }
              placeholder="Rp 0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sellingPrice">Harga Jual *</Label>
            <CurrencyInput
              id="sellingPrice"
              required
              value={formData.sellingPrice}
              onChange={(value) =>
                setFormData({ ...formData, sellingPrice: value })
              }
              placeholder="Rp 0,00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="placement">Penempatan</Label>
            <Input
              id="placement"
              type="text"
              value={formData.placement}
              onChange={(e) =>
                setFormData({ ...formData, placement: e.target.value })
              }
              placeholder="Contoh: Rak A1, Gudang 2"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="photo">Foto</Label>
            <Input
              id="photo"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />
            {photoPreview && (
              <img
                src={photoPreview}
                alt="Preview"
                className="mt-2 h-32 object-cover rounded"
              />
            )}
          </div>
        </div>

        {/* Selling Units Management - Only for MULTI_UNIT and WEIGHT_BASED */}
        {formData.productType !== "SIMPLE" && (
          <div className="mt-6 border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">
                  Selling Units (Unit Penjualan)
                </h3>
                <p className="text-sm text-gray-500">
                  Tentukan unit-unit yang dapat digunakan saat penjualan
                </p>
              </div>
              <Dialog
                open={showSellingUnitForm}
                onOpenChange={setShowSellingUnitForm}
              >
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSellingUnitForm({
                        name: "",
                        unit: "",
                        conversionFactor: 1,
                        sellingPrice: parseFloat(formData.sellingPrice) || 0,
                        isDefault: sellingUnits.length === 0,
                        allowPriceBased: false,
                        isActive: true,
                        displayOrder: sellingUnits.length,
                      });
                      setEditingSellingUnitIndex(null);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Selling Unit
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingSellingUnitIndex !== null
                        ? "Edit Selling Unit"
                        : "Tambah Selling Unit"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="su-name">Nama Unit *</Label>
                      <Input
                        id="su-name"
                        value={sellingUnitForm.name || ""}
                        onChange={(e) =>
                          setSellingUnitForm({
                            ...sellingUnitForm,
                            name: e.target.value,
                          })
                        }
                        placeholder="Contoh: Per Dus, Per Kilo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="su-unit">Unit *</Label>
                      <Select
                        value={sellingUnitForm.unit || ""}
                        onValueChange={(value) =>
                          setSellingUnitForm({
                            ...sellingUnitForm,
                            unit: value,
                          })
                        }
                      >
                        <SelectTrigger id="su-unit">
                          <SelectValue placeholder="Pilih Unit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pcs">Pcs</SelectItem>
                          <SelectItem value="kg">Kg</SelectItem>
                          <SelectItem value="m">Meter</SelectItem>
                          <SelectItem value="m2">M²</SelectItem>
                          <SelectItem value="m3">M³</SelectItem>
                          <SelectItem value="pack">Pack</SelectItem>
                          <SelectItem value="box">Box</SelectItem>
                          <SelectItem value="dus">Dus</SelectItem>
                          <SelectItem value="kubik">Kubik</SelectItem>
                          <SelectItem value="rit">Rit</SelectItem>
                          <SelectItem value="ons">Ons</SelectItem>
                          <SelectItem value="rupiah">
                            Rupiah (Price-Based)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="su-conversion">Conversion Factor *</Label>
                      <Input
                        id="su-conversion"
                        type="number"
                        step="0.01"
                        min="0"
                        value={
                          sellingUnitForm.conversionFactor?.toString() || "1"
                        }
                        onChange={(e) =>
                          setSellingUnitForm({
                            ...sellingUnitForm,
                            conversionFactor: parseFloat(e.target.value) || 1,
                          })
                        }
                        placeholder="1"
                      />
                      <p className="text-xs text-gray-500">
                        Faktor konversi ke base unit. Contoh: 1 kg = 1 (jika
                        base unit adalah kg), 1 ons = 0.1 (jika base unit adalah
                        kg)
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="su-price">Harga Jual per Unit *</Label>
                      <CurrencyInput
                        id="su-price"
                        value={sellingUnitForm.sellingPrice?.toString() || "0"}
                        onChange={(value) =>
                          setSellingUnitForm({
                            ...sellingUnitForm,
                            sellingPrice: parseFloat(value) || 0,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="su-default"
                        checked={sellingUnitForm.isDefault || false}
                        onCheckedChange={(checked) =>
                          setSellingUnitForm({
                            ...sellingUnitForm,
                            isDefault: checked as boolean,
                          })
                        }
                      />
                      <Label htmlFor="su-default" className="cursor-pointer">
                        Set sebagai default unit penjualan
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="su-price-based"
                        checked={sellingUnitForm.allowPriceBased || false}
                        onCheckedChange={(checked) =>
                          setSellingUnitForm({
                            ...sellingUnitForm,
                            allowPriceBased: checked as boolean,
                          })
                        }
                      />
                      <Label
                        htmlFor="su-price-based"
                        className="cursor-pointer"
                      >
                        Izinkan penjualan per rupiah (price-based sales)
                      </Label>
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowSellingUnitForm(false);
                          setEditingSellingUnitIndex(null);
                        }}
                      >
                        Batal
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          if (editingSellingUnitIndex !== null) {
                            handleUpdateSellingUnit();
                          } else {
                            handleAddSellingUnit();
                          }
                        }}
                      >
                        {editingSellingUnitIndex !== null ? "Update" : "Tambah"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {sellingUnits.length === 0 ? (
              <div className="text-center py-8 text-gray-500 border border-dashed rounded-lg">
                <p>
                  Belum ada selling unit. Klik "Tambah Selling Unit" untuk
                  menambahkan.
                </p>
                <p className="text-xs mt-2">
                  Untuk produk SIMPLE, default selling unit akan dibuat
                  otomatis.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {sellingUnits.map((unit, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{unit.name}</span>
                        {unit.isDefault && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            Default
                          </span>
                        )}
                        {unit.allowPriceBased && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            Price-Based
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Unit: {unit.unit} | Conversion: {unit.conversionFactor}{" "}
                        | Harga: Rp {unit.sellingPrice.toLocaleString("id-ID")}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!unit.isDefault && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetDefaultSellingUnit(index)}
                        >
                          Set Default
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditSellingUnit(index)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteSellingUnit(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex space-x-4 justify-end mt-6">
          <Button type="button" variant="outline" onClick={onCancel}>
            Batal
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </form>
    </div>
  );
}
