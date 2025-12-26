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
import { Checkbox } from "@/components/ui/checkbox";
import { Project } from "@/types";

interface ProjectFormProps {
  project?: Project | null;
  customerId: string;
  hasDefaultProject: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ProjectForm({
  project,
  customerId,
  hasDefaultProject,
  isOpen,
  onClose,
  onSuccess,
}: ProjectFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isDefault: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || "",
        description: project.description || "",
        isDefault: project.isDefault || false,
      });
    } else {
      setFormData({
        name: "",
        description: "",
        isDefault: !hasDefaultProject, // Auto-set as default if no default project exists
      });
    }
    setError("");
  }, [project, isOpen, hasDefaultProject]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const url = project
        ? `/api/projects/${project.id}`
        : `/api/customers/${customerId}/projects`;
      const method = project ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Gagal menyimpan proyek");
        setLoading(false);
        return;
      }

      setFormData({
        name: "",
        description: "",
        isDefault: false,
      });
      setError("");
      setLoading(false);
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error saving project:", err);
      setError("Terjadi kesalahan");
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {project ? "Edit Proyek" : "Tambah Proyek"}
          </DialogTitle>
          <DialogDescription>
            {project
              ? "Ubah informasi proyek"
              : "Tambahkan proyek baru untuk pelanggan ini"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">
                Nama Proyek <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Masukkan nama proyek"
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Deskripsi proyek (opsional)"
                rows={3}
                className="mt-1"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isDefault"
                checked={formData.isDefault}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isDefault: checked === true })
                }
                disabled={project?.isDefault} // Can't uncheck if already default
              />
              <Label
                htmlFor="isDefault"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Jadikan sebagai proyek default
                {project?.isDefault && (
                  <span className="text-xs text-gray-500 ml-2">
                    (Proyek default tidak dapat diubah)
                  </span>
                )}
              </Label>
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

