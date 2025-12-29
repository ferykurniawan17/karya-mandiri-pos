"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShoppingCart,
  Package,
  Folder,
  Receipt,
  Tag,
  Award,
  Users,
  Truck,
  FileText,
  BarChart3,
  CreditCard,
} from "lucide-react";
import SyncStatus from "@/components/sync/SyncStatus";

interface SidebarProps {
  isCollapsed: boolean;
  userRole?: string;
}

export default function Sidebar({ isCollapsed, userRole }: SidebarProps) {
  const pathname = usePathname();

  const menuItems = [
    {
      href: "/products",
      icon: Package,
      label: "Produk",
      description: "Kelola produk dan stok",
      color: "text-green-600",
    },
    {
      href: "/categories",
      icon: Folder,
      label: "Kategori",
      description: "Kelola kategori barang",
      color: "text-purple-600",
    },
    {
      href: "/transactions",
      icon: Receipt,
      label: "Transaksi",
      description: "Riwayat transaksi",
      color: "text-orange-600",
    },
    {
      href: "/payments",
      icon: CreditCard,
      label: "Pembayaran Hutang",
      description: "Kelola pembayaran hutang",
      color: "text-red-600",
    },
    {
      href: "/tags",
      icon: Tag,
      label: "Tags",
      description: "Kelola tag produk",
      color: "text-pink-600",
    },
    {
      href: "/brands",
      icon: Award,
      label: "Brands",
      description: "Kelola brand produk",
      color: "text-yellow-600",
    },
    {
      href: "/customers",
      icon: Users,
      label: "Pelanggan",
      description: "Kelola pelanggan dan proyek",
      color: "text-teal-600",
    },
    {
      href: "/providers",
      icon: Truck,
      label: "Provider",
      description: "Kelola provider barang",
      color: "text-cyan-600",
    },
    {
      href: "/purchase-orders",
      icon: FileText,
      label: "Purchase Order",
      description: "Kelola pembelian barang masuk",
      color: "text-red-600",
    },
    ...(userRole === "admin"
      ? [
          {
            href: "/users",
            icon: Users,
            label: "Pengguna",
            description: "Kelola pengguna",
            color: "text-indigo-600",
          },
        ]
      : []),
    {
      href: "/reports/sales",
      icon: BarChart3,
      label: "Laporan",
      description: "Laporan penjualan, pembelian, dan analitik",
      color: "text-violet-600",
    },
  ];

  return (
    <aside
      className={`bg-white shadow-lg transition-all duration-300 flex-shrink-0 ${
        isCollapsed ? "w-0 overflow-hidden" : "w-80"
      }`}
    >
      <div className={`h-full overflow-y-auto ${isCollapsed ? "opacity-0" : "opacity-100"} transition-opacity duration-300`}>
        <div className="p-6">
          {/* Featured POS Menu */}
          <div className="mb-6 relative overflow-hidden">
            <Link
              href="/pos"
              className={`block relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-6 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] group ${
                pathname === "/pos" ? "ring-2 ring-blue-400" : ""
              }`}
            >
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-2xl"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mb-16 blur-xl"></div>

              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-3">
                  <div className="bg-white/25 backdrop-blur-sm p-3 rounded-xl shadow-lg group-hover:bg-white/30 transition-all">
                    <ShoppingCart className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      Point of Sale
                    </h2>
                    <p className="text-blue-100 text-sm mt-1">
                      Sistem transaksi cepat
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Menu Items */}
          <div className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors group ${
                    isActive
                      ? "bg-blue-50 border-l-4 border-blue-600"
                      : "hover:bg-gray-100"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${item.color} group-hover:scale-110 transition-transform`}
                  />
                  <div>
                    <h3
                      className={`font-semibold ${
                        isActive ? "text-blue-900" : "text-gray-900"
                      }`}
                    >
                      {item.label}
                    </h3>
                    <p className="text-xs text-gray-500">{item.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Sync Status at bottom of sidebar */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <SyncStatus />
          </div>
        </div>
      </div>
    </aside>
  );
}

