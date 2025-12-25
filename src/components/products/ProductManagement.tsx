'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import ProductForm from './ProductForm'
import ProductList from './ProductList'

interface Category {
  id: string
  name: string
}

interface Product {
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

export default function ProductManagement() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchCategories()
    fetchProducts()
  }, [search, categoryFilter])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()
      if (response.ok) {
        setCategories(data.categories)
      }
    } catch (err) {
      console.error('Error fetching categories:', err)
    }
  }

  const fetchProducts = async () => {
    try {
      const url = `/api/products?search=${encodeURIComponent(search)}${categoryFilter && categoryFilter !== 'all' ? `&categoryId=${categoryFilter}` : ''}`
      const response = await fetch(url)
      const data = await response.json()
      if (response.ok) {
        setProducts(data.products)
      }
    } catch (err) {
      console.error('Error fetching products:', err)
    }
  }

  const handleSave = () => {
    setShowForm(false)
    setEditingProduct(null)
    fetchProducts()
    router.refresh()
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus produk ini?')) {
      return
    }

    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        alert(data.error || 'Gagal menghapus produk')
        return
      }

      fetchProducts()
      router.refresh()
    } catch (err) {
      alert('Terjadi kesalahan')
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingProduct(null)
  }

  // Get low stock products
  const lowStockProducts = products.filter(p => p.stock <= p.minimalStock)

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Daftar Produk</h2>
          {lowStockProducts.length > 0 && (
            <p className="text-sm text-red-600 mt-1">
              ⚠️ {lowStockProducts.length} produk dengan stok rendah
            </p>
          )}
        </div>
        <Button
          onClick={() => {
            setShowForm(true)
            setEditingProduct(null)
          }}
        >
          Tambah Produk
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          type="text"
          placeholder="Cari produk..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Semua Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
            </DialogTitle>
          </DialogHeader>
          <ProductForm
            product={editingProduct}
            categories={categories}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </DialogContent>
      </Dialog>

      <ProductList
        products={products}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  )
}

