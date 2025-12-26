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

export interface Product {
  id: string
  name: string
  sku?: string
  stock: number
  minimalStock: number
  unit: string
  purchasePrice: number
  sellingPrice: number
  photo?: string
  placement?: string
  categoryId: string
  category: Category
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
  quantity: number
  price: number
  subtotal: number
}

export interface CartItem {
  product: Product
  quantity: number
  subtotal: number
  customPrice?: number  // Optional custom price, jika tidak ada gunakan product.sellingPrice
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

