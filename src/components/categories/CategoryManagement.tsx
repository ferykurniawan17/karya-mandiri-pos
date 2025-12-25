"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface Category {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  _count?: {
    products: number;
  };
}

export default function CategoryManagement() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchCategories();
  }, [search]);

  const fetchCategories = async () => {
    try {
      const response = await fetch(
        `/api/categories?search=${encodeURIComponent(search)}`
      );
      const data = await response.json();
      if (response.ok) {
        setCategories(data.categories);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const url = editingCategory
        ? `/api/categories/${editingCategory.id}`
        : "/api/categories";
      const method = editingCategory ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Gagal menyimpan kategori");
        setLoading(false);
        return;
      }

      setFormData({ name: "", description: "" });
      setShowForm(false);
      setEditingCategory(null);
      setLoading(false);
      fetchCategories();
      router.refresh();
      toast({
        title: "Berhasil",
        description: editingCategory
          ? "Kategori berhasil diperbarui"
          : "Kategori berhasil ditambahkan",
      });
    } catch (err) {
      setError("Terjadi kesalahan");
      setLoading(false);
      toast({
        title: "Error",
        description: "Gagal menyimpan kategori",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
    });
    setShowForm(true);
  };

  const handleDeleteClick = (id: string) => {
    setCategoryToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;

    try {
      const response = await fetch(`/api/categories/${categoryToDelete}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        toast({
          title: "Error",
          description: data.error || "Gagal menghapus kategori",
          variant: "destructive",
        });
        setDeleteDialogOpen(false);
        setCategoryToDelete(null);
        return;
      }

      fetchCategories();
      router.refresh();
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
      toast({
        title: "Berhasil",
        description: "Kategori berhasil dihapus",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Terjadi kesalahan",
        variant: "destructive",
      });
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingCategory(null);
    setFormData({ name: "", description: "" });
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Daftar Kategori</h2>
        <Button
          onClick={() => {
            setShowForm(true);
            setEditingCategory(null);
            setFormData({ name: "", description: "" });
          }}
        >
          Tambah Kategori
        </Button>
      </div>

      <div className="mb-6">
        <Input
          type="text"
          placeholder="Cari kategori..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Kategori" : "Tambah Kategori Baru"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Ubah informasi kategori"
                : "Tambahkan kategori baru untuk produk"}
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Kategori</Label>
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
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCancel}>
                Batal
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {categories.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            {search
              ? "Tidak ada kategori yang ditemukan"
              : "Belum ada kategori"}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {categories.map((category) => (
              <li key={category.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {category.name}
                    </p>
                    {category.description && (
                      <p className="text-sm text-gray-500 mt-1">
                        {category.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {category._count?.products || 0} produk
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(category)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteClick(category.id)}
                    >
                      Hapus
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kategori?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus kategori ini? Tindakan ini tidak
              dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
