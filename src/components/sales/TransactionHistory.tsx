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
import { AutocompleteSelect } from "@/components/ui/autocomplete-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Customer, Project } from "@/types";
import { convertFromBaseUnit } from "@/lib/product-units";
import PaymentForm from "@/components/payments/PaymentForm";
import PaymentHistory from "@/components/payments/PaymentHistory";

interface Transaction {
  id: string;
  invoiceNo: string;
  total: number;
  cash: number;
  credit: number;
  remainingCredit?: number; // Sisa hutang setelah pembayaran
  change: number;
  paymentStatus: string;
  paymentMethod?: string;
  customerId?: string | null;
  customer?: Customer | null;
  projectId?: string | null;
  project?: Project | null;
  projectName?: string;
  note?: string;
  user: {
    name: string;
  };
  items: {
    id: string;
    product: {
      name: string;
    };
    quantity: number;
    price: number;
    subtotal: number;
    status?: string;
  }[];
  createdAt: Date;
}

export default function TransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentTransaction, setPaymentTransaction] = useState<
    Transaction | undefined
  >(undefined);

  // Filters
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<
    string | undefined
  >();
  const [selectedProjectId, setSelectedProjectId] = useState<
    string | undefined
  >();
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    fetchCustomers();
    fetchTransactions();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [
    selectedCustomerId,
    selectedProjectId,
    paymentStatusFilter,
    startDate,
    endDate,
    search,
  ]);

  useEffect(() => {
    if (selectedCustomerId) {
      fetchProjectsForCustomer(selectedCustomerId);
    } else {
      setProjects([]);
      setSelectedProjectId(undefined);
    }
  }, [selectedCustomerId]);

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/customers");
      const data = await response.json();
      if (response.ok) {
        setCustomers(data.customers);
      }
    } catch (err) {
      console.error("Error fetching customers:", err);
    }
  };

  const fetchProjectsForCustomer = async (customerId: string) => {
    try {
      const response = await fetch(`/api/customers/${customerId}/projects`);
      const data = await response.json();
      if (response.ok) {
        setProjects(data.projects);
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCustomerId) params.append("customerId", selectedCustomerId);
      if (selectedProjectId) params.append("projectId", selectedProjectId);
      if (paymentStatusFilter !== "all")
        params.append("paymentStatus", paymentStatusFilter);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (search) params.append("search", search);
      params.append("limit", "100");

      const response = await fetch(`/api/transactions?${params.toString()}`);
      const data = await response.json();
      if (response.ok) {
        // Debug: Check customer and project data
        if (data.transactions && data.transactions.length > 0) {
          const sample = data.transactions[0];
          console.log("[DEBUG Frontend] Sample transaction:", {
            invoiceNo: sample.invoiceNo,
            customerId: sample.customerId,
            customer: sample.customer,
            project: sample.project,
          });
        }
        setTransactions(data.transactions);
      }
      setLoading(false);
    } catch (err) {
      console.error("Error fetching transactions:", err);
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setSelectedCustomerId(undefined);
    setSelectedProjectId(undefined);
    setPaymentStatusFilter("all");
    setStartDate("");
    setEndDate("");
    setSearch("");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getPaymentStatusBadge = (status: string) => {
    const styles = {
      paid: "bg-green-100 text-green-800",
      unpaid: "bg-red-100 text-red-800",
      partial: "bg-yellow-100 text-yellow-800",
    };
    const labels = {
      paid: "Lunas",
      unpaid: "Hutang",
      partial: "Cicilan",
    };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          styles[status as keyof typeof styles] || "bg-gray-100 text-gray-800"
        }`}
      >
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Memuat...</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Filter Transaksi</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <Label>Pelanggan</Label>
            <AutocompleteSelect
              options={customers.map((c) => ({ id: c.id, name: c.name }))}
              value={selectedCustomerId}
              onValueChange={(value) => {
                setSelectedCustomerId(value);
                setSelectedProjectId(undefined);
              }}
              placeholder="Semua pelanggan..."
              searchPlaceholder="Cari pelanggan..."
              className="mt-1"
            />
          </div>

          <div>
            <Label>Proyek</Label>
            <AutocompleteSelect
              options={projects.map((p) => ({ id: p.id, name: p.name }))}
              value={selectedProjectId}
              onValueChange={setSelectedProjectId}
              placeholder="Semua proyek..."
              searchPlaceholder="Cari proyek..."
              className="mt-1"
              disabled={!selectedCustomerId}
            />
          </div>

          <div>
            <Label>Status Pembayaran</Label>
            <Select
              value={paymentStatusFilter}
              onValueChange={setPaymentStatusFilter}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="paid">Lunas</SelectItem>
                <SelectItem value="unpaid">Hutang</SelectItem>
                <SelectItem value="partial">Cicilan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Tanggal Mulai</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Tanggal Akhir</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Cari Invoice</Label>
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="No. Invoice..."
              className="mt-1"
            />
          </div>
        </div>

        <div className="mt-4">
          <Button variant="outline" onClick={resetFilters}>
            Reset Filter
          </Button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {transactions.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            {loading
              ? "Memuat..."
              : "Tidak ada transaksi yang sesuai dengan filter"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tanggal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pelanggan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proyek
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tunai
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hutang
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Metode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kasir
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {transaction.invoiceNo}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(transaction.createdAt).toLocaleDateString(
                          "id-ID"
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(transaction.createdAt).toLocaleTimeString(
                          "id-ID",
                          { hour: "2-digit", minute: "2-digit" }
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {transaction.customer?.name || "-"}
                      </div>
                      {transaction.customer && (
                        <div className="text-xs text-gray-500">
                          {transaction.customer.type === "individual"
                            ? "Perorangan"
                            : "Instansi"}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {transaction.project?.name ||
                          transaction.projectName ||
                          "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatCurrency(transaction.total)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {formatCurrency(transaction.cash)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {formatCurrency(
                          transaction.remainingCredit !== undefined
                            ? transaction.remainingCredit
                            : transaction.credit
                        )}
                      </div>
                      {transaction.remainingCredit !== undefined &&
                        transaction.remainingCredit < transaction.credit && (
                          <div className="text-xs text-gray-400">
                            dari {formatCurrency(transaction.credit)}
                          </div>
                        )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPaymentStatusBadge(transaction.paymentStatus)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {transaction.paymentMethod
                          ? transaction.paymentMethod === "cash"
                            ? "Tunai"
                            : transaction.paymentMethod === "transfer"
                            ? "Transfer"
                            : transaction.paymentMethod === "credit"
                            ? "Kredit"
                            : transaction.paymentMethod === "mixed"
                            ? "Campuran"
                            : transaction.paymentMethod
                          : "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {transaction.user.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {(transaction.remainingCredit !== undefined
                          ? transaction.remainingCredit > 0
                          : transaction.credit > 0) && (
                          <button
                            onClick={() => {
                              // Use remainingCredit if available, otherwise use credit
                              const remainingCredit =
                                transaction.remainingCredit !== undefined
                                  ? transaction.remainingCredit
                                  : transaction.credit;
                              const transactionWithRemainingCredit = {
                                ...transaction,
                                remainingCredit: remainingCredit,
                              };
                              setPaymentTransaction(
                                transactionWithRemainingCredit
                              );
                              setShowPaymentModal(true);
                            }}
                            className="text-red-600 hover:text-red-900 font-medium"
                          >
                            Bayar Hutang
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedTransaction(transaction)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Detail
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedTransaction && (
        <>
          {/* Print-only receipt */}
          <div className="receipt-print" style={{ display: "none" }}>
            <h2>Struk Transaksi</h2>
            <div className="receipt-info">
              <div>
                <span>No. Invoice:</span>
                <span className="font-semibold">
                  {selectedTransaction.invoiceNo}
                </span>
              </div>
              <div>
                <span>Tanggal:</span>
                <span>
                  {new Date(selectedTransaction.createdAt).toLocaleString(
                    "id-ID"
                  )}
                </span>
              </div>
              <div>
                <span>Kasir:</span>
                <span>{selectedTransaction.user.name}</span>
              </div>
              <div>
                <span>Pelanggan:</span>
                <span>
                  {selectedTransaction.customer ? (
                    <>
                      {selectedTransaction.customer.name} (
                      {selectedTransaction.customer.type === "individual"
                        ? "Perorangan"
                        : "Instansi"}
                      )
                    </>
                  ) : (
                    "-"
                  )}
                </span>
              </div>
              <div>
                <span>Proyek:</span>
                <span>
                  {selectedTransaction.project?.name ||
                    selectedTransaction.projectName ||
                    "-"}
                </span>
              </div>
            </div>
            {selectedTransaction.note && (
              <>
                <hr />
                <div className="receipt-info">
                  <div>
                    <span>Keterangan:</span>
                    <span>{selectedTransaction.note}</span>
                  </div>
                </div>
              </>
            )}
            <hr />
            {selectedTransaction.items.map((item: any) => {
              // Determine the unit, quantity, and price to display
              let displayQuantity = Number(item.quantity);
              let displayUnit = item.product.baseUnit || item.product.unit;
              let displayPrice = Number(item.price);

              if (item.sellingUnit) {
                displayQuantity = convertFromBaseUnit(
                  displayQuantity,
                  item.sellingUnit
                );
                displayUnit = item.sellingUnit.unit;
                displayPrice = Number(item.sellingUnit.sellingPrice);
              }

              const formattedQuantity = displayQuantity.toLocaleString(
                "id-ID",
                {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 3,
                  useGrouping: false,
                }
              );

              return (
                <div key={item.id} className="receipt-item">
                  <div className="receipt-item-name">{item.product.name}</div>
                  <div className="receipt-item-detail">
                    {formattedQuantity} {displayUnit} x{" "}
                    {formatCurrency(displayPrice)}
                    {item.status && ` (${item.status})`}
                  </div>
                  <div className="receipt-item-price">
                    {formatCurrency(item.subtotal)}
                  </div>
                </div>
              );
            })}
            <hr />
            <div className="receipt-total">
              <div>
                <span>Total:</span>
                <span>{formatCurrency(selectedTransaction.total)}</span>
              </div>
              <div>
                <span>Bayar:</span>
                <span>{formatCurrency(selectedTransaction.cash)}</span>
              </div>
            </div>
            {selectedTransaction.change > 0 && (
              <div className="receipt-change">
                <div>
                  <span>Kembalian:</span>
                  <span>{formatCurrency(selectedTransaction.change)}</span>
                </div>
              </div>
            )}
            <hr />
            <div
              style={{
                textAlign: "center",
                marginTop: "8px",
                fontSize: "10px",
              }}
            >
              Terima Kasih
            </div>
          </div>

          {/* Screen display */}
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 no-print">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4">Detail Transaksi</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>No. Invoice:</span>
                  <span className="font-semibold">
                    {selectedTransaction.invoiceNo}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Tanggal:</span>
                  <span>
                    {new Date(selectedTransaction.createdAt).toLocaleString(
                      "id-ID"
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Kasir:</span>
                  <span>{selectedTransaction.user.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pelanggan:</span>
                  <span>
                    {selectedTransaction.customer ? (
                      <>
                        {selectedTransaction.customer.name} (
                        {selectedTransaction.customer.type === "individual"
                          ? "Perorangan"
                          : "Instansi"}
                        )
                      </>
                    ) : (
                      "-"
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Proyek:</span>
                  <span>
                    {selectedTransaction.project?.name ||
                      selectedTransaction.projectName ||
                      "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Status Pembayaran:</span>
                  <span>
                    {getPaymentStatusBadge(selectedTransaction.paymentStatus)}
                  </span>
                </div>
                {selectedTransaction.paymentMethod && (
                  <div className="flex justify-between">
                    <span>Metode Pembayaran:</span>
                    <span>
                      {selectedTransaction.paymentMethod === "cash"
                        ? "Tunai"
                        : selectedTransaction.paymentMethod === "transfer"
                        ? "Transfer"
                        : selectedTransaction.paymentMethod === "credit"
                        ? "Kredit"
                        : selectedTransaction.paymentMethod === "mixed"
                        ? "Campuran"
                        : selectedTransaction.paymentMethod}
                    </span>
                  </div>
                )}
                {selectedTransaction.note && (
                  <div className="flex justify-between">
                    <span>Keterangan:</span>
                    <span>{selectedTransaction.note}</span>
                  </div>
                )}
                <hr className="my-3" />
                <div className="font-semibold mb-2">Item Transaksi:</div>
                {selectedTransaction.items.map((item: any) => {
                  // Determine the unit, quantity, and price to display
                  // If sellingUnit exists, show quantity in selling unit, otherwise show in base unit
                  let displayQuantity = Number(item.quantity);
                  let displayUnit = item.product.baseUnit || item.product.unit;
                  let displayPrice = Number(item.price);

                  if (item.sellingUnit) {
                    // Convert from base unit to selling unit for display
                    displayQuantity = convertFromBaseUnit(
                      displayQuantity,
                      item.sellingUnit
                    );
                    displayUnit = item.sellingUnit.unit;
                    // Use selling unit price, not the stored price (which might be custom)
                    displayPrice = Number(item.sellingUnit.sellingPrice);
                  }

                  // Format quantity with Indonesian locale (comma as decimal separator)
                  const formattedQuantity = displayQuantity.toLocaleString(
                    "id-ID",
                    {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 3,
                      useGrouping: false,
                    }
                  );

                  return (
                    <div
                      key={item.id}
                      className="flex justify-between border-b pb-2"
                    >
                      <div>
                        <p className="font-medium">{item.product.name}</p>
                        <p className="text-xs text-gray-500">
                          {formattedQuantity} {displayUnit} x{" "}
                          {formatCurrency(displayPrice)}
                          {item.status && ` (${item.status})`}
                        </p>
                      </div>
                      <span>{formatCurrency(item.subtotal)}</span>
                    </div>
                  );
                })}
                <hr className="my-3" />
                <div className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>{formatCurrency(selectedTransaction.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tunai:</span>
                  <span>{formatCurrency(selectedTransaction.cash)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Hutang:</span>
                  <span>
                    {formatCurrency(
                      selectedTransaction.remainingCredit !== undefined
                        ? selectedTransaction.remainingCredit
                        : selectedTransaction.credit
                    )}
                    {selectedTransaction.remainingCredit !== undefined &&
                      selectedTransaction.remainingCredit <
                        selectedTransaction.credit && (
                        <span className="text-gray-400 text-sm ml-2">
                          (dari {formatCurrency(selectedTransaction.credit)})
                        </span>
                      )}
                  </span>
                </div>
                {selectedTransaction.change > 0 && (
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Kembalian:</span>
                    <span>{formatCurrency(selectedTransaction.change)}</span>
                  </div>
                )}
              </div>
              <div className="mt-6 flex space-x-4">
                <button
                  onClick={() => {
                    window.print();
                  }}
                  className="flex-1 bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700"
                >
                  Print Struk
                </button>
                <button
                  onClick={() => setSelectedTransaction(null)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bayar Hutang</DialogTitle>
          </DialogHeader>
          <PaymentForm
            mode="transaction"
            transaction={paymentTransaction}
            onSuccess={(payment) => {
              setShowPaymentModal(false);
              setPaymentTransaction(undefined);
              fetchTransactions();
              alert("Pembayaran berhasil dicatat");
            }}
            onCancel={() => {
              setShowPaymentModal(false);
              setPaymentTransaction(undefined);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
