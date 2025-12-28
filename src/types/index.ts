export interface User {
  id: string
  username: string
  name: string
  role: string
  createdAt: Date
}

export interface Category {
  id: string
  name: string
  description?: string
  createdAt: Date
}

export interface Brand {
  id: string
  name: string
  photo?: string | null
  createdAt: Date
}

export interface ProductSellingUnit {
  id: string
  productId: string
  name: string
  unit: string
  conversionFactor: number
  sellingPrice: number
  isDefault: boolean
  allowPriceBased: boolean
  isActive: boolean
  displayOrder: number
  createdAt: Date
  updatedAt: Date
}

export interface Product {
  id: string
  name: string
  sku?: string
  stock: number  // Keep for backward compatibility
  minimalStock: number  // Keep for backward compatibility
  unit: string  // Keep for backward compatibility
  productType?: 'SIMPLE' | 'MULTI_UNIT' | 'WEIGHT_BASED'
  baseUnit?: string | null
  baseStock?: number | null
  minimalBaseStock?: number | null
  purchaseUnit?: string | null
  purchasePrice?: number | null  // Optional, harga dari PO
  sellingPrice: number
  photo?: string
  placement?: string
  categoryId: string
  category: Category
  brandId?: string | null
  brand?: Brand | null
  sellingUnits?: ProductSellingUnit[]
  createdAt: Date
  updatedAt: Date
}

export interface Customer {
  id: string
  name: string
  type: string  // "individual" or "institution"
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Project {
  id: string
  name: string
  customerId: string
  customer?: Customer
  isDefault: boolean
  description?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Transaction {
  id: string
  invoiceNo: string
  total: number
  cash: number
  credit: number
  change: number
  paymentStatus: string  // "paid", "unpaid", "partial"
  paymentMethod?: string  // "cash", "transfer", "credit", "mixed"
  customerId?: string
  customer?: Customer
  projectId?: string
  project?: Project
  projectName?: string  // Keep for backward compatibility
  note?: string
  userId: string
  user: User
  items: TransactionItem[]
  createdAt: Date
  updatedAt: Date
}

export interface TransactionItem {
  id: string
  transactionId: string
  productId: string
  product: Product
  sellingUnitId?: string | null
  sellingUnit?: ProductSellingUnit | null
  quantity: number
  price: number
  subtotal: number
  status?: string | null  // "diambil" or "dikirim"
}

export interface CartItem {
  product: Product
  quantity: number
  subtotal: number
  customPrice?: number  // Optional custom price, jika tidak ada gunakan product.sellingPrice
  sellingUnitId?: string
  sellingUnit?: ProductSellingUnit
  priceBasedAmount?: number  // Amount in rupiah for price-based sales
}

export interface POSSession {
  id: string
  customerName?: string
  customerId?: string
  projectId?: string
  cart: CartItem[]
  projectName: string
  createdAt: Date
  isActive: boolean
}

export interface Provider {
  id: string
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface PurchaseOrderItem {
  id: string
  purchaseOrderId: string
  productId: string
  product: Product
  quantity: number
  purchaseUnit?: string | null
  purchasePrice: number
  subtotal: number
  receivedQuantity: number
  createdAt: Date
  updatedAt: Date
}

export interface PurchaseOrder {
  id: string
  poNumber: string
  providerId?: string | null
  provider?: Provider | null
  status: string  // "draft", "approved", "received", "cancelled"
  total: number
  note?: string | null
  userId: string
  user: User
  items: PurchaseOrderItem[]
  receivedAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

