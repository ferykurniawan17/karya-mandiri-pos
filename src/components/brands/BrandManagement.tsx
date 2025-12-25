"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
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
import { Edit, Trash2 } from "lucide-react";

interface Brand {
  id: string;
  name: string;
  photo?: string;
  createdAt: Date;
  _count?: {
    products: number;
  };
}

export default function BrandManagement() {
  const router = useRouter();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    photo: "",
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchBrands();
  }, [search]);

  const fetchBrands = async () => {
    try {
      const response = await fetch(
        `/api/brands?search=${encodeURIComponent(search)}`
      );
      const data = await response.json();
      if (response.ok) {
        setBrands(data.brands);
      }
    } catch (err) {
      console.error("Error fetching brands:", err);
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

        const uploadResponse = await fetch("/api/upload/brand", {
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

      const url = editingBrand
        ? `/api/brands/${editingBrand.id}`
        : "/api/brands";
      const method = editingBrand ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          photo: photoUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Gagal menyimpan brand");
        setLoading(false);
        return;
      }

      setFormData({ name: "", photo: "" });
      setPhotoFile(null);
      setPhotoPreview("");
      setShowForm(false);
      setEditingBrand(null);
      fetchBrands();
      router.refresh();
      toast({
        title: "Berhasil",
        description: editingBrand
          ? "Brand berhasil diperbarui"
          : "Brand berhasil ditambahkan",
      });
    } catch (err) {
      setError("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setFormData({ name: brand.name, photo: brand.photo || "" });
    if (brand.photo) {
      setPhotoPreview(brand.photo);
    }
    setPhotoFile(null);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    setBrandToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!brandToDelete) return;

    try {
      const response = await fetch(`/api/brands/${brandToDelete}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        toast({
          title: "Error",
          description: data.error || "Gagal menghapus brand",
          variant: "destructive",
        });
        return;
      }

      fetchBrands();
      router.refresh();
      toast({
        title: "Berhasil",
        description: "Brand berhasil dihapus",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setBrandToDelete(null);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingBrand(null);
    setFormData({ name: "", photo: "" });
    setPhotoFile(null);
    setPhotoPreview("");
    setError("");
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Daftar Brand</h2>
        <Button
          onClick={() => {
            setShowForm(true);
            setEditingBrand(null);
            setFormData({ name: "", photo: "" });
            setPhotoFile(null);
            setPhotoPreview("");
          }}
        >
          Tambah Brand
        </Button>
      </div>

      <div className="mb-6">
        <Input
          type="text"
          placeholder="Cari brand..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBrand ? "Edit Brand" : "Tambah Brand Baru"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Brand *</Label>
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
                <Label htmlFor="photo">Foto (Opsional)</Label>
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
            <DialogFooter className="mt-6">
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Brand?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus brand ini? Tindakan ini tidak dapat
              dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {brands.length === 0 ? (
            <div className="col-span-full px-6 py-8 text-center text-gray-500">
              Belum ada brand
            </div>
          ) : (
            brands.map((brand) => (
              <div
                key={brand.id}
                className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow border-gray-200"
              >
                {brand.photo && (
                  <div className="w-full h-[130px] bg-gray-100 flex items-center justify-center">
                    <img
                      src={brand.photo}
                      alt={brand.name}
                      className="w-full h-full max-h-[130px] object-contain"
                    />
                  </div>
                )}
                <div className="p-4">
                  <div className="mb-2">
                    <h3 className="font-semibold text-gray-900">{brand.name}</h3>
                    {brand._count && (
                      <p className="text-sm text-gray-500">
                        {brand._count.products} produk
                      </p>
                    )}
                  </div>
                  <div className="mt-4 flex justify-center space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEdit(brand)}
                      className="h-9 w-9"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDelete(brand.id)}
                      className="h-9 w-9"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

