"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CartItem } from "@/types";
import { CurrencyInput } from "@/components/ui/currency-input";
import CheckoutDetail from "./CheckoutDetail";

interface Product {
  id: string;
  name: string;
  sku?: string;
  stock: number;
  unit: string;
  sellingPrice: number;
  photo?: string;
  category: {
    id: string;
    name: string;
  };
}

export default function POSInterface() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    []
  );
  const [projectName, setProjectName] = useState("");
  const [showCheckoutDetail, setShowCheckoutDetail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any>(null);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [search, categoryFilter]);

  const fetchProducts = async () => {
    try {
      const url = `/api/products?search=${encodeURIComponent(search)}${
        categoryFilter && categoryFilter !== "all"
          ? `&categoryId=${categoryFilter}`
          : ""
      }`;
      const response = await fetch(url);
      const data = await response.json();
      if (response.ok) {
        setProducts(data.products.filter((p: Product) => p.stock > 0));
      }
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      const data = await response.json();
      if (response.ok) {
        setCategories(data.categories);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  const addToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.product.id === product.id);

    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        alert("Stok tidak mencukupi");
        return;
      }
      setCart(
        cart.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * Number(product.sellingPrice),
              }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          product,
          quantity: 1,
          subtotal: Number(product.sellingPrice),
        },
      ]);
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const item = cart.find((item) => item.product.id === productId);
    if (item && quantity > item.product.stock) {
      alert("Stok tidak mencukupi");
      return;
    }

    setCart(
      cart.map((item) =>
        item.product.id === productId
          ? {
              ...item,
              quantity,
              subtotal: quantity * Number(item.product.sellingPrice),
            }
          : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  const getTotal = () => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const handleContinue = () => {
    if (cart.length === 0) {
      alert("Keranjang kosong");
      return;
    }
    setShowCheckoutDetail(true);
  };

  const formatCurrency = (amount: number | string | any) => {
    // Convert to number if it's a string or Decimal
    let numAmount: number;
    if (typeof amount === "string") {
      numAmount = parseFloat(amount) || 0;
    } else if (amount && typeof amount === "object" && "toNumber" in amount) {
      // Handle Prisma Decimal type
      numAmount = parseFloat(amount.toString()) || 0;
    } else {
      numAmount = Number(amount) || 0;
    }

    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numAmount);
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Selection */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Pilih Produk</h2>

            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Cari produk..."
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">Semua Kategori</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
              {products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="p-3 border border-gray-200 rounded-lg hover:border-indigo-500 hover:shadow-md transition text-left"
                  disabled={product.stock === 0}
                >
                  {product.photo && (
                    <img
                      src={product.photo}
                      alt={product.name}
                      className="w-full h-24 object-cover rounded mb-2"
                    />
                  )}
                  <p className="font-medium text-sm text-gray-900 truncate">
                    {product.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatCurrency(product.sellingPrice)}
                  </p>
                  <p className="text-xs text-gray-400">
                    Stok: {product.stock} {product.unit}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cart */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 sticky top-6">
            <h2 className="text-xl font-bold mb-4">Keranjang</h2>

            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Keranjang kosong</p>
            ) : (
              <>
                <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
                  {cart.map((item) => (
                    <div key={item.product.id} className="border-b pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {item.product.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatCurrency(item.product.sellingPrice)}
                          </p>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-red-600 hover:text-red-800 ml-2"
                        >
                          ×
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() =>
                              updateQuantity(item.product.id, item.quantity - 1)
                            }
                            className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                          >
                            -
                          </button>
                          <span className="w-8 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(item.product.id, item.quantity + 1)
                            }
                            className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                          >
                            +
                          </button>
                        </div>
                        <p className="font-semibold">
                          {formatCurrency(item.subtotal)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nama Proyek (Opsional)
                    </label>
                    <input
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="Masukkan nama proyek"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>{formatCurrency(getTotal())}</span>
                  </div>

                  <button
                    onClick={handleContinue}
                    disabled={cart.length === 0}
                    className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    Lanjut
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Checkout Detail Modal */}
      {showCheckoutDetail && (
        <CheckoutDetail
          cart={cart}
          projectName={projectName}
          total={getTotal()}
          onBack={() => setShowCheckoutDetail(false)}
          onSuccess={(transaction) => {
            setLastTransaction(transaction);
            setCart([]);
            setProjectName("");
            setShowCheckoutDetail(false);
            setShowReceipt(true);
            fetchProducts();
          }}
        />
      )}

      {/* Receipt Modal */}
      {showReceipt && lastTransaction && (
        <>
          {/* Print-only receipt */}
          <div className="receipt-print" style={{ display: "none" }}>
            <h2>Struk Transaksi</h2>
            <div className="receipt-info">
              <div>
                <span>No. Invoice:</span>
                <span className="font-semibold">
                  {lastTransaction.invoiceNo}
                </span>
              </div>
              <div>
                <span>Tanggal:</span>
                <span>
                  {new Date(lastTransaction.createdAt).toLocaleString("id-ID")}
                </span>
              </div>
              <div>
                <span>Kasir:</span>
                <span>{lastTransaction.user.name}</span>
              </div>
              {lastTransaction.projectName && (
                <div>
                  <span>Proyek:</span>
                  <span>{lastTransaction.projectName}</span>
                </div>
              )}
            </div>
            {lastTransaction.note && (
              <>
                <hr />
                <div className="receipt-info">
                  <div>
                    <span>Keterangan:</span>
                    <span>{lastTransaction.note}</span>
                  </div>
                </div>
              </>
            )}
            <hr />
            {lastTransaction.items.map((item: any) => (
              <div key={item.id} className="receipt-item">
                <div className="receipt-item-name">{item.product.name}</div>
                <div className="receipt-item-detail">
                  {item.quantity} x {formatCurrency(item.price)}
                  {item.status && ` (${item.status})`}
                </div>
                <div className="receipt-item-price">
                  {formatCurrency(item.subtotal)}
                </div>
              </div>
            ))}
            <hr />
            <div className="receipt-total">
              <div>
                <span>Total:</span>
                <span>{formatCurrency(Number(lastTransaction.total))}</span>
              </div>
              <div>
                <span>Bayar:</span>
                <span>{formatCurrency(Number(lastTransaction.cash))}</span>
              </div>
            </div>
            <div className="receipt-change">
              <div>
                <span>Kembalian:</span>
                <span>{formatCurrency(Number(lastTransaction.change))}</span>
              </div>
            </div>
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
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold mb-4 text-center">
                Struk Transaksi
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>No. Invoice:</span>
                  <span className="font-semibold">
                    {lastTransaction.invoiceNo}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Tanggal:</span>
                  <span>
                    {new Date(lastTransaction.createdAt).toLocaleString(
                      "id-ID"
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Kasir:</span>
                  <span>{lastTransaction.user.name}</span>
                </div>
                {lastTransaction.projectName && (
                  <div className="flex justify-between">
                    <span>Proyek:</span>
                    <span>{lastTransaction.projectName}</span>
                  </div>
                )}
                {lastTransaction.note && (
                  <div className="flex justify-between">
                    <span>Keterangan:</span>
                    <span>{lastTransaction.note}</span>
                  </div>
                )}
                <hr className="my-3" />
                {lastTransaction.items.map((item: any) => (
                  <div key={item.id} className="flex justify-between">
                    <div>
                      <p className="font-medium">{item.product.name}</p>
                      <p className="text-xs text-gray-500">
                        {item.quantity} x {formatCurrency(item.price)}
                        {item.status && ` (${item.status})`}
                      </p>
                    </div>
                    <span>{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
                <hr className="my-3" />
                <div className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>{formatCurrency(Number(lastTransaction.total))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bayar:</span>
                  <span>{formatCurrency(Number(lastTransaction.cash))}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg">
                  <span>Kembalian:</span>
                  <span>{formatCurrency(Number(lastTransaction.change))}</span>
                </div>
              </div>
              <div className="mt-6 flex space-x-4">
                <button
                  onClick={() => {
                    window.print();
                  }}
                  className="flex-1 bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700"
                >
                  Print
                </button>
                <button
                  onClick={() => {
                    setShowReceipt(false);
                    setLastTransaction(null);
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
