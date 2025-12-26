"use client";

import { useState, useEffect } from "react";
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
import { Provider } from "@/types";

interface ProviderFormProps {
  provider?: Provider | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ProviderForm({
  provider,
  isOpen,
  onClose,
  onSuccess,
}: ProviderFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (provider) {
      setFormData({
        name: provider.name || "",
        phone: provider.phone || "",
        email: provider.email || "",
        address: provider.address || "",
        notes: provider.notes || "",
      });
    } else {
      setFormData({
        name: "",
        phone: "",
        email: "",
        address: "",
        notes: "",
      });
    }
    setError("");
  }, [provider, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const url = provider
        ? `/api/providers/${provider.id}`
        : "/api/providers";
      const method = provider ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Gagal menyimpan provider");
        setLoading(false);
        return;
      }

      setFormData({
        name: "",
        phone: "",
        email: "",
        address: "",
        notes: "",
      });
      setError("");
      setLoading(false);
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error saving provider:", err);
      setError("Terjadi kesalahan");
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {provider ? "Edit Provider" : "Tambah Provider"}
          </DialogTitle>
          <DialogDescription>
            {provider
              ? "Ubah informasi provider"
              : "Tambahkan provider baru ke sistem"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">
                Nama Provider <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Masukkan nama provider"
                required
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Telepon</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="081234567890"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="email@example.com"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Alamat</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="Masukkan alamat lengkap"
                rows={3}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="notes">Catatan</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Catatan tambahan tentang provider"
                rows={3}
                className="mt-1"
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}
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
      </DialogContent>
    </Dialog>
  );
}

