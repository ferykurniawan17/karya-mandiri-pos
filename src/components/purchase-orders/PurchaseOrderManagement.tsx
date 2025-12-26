"use client";

import { useState, useEffect } from "react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PurchaseOrder, Provider } from "@/types";
import PurchaseOrderForm from "./PurchaseOrderForm";
import PurchaseOrderDetail from "./PurchaseOrderDetail";
import ReceivePO from "./ReceivePO";
import { Plus, Eye, Edit, Trash2, FileText } from "lucide-react";

export default function PurchaseOrderManagement() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [viewingPO, setViewingPO] = useState<PurchaseOrder | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [receivingPO, setReceivingPO] = useState<PurchaseOrder | null>(null);
  const [showReceive, setShowReceive] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [poToDelete, setPoToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPurchaseOrders();
    fetchProviders();
  }, [search, statusFilter, providerFilter, startDate, endDate]);

  const fetchPurchaseOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      if (providerFilter && providerFilter !== "all") params.append("providerId", providerFilter);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const url = `/api/purchase-orders?${params.toString()}`;
      const response = await fetch(url);
      const data = await response.json();
      if (response.ok) {
        setPurchaseOrders(data.purchaseOrders);
      }
    } catch (err) {
      console.error("Error fetching purchase orders:", err);
    }
  };

  const fetchProviders = async () => {
    try {
      const response = await fetch("/api/providers");
      const data = await response.json();
      if (response.ok) {
        setProviders(data.providers);
      }
    } catch (err) {
      console.error("Error fetching providers:", err);
    }
  };

  const handleDelete = async () => {
    if (!poToDelete) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/purchase-orders/${poToDelete}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Gagal menghapus Purchase Order");
        setLoading(false);
        return;
      }

      fetchPurchaseOrders();
      setDeleteDialogOpen(false);
      setPoToDelete(null);
      setLoading(false);
    } catch (err) {
      console.error("Error deleting purchase order:", err);
      alert("Terjadi kesalahan");
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      draft: { label: "Draft", className: "bg-gray-100 text-gray-800" },
      approved: {
        label: "Approved",
        className: "bg-blue-100 text-blue-800",
      },
      received: {
        label: "Received",
        className: "bg-green-100 text-green-800",
      },
      cancelled: {
        label: "Cancelled",
        className: "bg-red-100 text-red-800",
      },
    };

    const statusInfo = statusMap[status] || statusMap.draft;

    return (
      <span
        className={`px-2 py-1 rounded text-xs font-medium ${statusInfo.className}`}
      >
        {statusInfo.label}
      </span>
    );
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Daftar Purchase Order</h2>
            <Button
              onClick={() => {
                setEditingPO(null);
                setShowForm(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Tambah PO
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <Input
              placeholder="Cari PO Number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={providerFilter || "all"} onValueChange={(value) => setProviderFilter(value === "all" ? "" : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Provider</SelectItem>
                {providers.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Dari Tanggal"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="Sampai Tanggal"
            />
          </div>

          {purchaseOrders.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {search || statusFilter || providerFilter
                ? "Tidak ada Purchase Order yang sesuai dengan filter"
                : "Belum ada Purchase Order"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PO Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Provider
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tanggal
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {purchaseOrders.map((po) => (
                    <tr key={po.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <div className="text-sm font-medium text-gray-900">
                            {po.poNumber}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {po.provider?.name || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(po.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          Rp {Number(po.total).toLocaleString("id-ID")}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(po.createdAt).toLocaleDateString("id-ID")}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setViewingPO(po);
                              setShowDetail(true);
                            }}
                            title="Lihat Detail"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {po.status === "draft" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingPO(po);
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
                                  setPoToDelete(po.id);
                                  setDeleteDialogOpen(true);
                                }}
                                title="Hapus"
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
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

      <PurchaseOrderForm
        purchaseOrder={editingPO}
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingPO(null);
        }}
        onSuccess={fetchPurchaseOrders}
      />

      <PurchaseOrderDetail
        purchaseOrder={viewingPO}
        isOpen={showDetail}
        onClose={() => {
          setShowDetail(false);
          setViewingPO(null);
        }}
        onApprove={fetchPurchaseOrders}
        onReceive={() => {
          setReceivingPO(viewingPO);
          setShowReceive(true);
          setShowDetail(false);
        }}
        onCancel={fetchPurchaseOrders}
      />

      <ReceivePO
        purchaseOrder={receivingPO}
        isOpen={showReceive && !!receivingPO}
        onClose={() => {
          setShowReceive(false);
          setReceivingPO(null);
        }}
        onSuccess={fetchPurchaseOrders}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Purchase Order?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus Purchase Order ini? Hanya PO
              dengan status draft yang dapat dihapus. Tindakan ini tidak dapat
              dibatalkan.
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

