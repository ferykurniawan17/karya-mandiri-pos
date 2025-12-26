"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Provider } from "@/types";
import ProviderForm from "./ProviderForm";
import { Edit, Trash2, Truck } from "lucide-react";

interface ProviderWithCounts extends Provider {
  _count?: {
    purchaseOrders: number;
  };
}

export default function ProviderManagement() {
  const [providers, setProviders] = useState<ProviderWithCounts[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProviders();
  }, [search]);

  const fetchProviders = async () => {
    try {
      const url = `/api/providers?search=${encodeURIComponent(search)}`;
      const response = await fetch(url);
      const data = await response.json();
      if (response.ok) {
        setProviders(data.providers);
      }
    } catch (err) {
      console.error("Error fetching providers:", err);
    }
  };

  const handleDelete = async () => {
    if (!providerToDelete) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/providers/${providerToDelete}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Gagal menghapus provider");
        setLoading(false);
        return;
      }

      fetchProviders();
      setDeleteDialogOpen(false);
      setProviderToDelete(null);
      setLoading(false);
    } catch (err) {
      console.error("Error deleting provider:", err);
      alert("Terjadi kesalahan");
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Daftar Provider</h2>
            <Button
              onClick={() => {
                setEditingProvider(null);
                setShowForm(true);
              }}
            >
              + Tambah Provider
            </Button>
          </div>

          <div className="mb-6">
            <Input
              placeholder="Cari provider (nama, telepon, email)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {providers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {search
                ? "Tidak ada provider yang sesuai dengan pencarian"
                : "Belum ada provider"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nama
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kontak
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Alamat
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Purchase Order
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {providers.map((provider) => (
                    <tr key={provider.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-gray-400" />
                          <div className="text-sm font-medium text-gray-900">
                            {provider.name}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {provider.phone && (
                            <div>{provider.phone}</div>
                          )}
                          {provider.email && (
                            <div className="text-xs">{provider.email}</div>
                          )}
                          {!provider.phone && !provider.email && (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500">
                          {provider.address || (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {provider._count?.purchaseOrders || 0} PO
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingProvider(provider);
                              setShowForm(true);
                            }}
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setProviderToDelete(provider.id);
                              setDeleteDialogOpen(true);
                            }}
                            title="Hapus"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ProviderForm
        provider={editingProvider}
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingProvider(null);
        }}
        onSuccess={fetchProviders}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Provider?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus provider ini? Tindakan ini
              tidak dapat dibatalkan. Provider yang sudah memiliki Purchase Order
              tidak dapat dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={loading}
            >
              {loading ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

