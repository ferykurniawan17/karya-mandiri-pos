"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CartItem, POSSession, Customer, Project, Product, ProductSellingUnit } from "@/types";
import { CurrencyInput } from "@/components/ui/currency-input";
import CheckoutDetail from "./CheckoutDetail";
import { PriceEditModal } from "@/components/ui/price-edit-modal";
import { AutocompleteSelect } from "@/components/ui/autocomplete-select";
import UnitSelector from "./UnitSelector";
import { hasMultipleSellingUnits, getDefaultSellingUnit, calculateQuantityFromPrice, getEffectiveStock, convertToBaseUnit, convertFromBaseUnit, getEffectiveUnit } from "@/lib/product-units";
import { validateNumberInput, formatNumberForInput } from "@/lib/utils";
import { X, Pencil } from "lucide-react";

const STORAGE_KEY = "pos_sessions";
const LAST_ACTIVE_KEY = "pos_last_active_session";

export default function POSInterface() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [sessions, setSessions] = useState<POSSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    []
  );
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [unitSelectorProduct, setUnitSelectorProduct] = useState<Product | null>(null);
  const [showUnitSelector, setShowUnitSelector] = useState(false);
  const [showCheckoutDetail, setShowCheckoutDetail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [editingPriceProductId, setEditingPriceProductId] = useState<string | null>(null);

  // Initialize with default session or load from storage
  useEffect(() => {
    loadSessionsFromStorage();
    fetchProducts();
    fetchCategories();
    fetchCustomers();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [search, categoryFilter]);

  // Ensure at least one session exists and activeSessionId is valid (only after initialization)
  useEffect(() => {
    if (!isInitialized) {
      return; // Don't create new session until we've tried loading from storage
    }

    if (sessions.length === 0) {
      createNewSession();
      return;
    }
    
    // If activeSessionId is invalid or not set, switch to first session
    if (!activeSessionId || !sessions.find((s) => s.id === activeSessionId)) {
      const firstSession = sessions[0];
      if (firstSession && activeSessionId !== firstSession.id) {
        setActiveSessionId(firstSession.id);
        setSessions((prev) =>
          prev.map((s) => ({
            ...s,
            isActive: s.id === firstSession.id,
          }))
        );
      }
    }
  }, [sessions.length, activeSessionId, isInitialized]);

  // Auto-save sessions to localStorage
  useEffect(() => {
    if (sessions.length > 0) {
      saveSessionsToStorage();
    }
  }, [sessions]);

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
        // Filter and ensure all required Product fields are present
        const validProducts = data.products.filter((p: any) => 
          p.stock > 0 && 
          p.id && 
          p.name && 
          p.stock !== undefined && 
          p.minimalStock !== undefined && 
          p.unit && 
          p.purchasePrice !== undefined && 
          p.sellingPrice !== undefined && 
          p.categoryId && 
          p.category &&
          p.createdAt &&
          p.updatedAt
        ) as Product[];
        setProducts(validProducts);
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

  const fetchProjects = async (customerId: string) => {
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

  // LocalStorage functions
  const saveSessionsToStorage = () => {
    try {
      const sessionsToSave = sessions.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionsToSave));
      if (activeSessionId) {
        localStorage.setItem(LAST_ACTIVE_KEY, activeSessionId);
      }
    } catch (err) {
      console.error("Error saving sessions to storage:", err);
    }
  };

  const loadSessionsFromStorage = () => {
    try {
      const savedSessions = localStorage.getItem(STORAGE_KEY);
      const lastActive = localStorage.getItem(LAST_ACTIVE_KEY);

      if (savedSessions) {
        const parsed = JSON.parse(savedSessions).map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt),
        })) as POSSession[];

        if (parsed.length > 0) {
          setSessions(parsed);
          setActiveSessionId(lastActive || parsed[0].id);
          setIsInitialized(true);
          return; // Don't create new session if we loaded existing ones
        }
      }
      
      // Only create new session if no saved sessions found
      createNewSession();
      setIsInitialized(true);
    } catch (err) {
      console.error("Error loading sessions from storage:", err);
      createNewSession();
      setIsInitialized(true);
    }
  };

  // Session management functions
  const createNewSession = () => {
    const newSession: POSSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      cart: [],
      projectName: "",
      customerId: undefined,
      projectId: undefined,
      createdAt: new Date(),
      isActive: true,
    };

    setSessions((prev) => {
      const updated = prev.map((s) => ({ ...s, isActive: false }));
      return [...updated, newSession];
    });
    setActiveSessionId(newSession.id);
  };

  const switchSession = (sessionId: string) => {
    const sessionExists = sessions.find((s) => s.id === sessionId);
    if (!sessionExists) {
      // If session doesn't exist, switch to first available or create new
      if (sessions.length > 0) {
        setActiveSessionId(sessions[0].id);
        setSessions((prev) =>
          prev.map((s) => ({
            ...s,
            isActive: s.id === sessions[0].id,
          }))
        );
      } else {
        createNewSession();
      }
      return;
    }
    setSessions((prev) =>
      prev.map((s) => ({
        ...s,
        isActive: s.id === sessionId,
      }))
    );
    setActiveSessionId(sessionId);
  };

  const closeSession = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    
    // If only one tab exists, reset cart and projectName instead of closing
    if (sessions.length === 1) {
      if (session && session.cart.length > 0) {
        if (
          !confirm(
            "Yakin ingin mengosongkan keranjang?"
          )
        ) {
          return;
        }
      }
      // Reset cart and projectName for the single session
      updateActiveSession((session) => ({
        ...session,
        cart: [],
        projectName: "",
      }));
      return;
    }

    // If multiple tabs exist, proceed with normal close logic
    if (session && session.cart.length > 0) {
      if (
        !confirm(
          "Tab ini memiliki item di keranjang. Yakin ingin menutup tab ini?"
        )
      ) {
        return;
      }
    }

    const remainingSessions = sessions.filter((s) => s.id !== sessionId);

    if (remainingSessions.length === 0) {
      // If all tabs closed, create a new one
      createNewSession();
    } else {
      setSessions(remainingSessions);
      // Switch to another session if closing active one
      if (activeSessionId === sessionId) {
        const nextSession = remainingSessions[0];
        setActiveSessionId(nextSession.id);
        switchSession(nextSession.id);
      }
    }
  };

  // Get active session helpers
  const getActiveSession = (): POSSession | null => {
    const session = sessions.find((s) => s.id === activeSessionId);
    // Safety check: if activeSessionId doesn't match any session, use first session
    if (!session && sessions.length > 0) {
      // Update activeSessionId to first session (will trigger re-render)
      if (activeSessionId !== sessions[0].id) {
        setActiveSessionId(sessions[0].id);
      }
      return sessions[0];
    }
    return session || null;
  };

  const getActiveCart = (): CartItem[] => {
    const active = getActiveSession();
    return active?.cart || [];
  };

  const getActiveProjectName = (): string => {
    const active = getActiveSession();
    return active?.projectName || "";
  };

  const getActiveCustomerId = (): string | undefined => {
    const active = getActiveSession();
    return active?.customerId;
  };

  const getActiveProjectId = (): string | undefined => {
    const active = getActiveSession();
    return active?.projectId;
  };

  const updateCustomer = async (customerId: string | undefined) => {
    updateActiveSession((session) => {
      const updated = {
        ...session,
        customerId,
        projectId: undefined, // Reset project when customer changes
      };
      
      // If customer selected, fetch projects and auto-select default
      if (customerId) {
        fetchProjects(customerId).then(() => {
          // Auto-select default project after projects are loaded
          // This will be handled in useEffect
        });
      } else {
        setProjects([]);
      }
      
      return updated;
    });
  };

  // Auto-select default project when projects are loaded and customer is selected
  useEffect(() => {
    const activeCustomerId = getActiveCustomerId();
    if (activeCustomerId && projects.length > 0) {
      const defaultProject = projects.find((p) => p.isDefault && p.customerId === activeCustomerId);
      const currentProjectId = getActiveProjectId();
      if (defaultProject && !currentProjectId) {
        updateActiveSession((session) => ({
          ...session,
          projectId: defaultProject.id,
          projectName: defaultProject.name,
        }));
      }
    }
  }, [projects, activeSessionId]);

  const updateProject = (projectId: string | undefined) => {
    updateActiveSession((session) => {
      const selectedProject = projects.find((p) => p.id === projectId);
      return {
        ...session,
        projectId,
        projectName: selectedProject?.name || session.projectName,
      };
    });
  };

  // Update active session
  const updateActiveSession = (updater: (session: POSSession) => POSSession) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === activeSessionId ? updater(s) : s))
    );
  };

  // Helper function to get item price (custom or original)
  const getItemPrice = (item: CartItem): number => {
    if (item.customPrice !== undefined) {
      return item.customPrice;
    }
    if (item.sellingUnit) {
      return Number(item.sellingUnit.sellingPrice);
    }
    return Number(item.product.sellingPrice);
  };

  // Cart operations
  const addToCart = (product: Product) => {
    if (!activeSessionId) {
      createNewSession();
      return;
    }

    // Check if product has multiple selling units
    if (hasMultipleSellingUnits(product)) {
      setUnitSelectorProduct(product);
      setShowUnitSelector(true);
      return;
    }

    // For simple products, use default selling unit or product price
    const defaultUnit = getDefaultSellingUnit(product);
    addToCartWithUnit(product, defaultUnit, 1);
  };

  const addToCartWithUnit = (
    product: Product,
    sellingUnit: ProductSellingUnit | null,
    quantity: number,
    priceBasedAmount?: number
  ) => {
    if (!activeSessionId) {
      createNewSession();
      return;
    }

    const activeCart = getActiveCart();
    const existingItem = activeCart.find(
      (item) => item.product.id === product.id && item.sellingUnitId === sellingUnit?.id
    );

    // Calculate effective quantity and price
    // Quantity should always be in base unit for storage
    // Ensure quantity is a number
    const quantityNum = typeof quantity === 'string' ? parseFloat(quantity) : Number(quantity);
    let effectiveQuantity = quantityNum; // Initially in selling unit if sellingUnit exists
    let itemPrice = sellingUnit ? Number(sellingUnit.sellingPrice) : Number(product.sellingPrice);
    
    if (priceBasedAmount && sellingUnit && sellingUnit.allowPriceBased) {
      // Calculate quantity from price - already returns base unit
      effectiveQuantity = calculateQuantityFromPrice(priceBasedAmount, sellingUnit);
      itemPrice = priceBasedAmount / effectiveQuantity;
    } else if (sellingUnit) {
      // Convert selling unit quantity to base unit
      effectiveQuantity = convertToBaseUnit(quantityNum, sellingUnit);
    }
    
    // Ensure effectiveQuantity is a valid number
    if (isNaN(effectiveQuantity) || effectiveQuantity <= 0) {
      alert("Quantity tidak valid");
      return;
    }

    // Check stock (all quantities are already in base unit)
    const effectiveStock = getEffectiveStock(product);
    const totalInCarts = sessions.reduce((sum, session) => {
      const item = session.cart.find(
        (i) => i.product.id === product.id && i.sellingUnitId === sellingUnit?.id
      );
      if (!item) return sum;
      // Quantity is always stored in base unit
      return sum + item.quantity;
    }, 0);

    if (existingItem) {
      const newQuantity = existingItem.quantity + effectiveQuantity; // Both already in base unit
      if (totalInCarts + effectiveQuantity > effectiveStock) {
        alert("Stok tidak mencukupi");
        return;
      }
      updateActiveSession((session) => ({
        ...session,
        cart: session.cart.map((item) => {
          if (item.product.id === product.id && item.sellingUnitId === sellingUnit?.id) {
            // For price-based, use priceBasedAmount as subtotal, otherwise calculate from base quantity
            const finalPrice = priceBasedAmount 
              ? priceBasedAmount 
              : sellingUnit 
                ? (convertFromBaseUnit(newQuantity, sellingUnit) * itemPrice)
                : (newQuantity * itemPrice);
            return {
              ...item,
              quantity: Number(newQuantity), // Always in base unit as number
              subtotal: Number(finalPrice),
              priceBasedAmount: priceBasedAmount ? Number(priceBasedAmount) : item.priceBasedAmount,
            };
          }
          return item;
        }),
      }));
    } else {
      if (totalInCarts + effectiveQuantity > effectiveStock) {
        alert("Stok tidak mencukupi");
        return;
      }
      // For price-based, subtotal is the priceBasedAmount
      // For normal, calculate from quantity in base unit converted back to selling unit
      const subtotal = priceBasedAmount 
        ? priceBasedAmount 
        : sellingUnit 
          ? (convertFromBaseUnit(effectiveQuantity, sellingUnit) * itemPrice)
          : (effectiveQuantity * itemPrice);
      
      const newCartItem: CartItem = {
        product,
        quantity: Number(effectiveQuantity), // Always stored in base unit as number
        subtotal: Number(subtotal),
        sellingUnitId: sellingUnit?.id,
        sellingUnit: sellingUnit || undefined,
        priceBasedAmount: priceBasedAmount ? Number(priceBasedAmount) : undefined,
      };
      updateActiveSession((session) => ({
        ...session,
        cart: [...session.cart, newCartItem],
      }));
    }

    setShowUnitSelector(false);
    setUnitSelectorProduct(null);
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const activeCart = getActiveCart();
    const item = activeCart.find((item) => item.product.id === productId);
    if (!item) {
      return;
    }

    // Quantity is always in base unit
    const baseQuantity = quantity;

    // Check stock across all sessions (excluding current session's current quantity)
    const effectiveStock = getEffectiveStock(item.product);
    const totalInOtherSessions = sessions
      .filter((s) => s.id !== activeSessionId)
      .reduce((sum, session) => {
        const sessionItem = session.cart.find((i) => i.product.id === productId);
        return sum + (sessionItem?.quantity || 0); // Already in base unit
      }, 0);

    // Check if new quantity + other sessions would exceed stock
    if (baseQuantity + totalInOtherSessions > effectiveStock) {
      alert("Stok tidak mencukupi");
      return;
    }

    updateActiveSession((session) => ({
      ...session,
      cart: session.cart.map((cartItem) => {
        if (cartItem.product.id === productId) {
          const itemPrice = getItemPrice(cartItem);
          // Calculate subtotal: if has selling unit, convert base quantity back to selling unit for price calculation
          let subtotal = baseQuantity * itemPrice;
          if (cartItem.sellingUnit) {
            const quantityInSellingUnit = convertFromBaseUnit(baseQuantity, cartItem.sellingUnit);
            subtotal = quantityInSellingUnit * itemPrice;
          }
          // For price-based items, keep the original priceBasedAmount
          if (cartItem.priceBasedAmount) {
            subtotal = cartItem.priceBasedAmount;
          }
          return {
            ...cartItem,
            quantity: baseQuantity, // Always in base unit
            subtotal,
          };
        }
        return cartItem;
      }),
    }));
  };

  const removeFromCart = (productId: string) => {
    updateActiveSession((session) => ({
      ...session,
      cart: session.cart.filter((item) => item.product.id !== productId),
    }));
  };

  const updateItemPrice = (productId: string, customPrice: number | undefined) => {
    updateActiveSession((session) => ({
      ...session,
      cart: session.cart.map((item) => {
        if (item.product.id === productId) {
          const itemPrice = customPrice !== undefined ? customPrice : Number(item.product.sellingPrice);
          return {
            ...item,
            customPrice,
            subtotal: item.quantity * itemPrice,
          };
        }
        return item;
      }),
    }));
  };

  const resetItemPrice = (productId: string) => {
    updateItemPrice(productId, undefined);
  };

  const updateProjectName = (projectName: string) => {
    updateActiveSession((session) => ({
      ...session,
      projectName,
    }));
  };

  const getTotal = () => {
    const activeCart = getActiveCart();
    return activeCart.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const handleContinue = () => {
    const activeCart = getActiveCart();
    if (activeCart.length === 0) {
      alert("Keranjang kosong");
      return;
    }
    setShowCheckoutDetail(true);
  };

  const formatCurrency = (amount: number | string | any) => {
    let numAmount: number;
    if (typeof amount === "string") {
      numAmount = parseFloat(amount) || 0;
    } else if (amount && typeof amount === "object" && "toNumber" in amount) {
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

  const getSessionDisplayName = (session: POSSession, index: number) => {
    if (session.projectName && session.projectName.trim() !== "") {
      return session.projectName;
    }
    return session.customerName || `Pelanggan ${index + 1}`;
  };

  const getItemCount = (session: POSSession) => {
    return session.cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  const activeCart = getActiveCart();
  const activeProjectName = getActiveProjectName();

  return (
    <div className="px-4 py-6 sm:px-0">
      {/* Tab Bar */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto">
          {sessions.map((session, index) => {
            const itemCount = getItemCount(session);
            const isActive = session.id === activeSessionId;
            return (
              <div
                key={session.id}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 min-w-[120px] cursor-pointer transition-colors ${
                  isActive
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
                onClick={() => switchSession(session.id)}
              >
                <span className="text-sm font-medium truncate">
                  {getSessionDisplayName(session, index)}
                </span>
                {itemCount > 0 && (
                  <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {itemCount}
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeSession(session.id);
                  }}
                  className="ml-1 text-gray-400 hover:text-red-600 transition-colors"
                  disabled={showCheckoutDetail}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
          <button
            onClick={createNewSession}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm whitespace-nowrap"
          >
            + Tab Baru
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Selection */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
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

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                      className="w-full h-40 object-contain rounded mb-2 bg-gray-50"
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

            {activeCart.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Keranjang kosong</p>
            ) : (
              <>
                <div className="space-y-3 max-h-[500px] overflow-y-auto mb-4">
                  {activeCart.map((item) => {
                    const itemPrice = getItemPrice(item);
                    const hasCustomPrice = item.customPrice !== undefined;
                    return (
                      <div key={item.product.id} className="border-b pb-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">
                                {item.product.name}
                              </p>
                              {hasCustomPrice && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                  Harga Diubah
                                </span>
                              )}
                            </div>
                            <div className="mt-1">
                              {item.sellingUnit && (
                                <p className="text-xs text-indigo-600 font-medium mb-1">
                                  {item.sellingUnit.name}
                                  {item.priceBasedAmount && " (Price-Based)"}
                                </p>
                              )}
                              {hasCustomPrice ? (
                                <>
                                  <p className="text-xs text-gray-400 line-through">
                                    {formatCurrency(item.product.sellingPrice)}
                                  </p>
                                  <p className="text-xs text-blue-600 font-semibold">
                                    {formatCurrency(itemPrice)}
                                  </p>
                                </>
                              ) : (
                                <p className="text-xs text-gray-500">
                                  {formatCurrency(itemPrice)}
                                </p>
                              )}
                              {/* Display quantity in base unit */}
                              <p className="text-xs text-gray-400 mt-1">
                                Qty: {item.quantity.toLocaleString('id-ID', { 
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 3 
                                })} {getEffectiveUnit(item.product)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setEditingPriceProductId(item.product.id)}
                              className="text-indigo-600 hover:text-indigo-800 p-1"
                              title="Edit Harga"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => removeFromCart(item.product.id)}
                              className="text-red-600 hover:text-red-800 ml-1"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                const decrement = item.sellingUnit && item.sellingUnit.unit === 'kg' ? 0.1 : 1;
                                updateQuantity(item.product.id, Math.max(0.01, item.quantity - decrement));
                              }}
                              className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                            >
                              -
                            </button>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={formatNumberForInput(item.quantity)}
                              onChange={(e) => {
                                const value = e.target.value;
                                const numValue = validateNumberInput(value, { min: 0.01, allowDecimal: true });
                                if (numValue !== null && numValue > 0) {
                                  updateQuantity(item.product.id, numValue);
                                } else if (value === "" || value === "." || value === "0.") {
                                  // Allow typing, will validate on blur
                                }
                              }}
                              onBlur={(e) => {
                                const numValue = validateNumberInput(e.target.value, { min: 0.01, allowDecimal: true });
                                if (numValue === null || numValue <= 0) {
                                  updateQuantity(item.product.id, 0.01);
                                } else {
                                  updateQuantity(item.product.id, numValue);
                                }
                              }}
                              className="w-16 text-center border border-gray-300 rounded px-1 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <span className="text-xs text-gray-500">
                              {getEffectiveUnit(item.product)}
                            </span>
                            <button
                              onClick={() => {
                                const increment = item.sellingUnit && item.sellingUnit.unit === 'kg' ? 0.1 : 1;
                                updateQuantity(item.product.id, item.quantity + increment);
                              }}
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
                    );
                  })}
                </div>

                <div className="border-t pt-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pelanggan (Opsional)
                    </label>
                    <AutocompleteSelect
                      options={customers.map((c) => ({ id: c.id, name: c.name }))}
                      value={getActiveCustomerId()}
                      onValueChange={(customerId) => {
                        updateCustomer(customerId);
                        if (customerId) {
                          fetchProjects(customerId);
                        } else {
                          setProjects([]);
                          updateProject(undefined);
                        }
                      }}
                      placeholder="Pilih pelanggan..."
                      searchPlaceholder="Cari pelanggan..."
                      className="w-full"
                    />
                  </div>

                  {getActiveCustomerId() && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Proyek
                      </label>
                      <AutocompleteSelect
                        options={projects.map((p) => ({ id: p.id, name: p.name }))}
                        value={getActiveProjectId()}
                        onValueChange={updateProject}
                        placeholder="Pilih proyek..."
                        searchPlaceholder="Cari proyek..."
                        className="w-full"
                      />
                    </div>
                  )}

                  {!getActiveCustomerId() && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nama Proyek (Opsional)
                      </label>
                      <input
                        type="text"
                        value={activeProjectName}
                        onChange={(e) => updateProjectName(e.target.value)}
                        placeholder="Masukkan nama proyek"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}

                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>{formatCurrency(getTotal())}</span>
                  </div>

                  <button
                    onClick={handleContinue}
                    disabled={activeCart.length === 0}
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
          cart={activeCart}
          projectName={activeProjectName}
          total={getTotal()}
          onBack={() => setShowCheckoutDetail(false)}
          onSuccess={(transaction) => {
            setLastTransaction(transaction);
            // Remove active session after successful checkout
            setSessions((prev) => {
              const remaining = prev.filter((s) => s.id !== activeSessionId);
              // If no sessions left, create a new one
              if (remaining.length === 0) {
                const newSession: POSSession = {
                  id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  cart: [],
                  projectName: "",
                  createdAt: new Date(),
                  isActive: true,
                };
                setActiveSessionId(newSession.id);
                return [newSession];
              }
              // Switch to first remaining session
              const firstSession = remaining[0];
              setActiveSessionId(firstSession.id);
              return remaining.map((s) => ({
                ...s,
                isActive: s.id === firstSession.id,
              }));
            });
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
            {lastTransaction.items.map((item: any) => {
              // Determine the unit and quantity to display
              // If sellingUnit exists, show quantity in selling unit, otherwise show in base unit
              let displayQuantity = Number(item.quantity);
              let displayUnit = item.product.baseUnit || item.product.unit;
              let displayPrice = Number(item.price);
              
              if (item.sellingUnit) {
                // Convert from base unit to selling unit for display
                displayQuantity = convertFromBaseUnit(displayQuantity, item.sellingUnit);
                displayUnit = item.sellingUnit.unit;
                // Use selling unit price, not the stored price (which might be custom)
                displayPrice = Number(item.sellingUnit.sellingPrice);
              }
              
              // Format quantity with Indonesian locale (comma as decimal separator)
              const formattedQuantity = displayQuantity.toLocaleString('id-ID', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 3,
                useGrouping: false
              });
              
              return (
                <div key={item.id} className="receipt-item">
                  <div className="receipt-item-name">{item.product.name}</div>
                  <div className="receipt-item-detail">
                    {formattedQuantity} {displayUnit} x {formatCurrency(displayPrice)}
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
                {lastTransaction.items.map((item: any) => {
                  // Determine the unit, quantity, and price to display
                  // If sellingUnit exists, show quantity in selling unit, otherwise show in base unit
                  let displayQuantity = Number(item.quantity);
                  let displayUnit = item.product.baseUnit || item.product.unit;
                  let displayPrice = Number(item.price);
                  
                  if (item.sellingUnit) {
                    // Convert from base unit to selling unit for display
                    displayQuantity = convertFromBaseUnit(displayQuantity, item.sellingUnit);
                    displayUnit = item.sellingUnit.unit;
                    // Use selling unit price, not the stored price (which might be custom)
                    displayPrice = Number(item.sellingUnit.sellingPrice);
                  }
                  
                  // Format quantity with Indonesian locale (comma as decimal separator)
                  const formattedQuantity = displayQuantity.toLocaleString('id-ID', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 3,
                    useGrouping: false
                  });
                  
                  return (
                    <div key={item.id} className="flex justify-between">
                      <div>
                        <p className="font-medium">{item.product.name}</p>
                        <p className="text-xs text-gray-500">
                          {formattedQuantity} {displayUnit} x {formatCurrency(displayPrice)}
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

      {/* Price Edit Modal */}
      {editingPriceProductId && (() => {
        const item = activeCart.find((i) => i.product.id === editingPriceProductId);
        if (!item) return null;
        return (
          <PriceEditModal
            isOpen={true}
            productName={item.product.name}
            originalPrice={Number(item.product.sellingPrice)}
            currentPrice={item.customPrice}
            onSave={(newPrice) => {
              updateItemPrice(editingPriceProductId, newPrice);
              setEditingPriceProductId(null);
            }}
            onClose={() => setEditingPriceProductId(null)}
          />
        );
      })()}

      {/* Unit Selector Modal */}
      {unitSelectorProduct && (
        <UnitSelector
          product={unitSelectorProduct}
          open={showUnitSelector}
          onConfirm={(sellingUnit, quantity, priceBasedAmount) => {
            addToCartWithUnit(unitSelectorProduct, sellingUnit, quantity, priceBasedAmount);
          }}
          onCancel={() => {
            setShowUnitSelector(false);
            setUnitSelectorProduct(null);
          }}
        />
      )}
    </div>
  );
}
