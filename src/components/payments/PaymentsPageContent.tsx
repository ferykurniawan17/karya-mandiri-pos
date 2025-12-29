"use client";

import { useState } from "react";
import PaymentForm from "@/components/payments/PaymentForm";
import PaymentHistory from "@/components/payments/PaymentHistory";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function PaymentsPageContent() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handlePaymentSuccess = (payment: any) => {
    alert("Pembayaran berhasil dicatat");
    setIsModalOpen(false);
    window.location.reload();
  };

  return (
    <div className="w-full py-6 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Riwayat Pembayaran
            </h2>
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Catat Pembayaran
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Catat Pembayaran</DialogTitle>
                </DialogHeader>
                <PaymentForm
                  mode="customer"
                  onSuccess={handlePaymentSuccess}
                  onCancel={() => setIsModalOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
          <PaymentHistory />
        </div>
      </div>
    </div>
  );
}

