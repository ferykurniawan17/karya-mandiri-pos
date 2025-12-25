"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import ProductForm from "./ProductForm";
import ProductList from "./ProductList";
import { MultiSelect } from "@/components/ui/multi-select";

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku?: string;
  stock: number;
  minimalStock: number;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  photo?: string;
  placement?: string;
  categoryId: string;
  category: Category;
  createdAt: Date;
  updatedAt: Date;
}

export default function ProductManagement() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCategories();
    fetchTags();
    fetchBrands();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [search, categoryFilter, selectedTagIds, selectedBrandIds]);

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

  const fetchProducts = async () => {
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
        setProducts(data.products);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  const handleSave = () => {
    setShowForm(false);
    setEditingProduct(null);
    fetchProducts();
    router.refresh();
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus produk ini?")) {
      return;
    }

    try {
      const response = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Gagal menghapus produk");
        return;
      }

      fetchProducts();
      router.refresh();
    } catch (err) {
      alert("Terjadi kesalahan");
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingProduct(null);
  };

  const generateSKU = async (
    productName: string,
    categoryId: string
  ): Promise<string | null> => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) {
      return null;
    }

    const categoryCode = category.name
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, 3)
      .toUpperCase();

    const productNameAbbr = productName
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, 4)
      .toUpperCase();

    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const randomNum = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0");

      const sku = `${categoryCode}-${productNameAbbr}-${randomNum}`;

      try {
        const checkResponse = await fetch(
          `/api/products/check-sku?sku=${encodeURIComponent(sku)}`
        );
        const checkData = await checkResponse.json();

        if (!checkData.exists) {
          return sku;
        }
      } catch (error) {
        console.error("Error checking SKU:", error);
        // If check fails, return the generated SKU anyway (backend will validate)
        return sku;
      }

      attempts++;
    }

    return null;
  };

  const handleDuplicate = async (product: Product) => {
    try {
      setLoading(true);

      // Generate new SKU
      const newSKU = await generateSKU(product.name, product.categoryId);

      if (!newSKU) {
        toast({
          title: "Error",
          description: "Gagal generate SKU baru. Silakan coba lagi.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Create duplicate product with new SKU and stock = 0
      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `${product.name} (Copy)`,
          sku: newSKU,
          stock: 0,
          minimalStock: product.minimalStock,
          unit: product.unit,
          purchasePrice: product.purchasePrice.toString(),
          sellingPrice: product.sellingPrice.toString(),
          photo: product.photo || undefined,
          placement: product.placement || undefined,
          categoryId: product.categoryId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: "Error",
          description: data.error || "Gagal menduplikasi produk",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      toast({
        title: "Berhasil",
        description: "Produk berhasil diduplikasi dengan SKU baru",
      });

      fetchProducts();
      router.refresh();
    } catch (err) {
      console.error("Error duplicating product:", err);
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat menduplikasi produk",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Get low stock products
  const lowStockProducts = products.filter((p) => p.stock <= p.minimalStock);

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Daftar Produk</h2>
          {lowStockProducts.length > 0 && (
            <p className="text-sm text-red-600 mt-1">
              ⚠️ {lowStockProducts.length} produk dengan stok rendah
            </p>
          )}
        </div>
        <Button
          onClick={() => {
            setShowForm(true);
            setEditingProduct(null);
          }}
        >
          Tambah Produk
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Input
          type="text"
          placeholder="Cari produk..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="space-y-2">
          <MultiSelect
            options={brands.map((b) => ({ id: b.id, name: b.name }))}
            selected={selectedBrandIds}
            onSelectionChange={setSelectedBrandIds}
            placeholder="Pilih brands..."
            searchPlaceholder="Cari brands..."
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Semua Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Edit Produk" : "Tambah Produk Baru"}
            </DialogTitle>
          </DialogHeader>
          <ProductForm
            product={editingProduct}
            categories={categories}
            tags={tags}
            brands={brands}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </DialogContent>
      </Dialog>

      <ProductList
        products={products}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
      />
    </div>
  );
}
