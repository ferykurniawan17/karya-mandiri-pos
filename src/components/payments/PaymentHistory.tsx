"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AutocompleteSelect } from "@/components/ui/autocomplete-select";
import { Payment } from "@/types";
import PaymentAllocationDisplay from "./PaymentAllocationDisplay";
import { ChevronDown, ChevronUp } from "lucide-react";

interface PaymentHistoryProps {
  customerId?: string;
  transactionId?: string;
}

export default function PaymentHistory({
  customerId: initialCustomerId,
  transactionId: initialTransactionId,
}: PaymentHistoryProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState<string | undefined>(
    initialCustomerId
  );
  const [transactionId, setTransactionId] = useState<string | undefined>(
    initialTransactionId
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [customers, setCustomers] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [expandedPayments, setExpandedPayments] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [customerId, transactionId, startDate, endDate]);

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/customers");
      const data = await response.json();
      if (response.ok) {
        setCustomers(data.customers || []);
      }
    } catch (err) {
      console.error("Error fetching customers:", err);
    }
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (customerId) params.append("customerId", customerId);
      if (transactionId) params.append("transactionId", transactionId);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(`/api/payments?${params.toString()}`);
      const data = await response.json();
      if (response.ok) {
        setPayments(data.payments || []);
      }
    } catch (err) {
      console.error("Error fetching payments:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const toggleExpanded = (paymentId: string) => {
    setExpandedPayments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(paymentId)) {
        newSet.delete(paymentId);
      } else {
        newSet.add(paymentId);
      }
      return newSet;
    });
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: "Tunai",
      transfer: "Transfer",
      bank_transfer: "Bank Transfer",
      other: "Lainnya",
    };
    return labels[method] || method;
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Filter Riwayat Pembayaran</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {!initialCustomerId && (
            <div>
              <Label>Pelanggan</Label>
              <AutocompleteSelect
                options={customers.map((c) => ({ id: c.id, name: c.name }))}
                value={customerId}
                onValueChange={setCustomerId}
                placeholder="Semua pelanggan"
                searchPlaceholder="Cari pelanggan..."
              />
            </div>
          )}
          <div>
            <Label>Tanggal Mulai</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <Label>Tanggal Akhir</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="text-center py-8">Memuat data...</div>
        ) : payments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Tidak ada data pembayaran
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tanggal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pelanggan/Transaksi
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Jumlah
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Metode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Alokasi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.map((payment) => (
                  <>
                    <tr
                      key={payment.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleExpanded(payment.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(payment.paymentDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payment.customer ? (
                          <div>
                            <p className="font-medium">{payment.customer.name}</p>
                            <p className="text-xs text-gray-500">
                              {payment.customer.type === "individual"
                                ? "Perorangan"
                                : "Instansi"}
                            </p>
                          </div>
                        ) : payment.transaction ? (
                          <div>
                            <p className="font-medium">
                              {payment.transaction.invoiceNo}
                            </p>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-green-600">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getPaymentMethodLabel(payment.paymentMethod)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.user.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button className="flex items-center gap-1">
                          {expandedPayments.has(payment.id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                          <span>
                            {payment.allocations?.length || 0} transaksi
                          </span>
                        </button>
                      </td>
                    </tr>
                    {expandedPayments.has(payment.id) && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 bg-gray-50">
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700">
                              Detail Alokasi:
                            </p>
                            {payment.allocations && payment.allocations.length > 0 ? (
                              <PaymentAllocationDisplay
                                allocations={payment.allocations}
                              />
                            ) : (
                              <p className="text-sm text-gray-500">
                                Tidak ada alokasi
                              </p>
                            )}
                            {payment.note && (
                              <div className="mt-2 pt-2 border-t">
                                <p className="text-xs text-gray-500">
                                  <span className="font-medium">Catatan:</span>{" "}
                                  {payment.note}
                                </p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

